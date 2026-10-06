/* ══════════════════════════════════════════════════════════════════════
   ulba · lib/teile.ts
   Server-seitiger Airtable-Zugriff für die indexierbaren Teil-Seiten.
   Läuft NUR auf dem Server (Server Components / sitemap) — AIRTABLE_PAT
   muss als Env-Var im Frontend-Vercel-Projekt gesetzt sein.
   ══════════════════════════════════════════════════════════════════════ */

const AIRTABLE_BASE = 'app0QFyInfhvk66MC';
const SYSTEM_TABLE = 'tblB1kWay9TvX3rGv';
const LIEFERANTEN_TABLE = 'tblsy3CHZbAo6GraB'; // Lieferanten (ID, stabil gegen Umbenennung)

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://ulba.ai';

export interface Teil {
  id: string;
  slug: string;
  name: string;
  type: string;
  material: string[];
  form: string[];
  closure: string;
  beschreibung: string;
  bild: string | null;
  sizes: string[];
  materialsAvailable: string[];
  supplier: string;
}

/* ── Hilfen ──────────────────────────────────────────────────────────── */

function sel(v: any): string {
  return typeof v === 'string' ? v : v?.name || '';
}
function multi(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === 'string' ? x : x?.name || '')).filter(Boolean);
}
function img(v: any): string | null {
  if (Array.isArray(v) && v[0]?.url) return v[0].url;
  return null;
}

/* Slug: lesbarer Name + Record-ID-Suffix.
   Das Suffix macht den Slug eindeutig und stabil, auch wenn der Name
   später umbenannt wird — die Seite bleibt über die ID auffindbar. */
export function teilSlug(name: string, recId: string): string {
  const base = (name || 'teil')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // é → e, à → a
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base}-${recId.slice(3, 9).toLowerCase()}`;
}
/** Extrahiert das ID-Suffix aus einem Slug (letzte 6 Zeichen nach dem letzten "-"). */
function slugSuffix(slug: string): string {
  return slug.split('-').pop() || '';
}

/* ── Airtable ────────────────────────────────────────────────────────── */

async function airtableAll(table: string): Promise<any[]> {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) throw new Error('AIRTABLE_PAT fehlt im Frontend-Projekt (Vercel → Settings → Environment Variables)');
  const records: any[] = [];
  let offset = '';
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    if (offset) params.set('offset', offset);
    const r = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(table)}?${params}`,
      { headers: { Authorization: `Bearer ${pat}` }, next: { revalidate: 3600 } }
    );
    if (!r.ok) throw new Error(`Airtable ${table}: ${r.status}`);
    const json = await r.json();
    records.push(...(json.records || []));
    offset = json.offset || '';
  } while (offset);
  return records;
}

let lieferantenCache: Map<string, string> | null = null;
async function lieferantName(ids: any): Promise<string> {
  const id = Array.isArray(ids) ? ids[0] : null;
  if (!id) return '';
  if (!lieferantenCache) {
    lieferantenCache = new Map();
    try {
      const recs = await airtableAll(LIEFERANTEN_TABLE);
      for (const r of recs) lieferantenCache.set(r.id, r.fields?.['Name'] || '');
    } catch { /* Tabelle evtl. noch nicht angelegt — Seite läuft ohne */ }
  }
  return lieferantenCache.get(id) || '';
}

async function mapTeil(rec: any): Promise<Teil> {
  const f = rec.fields || {};
  const name = f['Page Titel'] || f['System ID'] || rec.id;
  return {
    id: rec.id,
    slug: teilSlug(name, rec.id),
    name,
    type: sel(f['Type']),
    material: multi(f['Material']),
    form: multi(f['Form']),
    closure: sel(f['Closure']),
    beschreibung: f['Kurzbeschreibung'] || '',
    bild: img(f['Bild_Harmonisiert']),
    sizes: multi(f['Available_Sizes']),
    materialsAvailable: multi(f['Available_Materials']),
    supplier: await lieferantName(f['Lieferant']),
  };
}

/* ── Öffentliche API ─────────────────────────────────────────────────── */

export async function alleTeile(): Promise<Teil[]> {
  const recs = await airtableAll(SYSTEM_TABLE);
  return Promise.all(recs.map(mapTeil));
}

export async function teilBySlug(slug: string): Promise<Teil | null> {
  const suffix = slugSuffix(slug);
  if (!suffix || suffix.length < 4) return null;
  const recs = await airtableAll(SYSTEM_TABLE);
  const rec = recs.find((r) => r.id.slice(3, 9).toLowerCase() === suffix);
  return rec ? mapTeil(rec) : null;
}

/* ── Kategorien (Packmittel-Typ) ─────────────────────────────────────── */

export function typSlug(typ: string): string {
  return teilSlug(typ, 'rec000000').replace(/-000000$/, '');
}

export async function alleTypen(): Promise<{ typ: string; slug: string; anzahl: number }[]> {
  const teile = await alleTeile();
  const map = new Map<string, number>();
  teile.forEach((t) => t.type && map.set(t.type, (map.get(t.type) || 0) + 1));
  return Array.from(map, ([typ, anzahl]) => ({ typ, slug: typSlug(typ), anzahl }));
}

export async function teileNachTyp(slug: string): Promise<{ typ: string; teile: Teil[] } | null> {
  const teile = await alleTeile();
  const treffer = teile.filter((t) => t.type && typSlug(t.type) === slug);
  return treffer.length ? { typ: treffer[0].type, teile: treffer } : null;
}
