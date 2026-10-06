/* app/api/bild/route.ts — stabile Bild-Adresse.
   Airtable-Anhang-URLs laufen nach ~2 h ab. Wer sie speichert (Favoriten,
   Projekte, Board, Musteranfragen), sieht danach leere Karten. Diese Route
   ist die dauerhafte Adresse: /api/bild?r=<recId>[&k=cap|titel]. Sie holt
   bei Bedarf die frische Airtable-URL und leitet dorthin weiter.
   Suchreihenfolge: System → Cap → Rendering_Cache → Lieferant.
   ENV: AIRTABLE_PAT (wie sample-request). */

import { NextResponse } from 'next/server';

const BASE = 'app0QFyInfhvk66MC';
const QUELLEN: { tbl: string; felder: Record<string, string[]> }[] = [
  { tbl: 'tblB1kWay9TvX3rGv', felder: { bild: ['Bild_Harmonisiert', 'Bild_System'] } },               // System
  { tbl: 'tblQvnXPhiKGMoqDp', felder: { bild: ['Cap_Bild_Harmonisiert', 'Cap_Bild'] } },              // Cap
  { tbl: 'tblsOp1WKPGIquBKQ', felder: { bild: ['Bild'], cap: ['Cap_Bild'] } },                        // Rendering_Cache
  { tbl: 'tblsy3CHZbAo6GraB', felder: { bild: ['Logo'], titel: ['Titelbild'] } },                     // Lieferant
];
const FRISCH_MS = 60 * 60 * 1000; // Airtable-URLs halten ~2 h; wir erneuern nach 1 h
const cache = new Map<string, { url: string; bis: number }>();

function anhang(feld: unknown): string | null {
  if (!Array.isArray(feld) || !feld.length) return null;
  const a = feld[0] as { url?: string; thumbnails?: { large?: { url?: string } } };
  return a.url || a.thumbnails?.large?.url || null;
}

/* Airtable liefert einen Record per ID unabhaengig von der angefragten Tabelle
   (Cap-ID unter System-Tabelle → 200 mit Cap-Feldern). Darum: EIN Abruf, dann
   die Bildfelder ALLER Tabellen in fester Reihenfolge pruefen. */
const FELDER: Record<string, string[]> = {
  bild: ['Bild_Harmonisiert', 'Bild_System', 'Bild', 'Cap_Bild_Harmonisiert', 'Cap_Bild', 'Logo'],
  cap: ['Cap_Bild', 'Cap_Bild_Harmonisiert'],
  titel: ['Titelbild'],
};
async function frischeUrl(r: string, k: string): Promise<string | null> {
  const h = { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` };
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${QUELLEN[0].tbl}/${r}`, { headers: h, cache: 'no-store' });
  if (!res.ok) return null;
  const f = (await res.json())?.fields || {};
  for (const name of FELDER[k] || FELDER.bild) { const u = anhang(f[name]); if (u) return u; }
  return null;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const r = sp.get('r') || '';
  const k = (sp.get('k') || 'bild').slice(0, 10);
  if (!/^rec[A-Za-z0-9]{14}$/.test(r)) return new NextResponse('ungueltig', { status: 400 });
  const key = `${r}:${k}`;
  let hit = cache.get(key);
  if (!hit || hit.bis < Date.now()) {
    const url = await frischeUrl(r, k).catch(() => null);
    if (!url) return new NextResponse('kein Bild', { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
    hit = { url, bis: Date.now() + FRISCH_MS };
    cache.set(key, hit);
    if (cache.size > 5000) cache.delete(cache.keys().next().value as string);
  }
  return NextResponse.redirect(hit.url, {
    status: 302,
    headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
  });
}
