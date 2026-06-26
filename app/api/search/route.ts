import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Vercel: Timeout auf 60s erhöhen (benötigt Vercel Pro/Hobby mit aktiviertem Flag)
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const AIRTABLE_API   = 'https://api.airtable.com/v0';

// ── Attribut_Bibliothek Cache (warm-instance reuse, 5 min TTL) ──────────
let _attrCache: Map<string, string> | null = null;
let _attrCacheTs = 0;

async function getAttrMap(): Promise<Map<string, string>> {
  if (_attrCache && Date.now() - _attrCacheTs < 300_000) return _attrCache;

  const map = new Map<string, string>();
  let offset = '';
  do {
    const url = `${AIRTABLE_API}/${AIRTABLE_BASE}/tblsWJ0q2sQ7sXwvk`
      + `?fields[]=fldkhYMbxvAtglzaI&fields[]=fldaRa8uT30LC4h5o`
      + `&returnFieldsByFieldId=true&pageSize=100`
      + (offset ? `&offset=${offset}` : '');
    const res  = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
    const data = await res.json();
    for (const rec of data.records ?? []) {
      const name = rec.fields['fldkhYMbxvAtglzaI'] ?? '';
      const kat  = rec.fields['fldaRa8uT30LC4h5o'] ?? '';
      if (name) map.set(rec.id, kat ? `${name} [${kat}]` : name);
    }
    offset = data.offset ?? '';
  } while (offset);

  _attrCache   = map;
  _attrCacheTs = Date.now();
  return map;
}

// ── Haiku: nur Hard Filters ──────────────────────────────────────────────
const HAIKU_PROMPT = `Beauty-Packaging Suchexperte. Extrahiere Hard Filters aus der Anfrage.
Antworte NUR mit JSON, kein anderer Text:
{"type":null,"material":null,"volume_min":null,"volume_max":null,"closure":null,"supplier":null}

type: "Flasche"|"Tiegel"|"Tube"|"Airless"|"Pump"|"Spray"|"Stick"|"Dose"|null
material: "Glas"|"PET"|"R-PET"|"HDPE"|"PP"|"Aluminium"|"Keramik"|null
volume_min/max: Zahl in ml oder null
closure: "Schraubverschluss"|"Pump"|"Airless"|"Pipette"|"Flip-top"|"Spray"|null
supplier: Lieferantenname oder null
Nur explizit genannte Infos — keine Interpretation.`;

// ── Sonnet: semantisches Ranking ─────────────────────────────────────────
const RANKING_PROMPT = `Du bist ulba.ai's Beauty-Packaging-Experte. Ranke ALLE Produkte nach Fit zur Suchanfrage.

Antworte NUR mit JSON-Array, kein Markdown, kein anderer Text:
[{"id":"recXXX","score":85,"reasoning":"Ein kurzer Satz warum","rendering_brief":"FLUX Prompt","constraints":["Was nicht geht"]}]

- score: 0-100 (semantischer + emotionaler Fit)
- reasoning: 1 praegnanter Satz
- rendering_brief: konkreter FLUX-Prompt mit Farben, Finish, Stil, Stimmung — constraint-aware
  Beispiel: "Gunmetal brushed aluminum bottle, matte black pump, stark minimalist, no label zone"
- constraints: Material/Technik-Einschraenkungen (z.B. "Aluminium nicht einfaerbbar"). [] wenn keine.`;

// ── Airtable Formula Builder ─────────────────────────────────────────────
function buildFormula(f: Record<string, any>): string {
  const cond = ['{Published}=TRUE()'];
  if (f.type)               cond.push(`{Type}="${f.type}"`);
  if (f.material)           cond.push(`FIND("${f.material}",ARRAYJOIN({Material}))`);
  if (f.volume_min != null) cond.push(`{Volume_ml}>=${f.volume_min}`);
  if (f.volume_max != null) cond.push(`{Volume_ml}<=${f.volume_max}`);
  if (f.closure)            cond.push(`{Closure}="${f.closure}"`);
  if (f.supplier)           cond.push(`FIND("${f.supplier}",{Unternehmen})`);
  return cond.length > 1 ? `AND(${cond.join(',')})` : cond[0];
}

