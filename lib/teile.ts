/* ══════════════════════════════════════════════════════════════════════
   ulba · lib/teile.ts
   Server-seitiger Airtable-Zugriff für die indexierbaren Seiten
   (Teile, Kategorien, Kombi-Seiten, Lieferanten). Läuft NUR auf dem Server.
   Alle Lesezugriffe per Feld-ID → stabil gegen Umbenennungen in Airtable.
   ══════════════════════════════════════════════════════════════════════ */

const AIRTABLE_BASE = 'app0QFyInfhvk66MC';
const SYSTEM_TABLE = 'tblB1kWay9TvX3rGv';
const CAP_TABLE = 'tblQvnXPhiKGMoqDp';
const LIEFERANTEN_TABLE = 'tblsy3CHZbAo6GraB';

/* System (Teile) */
const S = {
  pageTitel: 'fldwwLju4xpK8V3rm', // Formel: "LIEFERANT · Name" (Fallback)
  name: 'fld6MYHRyYtfVatBe',
  typ: 'fldeBw1fv6FrXwwHZ',
  material: 'fldxgloSGbw6lvIOX',
  form: 'fldy6rPvAbNoRDDZ5',
  verschluss: 'fldpDMqZi1t3z31po',
  hals: 'fldc0LLLi5v8VMPNU',
  materialien: 'fldspwlwfZ8ehwHnE',
  groessen: 'fldtT7Rdb5itaJlJg',
  faehigkeiten: 'fldj7C4Qch3ZmSCAM', // SF_Bestätigt
  caps: 'fldVXTFz3pgErhYWj',
  lieferant: 'fldbQyAyAoKEcR42J',
  bild: 'fldGcXPHX1jpg40r4', // Bild_Harmonisiert
  beschreibung: 'fld6gQzYaI74nXDTm', // Kurzbeschreibung
  published: 'fldGKpVG4bIAKnrl9', // nur veröffentlichte Teile (wie die Suche)
  syncStatus: 'fldVtDEyUSRo9lsuH',
};
/* Caps */
const C = {
  name: 'fldDrmgRkLGvuG8qS',
  bildH: 'fldEmoFwLyORDwKPJ',
  bild: 'fldrdBvP5VIQ61ZVB',
  art: 'fldVxgwWH9Bi0OWzn',
};
/* Lieferanten */
const L = {
  name: 'fldq27U7UQU6NZU7P',
  land: 'fldSfiG1p9Qe9Wvrh',
  website: 'fldDfEAJQjKB3ei0G',
  beschreibung: 'fldKTjCZjihhtgrXk',
  status: 'flddhjCq9c3NDC0cZ',
  logo: 'fldSHKbcxAAsvGMxO',
  standort: 'fldEspF57M7TMgapI',
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ulba.ai';

/** Kombi-Seiten und Kategorien entstehen erst ab so vielen Teilen (keine dünnen Seiten). */
export const MIN_TEILE_PRO_SEITE = 3;

export interface Cap { id: string; name: string; art: string; bild: string | null }
export interface Teil {
  id: string; slug: string; name: string;
  type: string; material: string[]; form: string[]; closure: string; hals: string[];
  beschreibung: string; bild: string | null;
  sizes: string[]; materialsAvailable: string[]; faehigkeiten: string[];
  caps: Cap[];
  supplier: string; supplierSlug: string;
  nichtMehrImKatalog: boolean;
}
export interface Lieferant {
  id: string; slug: string; name: string; land: string; website: string; beschreibung: string;
  standort: string; hatLogo: boolean;
}

/* ── Hilfen ──────────────────────────────────────────────────────────── */

const sel = (v: any): string => (typeof v === 'string' ? v : v?.name || '').trim();
const multi = (v: any): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : x?.name || '').trim()).filter(Boolean) : [];
const img = (v: any): string | null => (Array.isArray(v) && v[0]?.url ? v[0].url : null);

