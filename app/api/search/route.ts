import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const AIRTABLE_API   = 'https://api.airtable.com/v0';

// Attribut_Bibliothek Cache
let _attrCache: Map<string, string> | null = null;
let _attrCacheTs = 0;

async function getAttrMap(): Promise<Map<string, string>> {
  if (_attrCache && Date.now() - _attrCacheTs < 300_000) return _attrCache;
  const map = new Map<string, string>();
  let offset = '';
  do {
    const url = `${AIRTABLE_API}/${AIRTABLE_BASE}/tblsWJ0q2sQ7sXwvk`
      + `?fields[]=fldkhYMbxvAtglzaI&returnFieldsByFieldId=true&pageSize=100`
      + (offset ? `&offset=${offset}` : '');
    const res  = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
    const data = await res.json();
    for (const rec of data.records ?? []) {
      const name = rec.fields['fldkhYMbxvAtglzaI'] ?? '';
      if (name) map.set(rec.id, name);
    }
    offset = data.offset ?? '';
  } while (offset);
  _attrCache = map; _attrCacheTs = Date.now();
  return map;
}

const HAIKU_PROMPT = `Beauty-Packaging Suchexperte. Extrahiere Hard Filters.
Antworte NUR mit JSON:
{"type":null,"material":null,"volume_min":null,"volume_max":null,"closure":null,"supplier":null}
type: "Flasche"|"Tiegel"|"Tube"|"Airless"|"Pump"|"Spray"|"Stick"|"Dose"|null
material: "Glas"|"PET"|"R-PET"|"HDPE"|"PP"|"Aluminium"|"Keramik"|null
volume_min/max: Zahl in ml oder null
closure: "Schraubverschluss"|"Pump"|"Airless"|"Pipette"|"Flip-top"|"Spray"|null
supplier: Name oder null. Nur explizit genannte Infos.`;

const RANKING_PROMPT = `Packaging-Experte. Ranke alle Produkte nach Query-Fit.
NUR JSON-Array ausgeben, kein Markdown:
[{"id":"recXXX","score":85,"reasoning":"1 Satz","rendering_brief":"FLUX prompt","constraints":[]}]
score:0-100, constraints:[] wenn keine.`;

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

// Kompaktes einzeiliges Format pro Produkt
function buildProductText(rec: any, attrMap: Map<string, string>): string {
  const f = rec.fields;
  const attrs = ((f['Attribute'] as string[]) ?? [])
    .slice(0, 8)
    .map((id: string) => attrMap.get(id))
    .filter(Boolean).join(',');
  const sf = [
    f['SF_Einfaerbbar'] && 'einfaerbbar',
    f['SF_Siebdruck']   && 'siebdruck',
    f['SF_PCR']         && 'PCR',
    f['SF_Refillable']  && 'refillable',
    f['SF_Mattierbar']  && 'mattierbar',
    f['SF_HotFoil']     && 'hotfoil',
    f['SF_Embossing']   && 'embossing',
  ].filter(Boolean).join(',');
  const mat  = (f['Material'] ?? []).join('+');
  const form = (f['Form']     ?? []).join('+');
  return [
    `[${rec.id}] ${f['Page Titel'] ?? '?'} | ${f['Unternehmen'] ?? '?'}`,
    `${f['Type'] ?? '?'} ${mat} ${f['Volume_ml'] ?? '?'}ml ${f['Closure'] ?? '?'} ${form}`,
    attrs && `attrs:${attrs}`,
    sf    && `sf:${sf}`,
  ].filter(Boolean).join(' | ');
}

function getImages(f: any): string[] {
  const h = f['Bild_Harmonisiert'];
  if (Array.isArray(h) && h.length) return h.map((a: any) => a.url);
  const s = f['Bild_System'];
  if (Array.isArray(s) && s.length) return s.map((a: any) => a.url);
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const { query, active_filters } = await req.json();
    if (!query?.trim()) return NextResponse.json({ error: 'No query' }, { status: 400 });

    console.log('[search] Step 1: Haiku');
    const haikuRes = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: HAIKU_PROMPT,
      messages: [{ role: 'user', content: query }],
    });
    const haikuText = haikuRes.content[0].type === 'text' ? haikuRes.content[0].text.trim() : '{}';
    let filters = JSON.parse(haikuText.replace(/```json|```/g, ''));
    if (active_filters) filters = { ...filters, ...active_filters };
    console.log('[search] filters:', JSON.stringify(filters));

    console.log('[search] Step 2: Airtable + AttrCache parallel');
    const [attrMap, atRes] = await Promise.all([
      getAttrMap(),
      fetch(
        `${AIRTABLE_API}/${AIRTABLE_BASE}/tblB1kWay9TvX3rGv`
          + `?filterByFormula=${encodeURIComponent(buildFormula(filters))}&pageSize=100`,
        { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
      ),
    ]);
    if (!atRes.ok) throw new Error(`Airtable ${atRes.status}: ${await atRes.text()}`);
    const { records } = await atRes.json();
    console.log('[search] records:', records?.length ?? 0);

    if (!records?.length) {
      return NextResponse.json({ query, hard_filters: filters, detected_filters: [], total: 0, results: [] });
    }

    console.log('[search] Step 3: Sonnet ranking');
    const productsCtx = records.map((r: any) => buildProductText(r, attrMap)).join('\n');
    console.log('[search] context length:', productsCtx.length, 'chars');

    const rankRes = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: RANKING_PROMPT,
      messages: [{ role: 'user', content: `Query:"${query}"\n\n${productsCtx}` }],
    });
    const rankText = rankRes.content[0].type === 'text' ? rankRes.content[0].text.trim() : '[]';
    console.log('[search] Sonnet stop_reason:', rankRes.stop_reason, 'output:', rankText.length, 'chars');

    const jsonMatch = rankText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error(`Sonnet kein JSON: ${rankText.slice(0, 300)}`);
    const rankings: Array<{ id: string; score: number; reasoning: string; rendering_brief: string; constraints: string[] }>
      = JSON.parse(jsonMatch[0]);

    const recById = new Map(records.map((r: any) => [r.id, r.fields]));
    const results = rankings
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ id, score, reasoning, rendering_brief, constraints }) => {
        const f = recById.get(id) as any;
        if (!f) return null;
        const harm = f['Bild_Harmonisiert'];
        return {
          id, score, reasoning, rendering_brief, constraints,
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
        };
      })
      .filter(Boolean);

    const detected_filters = Object.entries(filters)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => ({ key: k, value: v, label: k === 'volume_min' ? `>=${v}ml` : k === 'volume_max' ? `<=${v}ml` : String(v) }));

    console.log('[search] done, results:', results.length);
    return NextResponse.json({ query, hard_filters: filters, detected_filters, total: results.length, results });

  } catch (e: any) {
    console.error('[search] ERROR:', e.message, e.stack?.split('\n')[1]);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