// ── Product -> Text fuer Claude ──────────────────────────────────────────
function buildProductText(rec: any, attrMap: Map<string, string>): string {
  const f = rec.fields;

  const attrs = ((f['Attribute'] as string[]) ?? [])
    .map((id: string) => attrMap.get(id))
    .filter(Boolean)
    .join(', ');

  const sf = [
    f['SF_Einfaerbbar'] && 'Einfaerbbar',
    f['SF_Siebdruck']   && 'Siebdruck',
    f['SF_PCR']         && 'PCR-Material',
    f['SF_Refillable']  && 'Refillable',
    f['SF_Airless']     && 'Airless',
    f['SF_Mattierbar']  && 'Mattierbar',
    f['SF_HotFoil']     && 'Hot-Foil',
    f['SF_Embossing']   && 'Embossing',
  ].filter(Boolean).join(', ');

  const colors   = (f['SF_Available_Colors']   as string[] | undefined)?.join(', ');
  const finishes = (f['SF_Available_Finishes'] as string[] | undefined)?.join(', ');

  return [
    `[${rec.id}] ${f['Page Titel'] ?? '?'} | ${f['Unternehmen'] ?? '?'}`,
    `Type:${f['Type'] ?? '?'} | Material:${(f['Material'] ?? []).join('+')} | ${f['Volume_ml'] ?? '?'}ml | Closure:${f['Closure'] ?? '?'} | Form:${(f['Form'] ?? []).join('+')}`,
    attrs    && `Attribute: ${attrs}`,
    sf       && `Moeglich: ${sf}`,
    colors   && `Farben: ${colors}`,
    finishes && `Finishes: ${finishes}`,
    f['Kurzbeschreibung']   && `Beschreibung: ${f['Kurzbeschreibung']}`,
    f['Decoration_Profile'] && `Dekoration: ${f['Decoration_Profile']}`,
  ].filter(Boolean).join('\n');
}

// ── Bilder aus Record ────────────────────────────────────────────────────
function getImages(f: any): string[] {
  const h = f['Bild_Harmonisiert'];
  if (Array.isArray(h) && h.length) return h.map((a: any) => a.url);
  const s = f['Bild_System'];
  if (Array.isArray(s) && s.length) return s.map((a: any) => a.url);
  return [];
}

// ── POST Handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { query, active_filters } = await req.json();
    if (!query?.trim()) return NextResponse.json({ error: 'No query' }, { status: 400 });

    // 1. Haiku: Hard Filters
    const haikuRes = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: HAIKU_PROMPT,
      messages: [{ role: 'user', content: query }],
    });
    const haikuText = haikuRes.content[0].type === 'text' ? haikuRes.content[0].text.trim() : '{}';
    let filters = JSON.parse(haikuText.replace(/```json|```/g, ''));
    if (active_filters) filters = { ...filters, ...active_filters };

    // 2. Attr Cache + Airtable parallel
    const [attrMap, atRes] = await Promise.all([
      getAttrMap(),
      fetch(
        `${AIRTABLE_API}/${AIRTABLE_BASE}/tblB1kWay9TvX3rGv`
          + `?filterByFormula=${encodeURIComponent(buildFormula(filters))}&pageSize=100`,
        { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }, next: { revalidate: 60 } }
      ),
    ]);
    if (!atRes.ok) throw new Error(`Airtable ${atRes.status}`);
    const { records } = await atRes.json();

    if (!records?.length) {
      return NextResponse.json({ query, hard_filters: filters, detected_filters: [], total: 0, results: [] });
    }

    // 3. Sonnet: semantisches Ranking
    const productsCtx = records
      .map((r: any) => buildProductText(r, attrMap))
      .join('\n\n---\n\n');

    const rankRes = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: RANKING_PROMPT,
      messages: [{ role: 'user', content: `Suchanfrage: "${query}"\n\nProdukte:\n${productsCtx}` }],
    });
    const rankText = rankRes.content[0].type === 'text' ? rankRes.content[0].text.trim() : '[]';
    // Extrahiere JSON auch wenn Sonnet Markdown-Wrapper schickt
    const jsonMatch = rankText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error(`Sonnet kein JSON: ${rankText.slice(0, 200)}`);
    const rankings: Array<{
      id: string;
      score: number;
      reasoning: string;
      rendering_brief: string;
      constraints: string[];
    }> = JSON.parse(jsonMatch[0]);

    // 4. Merge + Response
    const recById = new Map(records.map((r: any) => [r.id, r.fields]));
    const results = rankings
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ id, score, reasoning, rendering_brief, constraints }) => {
        const f = recById.get(id) as any;
        if (!f) return null;
        const harm = f['Bild_Harmonisiert'];
        return {
          id,
          name:            f['Page Titel']  ?? 'Unbekannt',
          supplier:        f['Unternehmen'] ?? '',
          type:            f['Type']        ?? '',
          material:        f['Material']    ?? [],
          volume:          f['Volume_ml']   ?? null,
          closure:         f['Closure']     ?? '',
          form:            f['Form']        ?? [],
          url:             f['Link']        ?? '',
          bildTyp:         f['Bild_Typ']    ?? '',
          images:          getImages(f),
          harmonisedImage: Array.isArray(harm) && harm.length ? harm[0].url : undefined,
          score,
          reasoning,
          rendering_brief,
          constraints,
        };
      })
      .filter(Boolean);

    const detected_filters = Object.entries(filters)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => ({
        key: k, value: v,
        label: k === 'volume_min' ? `>=${v}ml` : k === 'volume_max' ? `<=${v}ml` : String(v),
      }));

    return NextResponse.json({ query, hard_filters: filters, detected_filters, total: results.length, results });

  } catch (e: any) {
    console.error('[search/route]', e);
    return NextResponse.json({ error: e.message ?? 'Unknown error', stack: e.stack?.split('\n')[1] }, { status: 500 });
  }
}
