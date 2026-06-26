import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const AIRTABLE_API   = 'https://api.airtable.com/v0';

// ── Attribut_Bibliothek Cache ────────────────────────────────────────────
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

// ── Produkt_Regeln Cache ─────────────────────────────────────────────────
interface ProduktRegel {
  kategorie: string;
  keywords: string[];
  bevorzugt_material: string;
  nicht_material: string;
  volume_min: number | null;
  volume_max: number | null;
  bevorzugt_closure: string;
  nicht_closure: string;
  bevorzugt_type: string;
}

let _regelCache: ProduktRegel[] | null = null;
let _regelCacheTs = 0;

async function getRegelCache(): Promise<ProduktRegel[]> {
  if (_regelCache && Date.now() - _regelCacheTs < 600_000) return _regelCache;
  const url = `${AIRTABLE_API}/${AIRTABLE_BASE}/tblrL5tEpvvUh6OEj?pageSize=100`;
  const res  = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
  const data = await res.json();
  _regelCache = (data.records ?? []).map((r: any) => ({
    kategorie:          r.fields['Kategorie']          ?? '',
    keywords:           (r.fields['Keywords'] ?? '').split(',').map((k: string) => k.trim().toLowerCase()).filter(Boolean),
    bevorzugt_material: r.fields['Bevorzugt_Material'] ?? '',
    nicht_material:     r.fields['Nicht_Material']     ?? '',
    volume_min:         r.fields['Volume_Min']         ?? null,
    volume_max:         r.fields['Volume_Max']         ?? null,
    bevorzugt_closure:  r.fields['Bevorzugt_Closure']  ?? '',
    nicht_closure:      r.fields['Nicht_Closure']      ?? '',
    bevorzugt_type:     r.fields['Bevorzugt_Type']     ?? '',
  }));
  _regelCacheTs = Date.now();
  return _regelCache!;
}

function matchRegel(query: string, regeln: ProduktRegel[]): ProduktRegel | null {
  const q = query.toLowerCase();
  for (const regel of regeln) {
    if (regel.keywords.some(kw => q.includes(kw))) return regel;
  }
  return null;
}

function buildRegelContext(regel: ProduktRegel): string {
  const lines = [`PRODUKTKATEGORIE ERKANNT: ${regel.kategorie}`];
  if (regel.bevorzugt_material) lines.push(`Bevorzugtes Material: ${regel.bevorzugt_material}`);
  if (regel.nicht_material)     lines.push(`NICHT geeignet (Material): ${regel.nicht_material} → max 35 Punkte`);
  if (regel.volume_min || regel.volume_max) {
    const range = [regel.volume_min && `min ${regel.volume_min}ml`, regel.volume_max && `max ${regel.volume_max}ml`].filter(Boolean).join(', ');
    lines.push(`Typisches Volumen: ${range}`);
  }
  if (regel.bevorzugt_closure) lines.push(`Bevorzugter Verschluss: ${regel.bevorzugt_closure}`);
  if (regel.nicht_closure)     lines.push(`NICHT geeignet (Verschluss): ${regel.nicht_closure} → -15 Punkte`);
  if (regel.bevorzugt_type)    lines.push(`Bevorzugter Typ: ${regel.bevorzugt_type}`);
  return lines.join('\n');
}

// ── Haiku: Hard Filters ──────────────────────────────────────────────────
const HAIKU_PROMPT = `Beauty-Packaging Suchexperte. Extrahiere Hard Filters.
Antworte NUR mit JSON:
{"type":null,"material":null,"volume_min":null,"volume_max":null,"closure":null,"supplier":null}
type: "Flasche"|"Tiegel"|"Tube"|"Airless"|"Pump"|"Spray"|"Stick"|"Dose"|null
material: "Glas"|"PET"|"R-PET"|"HDPE"|"PP"|"Aluminium"|"Keramik"|null
volume_min/max: Zahl in ml oder null. closure: "Schraubverschluss"|"Pump"|"Airless"|"Pipette"|"Flip-top"|"Spray"|null
supplier: Name oder null. Nur explizit genannte Infos.`;

const BASE_RANKING_PROMPT = `Beauty-Packaging-Experte. Ranke ALLE Produkte nach Query-Fit.
NUR JSON-Array, kein Markdown, NUR id und score:
[{"id":"recXXX","score":85}]
score:0-100. Kein anderer Text, keine anderen Felder.`;

// ── Airtable Formula ─────────────────────────────────────────────────────
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