export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // é → e, à → a
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
/* Slug: lesbarer Name + Record-ID-Suffix → eindeutig und stabil bei Umbenennung. */
export function teilSlug(name: string, recId: string): string {
  return `${slugify(name) || 'teil'}-${recId.slice(3, 9).toLowerCase()}`;
}

/* ── Airtable ────────────────────────────────────────────────────────── */

async function airtableAll(table: string, fields: string[]): Promise<any[]> {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) throw new Error('AIRTABLE_PAT fehlt im Frontend-Projekt');
  const records: any[] = [];
  let offset = '';
  do {
    const params = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true' });
    fields.forEach((f) => params.append('fields[]', f));
    if (offset) params.set('offset', offset);
    const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${table}?${params}`, {
      headers: { Authorization: `Bearer ${pat}` },
      next: { revalidate: 3600 },
    });
    if (!r.ok) throw new Error(`Airtable ${table}: ${r.status}`);
    const json = await r.json();
    records.push(...(json.records || []));
    offset = json.offset || '';
  } while (offset);
  return records;
}

async function ladeLieferanten(): Promise<Map<string, Lieferant>> {
  const map = new Map<string, Lieferant>();
  try {
    const recs = await airtableAll(LIEFERANTEN_TABLE, Object.values(L));
    for (const r of recs) {
      const f = r.fields || {};
      if (sel(f[L.status]) === 'entfernt') continue;
      const name = String(f[L.name] || '').trim();
      if (!name) continue;
      map.set(r.id, {
        id: r.id, slug: slugify(name), name,
        land: sel(f[L.land]), website: String(f[L.website] || ''),
        standort: String(f[L.standort] || ''), hatLogo: !!img(f[L.logo]),
        beschreibung: String(f[L.beschreibung] || ''),
      });
    }
  } catch { /* Seiten laufen auch ohne Lieferantendaten */ }
  return map;
}

async function ladeCaps(): Promise<Map<string, Cap>> {
  const map = new Map<string, Cap>();
  try {
    const recs = await airtableAll(CAP_TABLE, Object.values(C));
    for (const r of recs) {
      const f = r.fields || {};
      map.set(r.id, { id: r.id, name: String(f[C.name] || ''), art: sel(f[C.art]), bild: img(f[C.bildH]) || img(f[C.bild]) });
    }
  } catch { /* Teil-Seite läuft auch ohne Caps */ }
  return map;
}

/* ── Öffentliche API ─────────────────────────────────────────────────── */

export async function alleLieferanten(): Promise<Lieferant[]> {
  return Array.from((await ladeLieferanten()).values());
}

export async function alleTeile(): Promise<Teil[]> {
  const [recs, lieferanten, caps] = await Promise.all([
    airtableAll(SYSTEM_TABLE, Object.values(S)), ladeLieferanten(), ladeCaps(),
  ]);
  return recs.filter((rec) => rec.fields?.[S.published] === true).map((rec) => {
    const f = rec.fields || {};
    const name = String(f[S.name] || f[S.pageTitel] || rec.id).trim();
    const lief = lieferanten.get((f[S.lieferant] || [])[0]);
    return {
      id: rec.id, slug: teilSlug(name, rec.id), name,
      type: sel(f[S.typ]), material: multi(f[S.material]), form: multi(f[S.form]),
      closure: sel(f[S.verschluss]), hals: multi(f[S.hals]),
      beschreibung: String(f[S.beschreibung] || ''), bild: img(f[S.bild]),
      sizes: multi(f[S.groessen]), materialsAvailable: multi(f[S.materialien]),
      faehigkeiten: multi(f[S.faehigkeiten]),
      caps: ((f[S.caps] || []) as string[]).map((id) => caps.get(id)).filter((c): c is Cap => !!c),
      supplier: lief?.name || '', supplierSlug: lief?.slug || '',
      nichtMehrImKatalog: sel(f[S.syncStatus]) === 'nicht mehr im Katalog',
    };
  });
}

export async function teilBySlug(slug: string): Promise<Teil | null> {
  const suffix = slug.split('-').pop() || '';
  if (suffix.length < 4) return null;
  return (await alleTeile()).find((x) => x.id.slice(3, 9).toLowerCase() === suffix) || null;
}

/** Ähnliche Teile: gleicher Typ, möglichst gleiches Material. */
export async function aehnlicheTeile(t: Teil, n = 6): Promise<Teil[]> {
  return (await alleTeile())
    .filter((x) => x.id !== t.id && x.type === t.type && !x.nichtMehrImKatalog)
    .sort((a, b) => Number(b.material.some((m) => t.material.includes(m))) - Number(a.material.some((m) => t.material.includes(m))))
    .slice(0, n);
}

/* ── Kategorien & Kombi-Seiten ──────────────────────────────────────── */

export interface Kategorie {
  typ: string; typSlug: string;
  filter?: { art: 'material' | 'groesse'; wert: string; slug: string };
  teile: Teil[];
}

function kombisVon(teile: Teil[]): Kategorie[] {
  const aktiv = teile.filter((t) => t.type && !t.nichtMehrImKatalog);
  const typen = new Map<string, Teil[]>();
  aktiv.forEach((t) => typen.set(t.type, [...(typen.get(t.type) || []), t]));
  const out: Kategorie[] = [];
  typen.forEach((liste, typ) => {
    const typSlug = slugify(typ);
    out.push({ typ, typSlug, teile: liste });
    const gruppen = new Map<string, { art: 'material' | 'groesse'; wert: string; teile: Teil[] }>();
    for (const t of liste) {
      t.material.forEach((m) => {
        const k = `material:${slugify(m)}`;
        const g = gruppen.get(k) || { art: 'material' as const, wert: m, teile: [] };
        g.teile.push(t); gruppen.set(k, g);
      });
      t.sizes.forEach((s) => {
        const k = `groesse:${slugify(s)}`;
        const g = gruppen.get(k) || { art: 'groesse' as const, wert: s, teile: [] };
        g.teile.push(t); gruppen.set(k, g);
      });
    }
    gruppen.forEach((g) => {
      // Nur echte Teilmengen mit genug Teilen — sonst Duplikat der Typ-Seite oder zu dünn.
      if (g.teile.length >= MIN_TEILE_PRO_SEITE && g.teile.length < liste.length) {
        out.push({ typ, typSlug, filter: { art: g.art, wert: g.wert, slug: slugify(g.wert) }, teile: g.teile });
      }
    });
  });
  return out;
}

export async function alleKategorien(): Promise<Kategorie[]> {
  return kombisVon(await alleTeile());
}

export async function kategorie(typSlug: string, filterSlug?: string): Promise<Kategorie | null> {
  const k = (await alleKategorien()).find((x) => x.typSlug === typSlug && (filterSlug ? x.filter?.slug === filterSlug : !x.filter));
  return k || null;
}

export function kategorieTitel(k: Kategorie): string {
  if (!k.filter) return `${k.typ} für Kosmetik`;
  return k.filter.art === 'material' ? `${k.typ} aus ${k.filter.wert}` : `${k.typ} ${k.filter.wert.replace(/ml$/i, ' ml')}`;
}
export function kategoriePfad(k: Kategorie): string {
  return `/packmittel/${k.typSlug}${k.filter ? `/${k.filter.slug}` : ''}`;
}

/* ── Lieferanten-Seiten ─────────────────────────────────────────────── */

export async function lieferantBySlug(slug: string): Promise<{ lieferant: Lieferant; teile: Teil[] } | null> {
  const lieferant = (await alleLieferanten()).find((l) => l.slug === slug);
  if (!lieferant) return null;
  const teile = (await alleTeile()).filter((t) => t.supplierSlug === slug);
  return { lieferant, teile };
}
