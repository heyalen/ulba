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
const tabelleVon = new Map<string, string>(); // recId → Tabelle (spart Fehlversuche)

function anhang(feld: unknown): string | null {
  if (!Array.isArray(feld) || !feld.length) return null;
  const a = feld[0] as { url?: string; thumbnails?: { large?: { url?: string } } };
  return a.url || a.thumbnails?.large?.url || null;
}

let letzteSpur = '';
async function frischeUrl(r: string, k: string): Promise<string | null> {
  const spur: string[] = [];
  if (!process.env.AIRTABLE_PAT) { letzteSpur = 'kein AIRTABLE_PAT'; return null; }
  const h = { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` };
  const bekannt = tabelleVon.get(r);
  const reihe = bekannt ? QUELLEN.filter(q => q.tbl === bekannt) : QUELLEN;
  for (const q of reihe) {
    const felder = q.felder[k] || q.felder.bild;
    const res = await fetch(`https://api.airtable.com/v0/${BASE}/${q.tbl}/${r}`, { headers: h, cache: 'no-store' });
    spur.push(`${q.tbl.slice(0, 6)}:${res.status}`);
    letzteSpur = spur.join(' ');
    if (res.status === 404 || res.status === 403) continue; // anderer Tisch
    if (!res.ok) return null;
    tabelleVon.set(r, q.tbl);
    const f = (await res.json())?.fields || {};
    for (const name of felder) { const u = anhang(f[name]); if (u) return u; }
    letzteSpur += ' leer:' + Object.keys(f).filter(n => /bild|logo/i.test(n)).join(',');
    return null;
  }
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
    if (!url) return new NextResponse(`kein Bild (${letzteSpur})`, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    hit = { url, bis: Date.now() + FRISCH_MS };
    cache.set(key, hit);
    if (cache.size > 5000) cache.delete(cache.keys().next().value as string);
  }
  return NextResponse.redirect(hit.url, {
    status: 302,
    headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
  });
}