// ── Produkt → kompakter Text ─────────────────────────────────────────────
function buildProductText(rec: any, attrMap: Map<string, string>): string {
  const f = rec.fields;
  const attrs = ((f['Attribute'] as string[]) ?? [])
    .slice(0, 8).map((id: string) => attrMap.get(id)).filter(Boolean).join(',');
  const sf = [
    f['SF_Einfaerbbar'] && 'einfaerbbar', f['SF_Siebdruck'] && 'siebdruck',
    f['SF_PCR'] && 'PCR', f['SF_Refillable'] && 'refillable',
    f['SF_Mattierbar'] && 'mattierbar', f['SF_HotFoil'] && 'hotfoil',
    f['SF_Embossing'] && 'embossing',
  ].filter(Boolean).join(',');
  return [
    `[${rec.id}] ${f['Page Titel'] ?? '?'} | ${f['Unternehmen'] ?? '?'}`,
    `${f['Type'] ?? '?'} ${(f['Material'] ?? []).join('+')} ${f['Volume_ml'] ?? '?'}ml ${f['Closure'] ?? '?'} ${(f['Form'] ?? []).join('+')}`,
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

// ── POST ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { query, active_filters } = await req.json();
    if (!query?.trim()) return NextResponse.json({ error: 'No query' }, { status: 400 });

    // 1. Haiku: Hard Filters
    console.log('[search] Step 1: Haiku');
    const haikuRes = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 150,
      system: HAIKU_PROMPT,
      messages: [{ role: 'user', content: query }],
    });
    const haikuText = haikuRes.content[0].type === 'text' ? haikuRes.content[0].text.trim() : '{}';
    const jsonObj = haikuText.match(/{[\s\S]*}/);
    let filters = JSON.parse(jsonObj?.[0] ?? '{}');
    if (active_filters) filters = { ...filters, ...active_filters };

    // 2. Parallel: AttrMap + RegelCache + Airtable
    console.log('[search] Step 2: Parallel fetches');
    const [attrMap, regeln, atRes] = await Promise.all([
      getAttrMap(),
      getRegelCache(),
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

    // Skip Ranking fuer kurze/technische Queries (z.B. "PET", "Tiegel 50ml")
    const wordCount = query.trim().split(/\s+/).length;
    if (wordCount <= 2) {
      console.log('[search] skip ranking (filter-only)');
      const detected_filters = Object.entries(filters)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => ({ key: k, value: v, label: k === 'volume_min' ? `>=${v}ml` : k === 'volume_max' ? `<=${v}ml` : String(v) }));
      const results = records.slice(0, 12).map((r: any) => {
        const f = r.fields; const harm = f['Bild_Harmonisiert'];
        return {
          id: r.id, score: 100, reasoning: '', rendering_brief: '', constraints: [],
          name: f['Page Titel'] ?? 'Unbekannt', supplier: f['Unternehmen'] ?? '',
          type: f['Type'] ?? '', material: f['Material'] ?? [], volume: f['Volume_ml'] ?? null,
          closure: f['Closure'] ?? '', form: f['Form'] ?? [], url: f['Link'] ?? '',
          bildTyp: f['Bild_Typ'] ?? '', images: getImages(f), matched_kategorie: null,
          harmonisedImage: Array.isArray(harm) && harm.length ? harm[0].url : undefined,
          capImages: (() => { const c = f['Bild_Roh_Cap']; return Array.isArray(c) ? c.map((a: any) => a.url).filter(Boolean) : []; })(),
        };
      });
      return NextResponse.json({ query, hard_filters: filters, detected_filters, total: results.length, results, matched_kategorie: null });
    }

    // 3. Regel matchen + Ranking Prompt zusammenbauen
    const matchedRegel = matchRegel(query, regeln);
    const rankingPrompt = matchedRegel
      ? `${BASE_RANKING_PROMPT}\n\n${buildRegelContext(matchedRegel)}`
      : BASE_RANKING_PROMPT;
    if (matchedRegel) console.log('[search] Regel matched:', matchedRegel.kategorie);

    // 4. Haiku Ranking
    console.log('[search] Step 3: Ranking');
    const productsCtx = records.map((r: any) => buildProductText(r, attrMap)).join('\n');
    const rankRes = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 4000,
      system: rankingPrompt,
      messages: [{ role: 'user', content: `Query:"${query}"\n\n${productsCtx}` }],
    });
    const rankText = rankRes.content[0].type === 'text' ? rankRes.content[0].text.trim() : '[]';
    console.log('[search] stop_reason:', rankRes.stop_reason, 'len:', rankText.length);

    const jsonMatch = rankText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error(`Kein JSON: ${rankText.slice(0, 200)}`);
    const rankings: Array<{ id: string; score: number }>
      = JSON.parse(jsonMatch[0]);

    // 5. Merge
    const recById = new Map(records.map((r: any) => [r.id, r.fields]));
    const results = rankings
      .sort((a, b) => b.score - a.score).slice(0, 12)
      .map(({ id, score }) => {
        const f = recById.get(id) as any;
        if (!f) return null;
        const harm = f['Bild_Harmonisiert'];
        return {
          id, score, reasoning: '', rendering_brief: '', constraints: [],
          name: f['Page Titel'] ?? 'Unbekannt', supplier: f['Unternehmen'] ?? '',
          type: f['Type'] ?? '', material: f['Material'] ?? [],
          volume: f['Volume_ml'] ?? null, closure: f['Closure'] ?? '',
          form: f['Form'] ?? [], url: f['Link'] ?? '', bildTyp: f['Bild_Typ'] ?? '',
          images: getImages(f),
          harmonisedImage: Array.isArray(harm) && harm.length ? harm[0].url : undefined,
          capImages: (() => { const c = f['Bild_Roh_Cap']; return Array.isArray(c) ? c.map((a: any) => a.url).filter(Boolean) : []; })(),
          matched_kategorie: matchedRegel?.kategorie ?? null,
        };
      }).filter(Boolean);

    const detected_filters = Object.entries(filters)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => ({ key: k, value: v, label: k === 'volume_min' ? `>=${v}ml` : k === 'volume_max' ? `<=${v}ml` : String(v) }));

    console.log('[search] done, results:', results.length);
    return NextResponse.json({ query, hard_filters: filters, detected_filters, total: results.length, results, matched_kategorie: matchedRegel?.kategorie ?? null });

  } catch (e: any) {
    console.error('[search] ERROR:', e.message, e.stack?.split('\n')[1]);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
