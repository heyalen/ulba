const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const AIRTABLE_API = 'https://api.airtable.com/v0';

export interface Product {
  id: string;
  name: string;
  supplier: string;
  type: string;
  images: string[];
  harmonisedImage?: string;
  vector: number[];
  url?: string;
}

function extractImages(record: any): string[] {
  const lookup = record.fields['Bild_System_Lookup'];
  if (Array.isArray(lookup) && lookup.length > 0) {
    const urls = lookup.flatMap((a: any) =>
      Array.isArray(a) ? a.map((x: any) => x?.url).filter(Boolean)
                       : a?.url ? [a.url] : []
    );
    if (urls.length > 0) return urls;
  }
  const raw = record.fields['Bild_Roh'];
  if (Array.isArray(raw)) return raw.map((a: any) => a.url).filter(Boolean);
  return [];
}

function extractHarmonisedImage(record: any): string | undefined {
  const field = record.fields['Bild_Harmonisiert'];
  if (Array.isArray(field) && field.length > 0) return field[0].url;
  return undefined;
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
    fields['Dim_01_Emotion'] || 0, fields['Dim_02_Ritual'] || 0,
    fields['Dim_03_Aesthetik'] || 0, fields['Dim_04_Zielgruppe'] || 0,
    fields['Dim_05_Prestige'] || 0, fields['Dim_06a_Feminin'] || 0,
    fields['Dim_06b_Maskulin'] || 0, fields['Dim_07_Archetyp'] || 0,
    fields['Dim_08_Sensorik'] || 0, fields['Dim_09_Werte'] || 0,
    fields['Dim_10_Produkt_Fit'] || 0, fields['Dim_11_Kultur'] || 0,
    fields['Dim_12_Psychografik'] || 0, fields['Dim_13_Zeitgeist'] || 0,
    fields['Dim_14_Persona'] || 0,
  ];
}

export async function getProducts(): Promise<Product[]> {
  const filterFormula = encodeURIComponent('{Dim_01_Emotion}>0');
  const url = `${AIRTABLE_API}/${AIRTABLE_BASE}/tblB1kWay9TvX3rGv?filterByFormula=${filterFormula}&pageSize=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
  const data = await res.json();
  return data.records
    .map((rec: any) => ({
      id: rec.id,
      name: rec.fields['Page Titel'] || 'Unbekannt',
      supplier: rec.fields['Unternehmen'] || '',
      type: Array.isArray(rec.fields['S_P0_System_Typ'])
        ? rec.fields['S_P0_System_Typ'][0]
        : rec.fields['S_P0_System_Typ'] || '',
      images: extractImages(rec),
      harmonisedImage: extractHarmonisedImage(rec),
      vector: extractVector(rec.fields),
      url: rec.fields['Link'] || '',
    }))
    .filter((p: Product) => p.vector.some(v => v > 0));
}
