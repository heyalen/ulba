import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const AIRTABLE_API = 'https://api.airtable.com/v0';

const SYSTEM_PROMPT = `Du bist ein Beauty-Packaging-Experte bei ulba.ai.
Eine Brand beschreibt ihr Packaging in Freitext. Extrahiere:

1. HARD_FILTERS (nur wenn explizit erwähnt, sonst null):
- type: "Flasche"|"Tiegel"|"Tube"|"Airless"|"Pump"|"Spray"|"Stick"|"Dose" (oder null)
- material: "Glas"|"PET"|"PP"|"Alu"|"Keramik" (oder null)
- volume_min: Zahl in ml (oder null)
- volume_max: Zahl in ml (oder null)
- closure: "Schraubverschluss"|"Pump"|"Airless"|"Pipette"|"Flip-top"|"Spray" (oder null)
- supplier: Lieferantenname wenn erwähnt (oder null)

2. EMOTIONAL_VECTOR: Genau 15 Integers (1-5) für:
Emotion, Ritual, Ästhetik, Zielgruppe, Prestige, Feminin, Maskulin,
Archetyp, Sensorik, Werte, Produkt-Fit, Kultur, Psychografik, Zeitgeist, Persona

Antworte NUR mit diesem JSON, kein anderer Text:
{"hard_filters":{"type":null,"material":null,"volume_min":null,"volume_max":null,"closure":null,"supplier":null},"vector":[3,2,4,3,5,4,1,3,3,2,4,2,4,5,4]}`;

function cosine(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

function buildAirtableFormula(filters: Record<string, any>): string {
  const conditions: string[] = ['{Dim_01_Emotion}>0'];
  if (filters.type) conditions.push(`FIND("${filters.type}", {Type})`);
  if (filters.material) conditions.push(`FIND("${filters.material}", {Material})`);
  if (filters.volume_min != null) conditions.push(`{Volume_ml}>=${filters.volume_min}`);
  if (filters.volume_max != null) conditions.push(`{Volume_ml}<=${filters.volume_max}`);
  if (filters.closure) conditions.push(`FIND("${filters.closure}", {Closure})`);
  if (filters.supplier) conditions.push(`FIND("${filters.supplier}", {Unternehmen})`);
  return conditions.length > 1 ? `AND(${conditions.join(',')})` : conditions[0];
}

function extractVector(fields: any): number[] {
  const cached = fields['Cached_Vector'];
  if (cached) {
    try {
      const obj = typeof cached === 'string' ? JSON.parse(cached) : cached;
      const keys = ['emotion','ritual','aesthetik','zielgruppe','prestige','feminin','maskulin','archetyp','sensorik','werte','produkt_fit','kultur','psychografik','zeitgeist','persona'];
      const vec = keys.map(k => obj[k] || 0);
      if (vec.some(v => v > 0)) return vec;
    } catch {}
  }
  return [
    fields['Dim_01_Emotion']||0, fields['Dim_02_Ritual']||0,
    fields['Dim_03_Aesthetik']||0, fields['Dim_04_Zielgruppe']||0,
    fields['Dim_05_Prestige']||0, fields['Dim_06a_Feminin']||0,
    fields['Dim_06b_Maskulin']||0, fields['Dim_07_Archetyp']||0,
    fields['Dim_08_Sensorik']||0, fields['Dim_09_Werte']||0,
    fields['Dim_10_Produkt_Fit']||0, fields['Dim_11_Kultur']||0,
    fields['Dim_12_Psychografik']||0, fields['Dim_13_Zeitgeist']||0,
    fields['Dim_14_Persona']||0,
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, active_filters } = body;
    // active_filters: wenn gesetzt, überschreibt Claude's Erkennung
    // (wird beim Entfernen eines Chips gesetzt)

    if (!query?.trim()) return NextResponse.json({ error: 'No query' }, { status: 400 });

    // 1. Claude Haiku: Hard Filters + Emotional Vector
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: query }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const parsed = JSON.parse(text.replace(/```json|```/g, ''));
    const { vector } = parsed;
    let hard_filters = parsed.hard_filters;

    // 2. Wenn active_filters vom Frontend kommen → überschreibe Claude's Erkennung
    // active_filters ist ein Objekt mit nur den noch aktiven Filtern
    if (active_filters) {
      hard_filters = {
        type: active_filters.type ?? null,
        material: active_filters.material ?? null,
        volume_min: active_filters.volume_min ?? null,
        volume_max: active_filters.volume_max ?? null,
        closure: active_filters.closure ?? null,
        supplier: active_filters.supplier ?? null,
      };
    }

    if (!Array.isArray(vector) || vector.length !== 15) {
      return NextResponse.json({ error: 'Invalid vector' }, { status: 500 });
    }

    // 3. Airtable Query mit Hard Filters
    const formula = buildAirtableFormula(hard_filters);
    const url = `${AIRTABLE_API}/${AIRTABLE_BASE}/tblB1kWay9TvX3rGv?filterByFormula=${encodeURIComponent(formula)}&pageSize=100`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
    const data = await res.json();

    // 4. Cosine Similarity
    const scored = data.records
      .map((rec: any) => {
        const recVector = extractVector(rec.fields);
        return {
          id: rec.id,
          name: rec.fields['Page Titel'] || 'Unbekannt',
          supplier: rec.fields['Unternehmen'] || '',
          type: rec.fields['Type'] || '',
          material: rec.fields['Material'] || '',
          volume: rec.fields['Volume_ml'] || null,
          closure: rec.fields['Closure'] || '',
          bildTyp: rec.fields['Bild_Typ'] || '',
          images: (() => {
            const h = rec.fields['Bild_Harmonisiert'];
            if (Array.isArray(h) && h.length > 0) return h.map((a: any) => a.url).filter(Boolean);
            const s = rec.fields['Bild_System'];
            if (Array.isArray(s) && s.length > 0) return s.map((a: any) => a.url).filter(Boolean);
            const b = rec.fields['Bild_Roh_Base'];
            if (Array.isArray(b) && b.length > 0) return b.map((a: any) => a.url).filter(Boolean);
            return [];
          })(),
          harmonisedImage: (() => {
            const h = rec.fields['Bild_Harmonisiert'];
            return Array.isArray(h) && h.length > 0 ? h[0].url : undefined;
          })(),
          capImages: (() => {
            const c = rec.fields['Bild_Roh_Cap'];
            return Array.isArray(c) ? c.map((a: any) => a.url).filter(Boolean) : [];
          })(),
          vector: recVector,
          url: rec.fields['Link'] || '',
          score: cosine(vector, recVector),
        };
      })
      .filter((r: any) => r.vector.some((v: number) => v > 0))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 12);

    // 5. Detected filters für Chips — nur aktive zurückgeben
    const detected_filters = Object.entries(hard_filters)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => ({
        key: k,
        value: v, // Rohwert für active_filters beim Entfernen
        label: k === 'volume_min' ? `≥${v}ml` : k === 'volume_max' ? `≤${v}ml` : String(v),
      }));

    return NextResponse.json({ query, vector, hard_filters, detected_filters, total: scored.length, results: scored });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
