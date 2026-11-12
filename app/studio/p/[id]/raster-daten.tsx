/* ulba · lädt alles fürs Raster (Katalog, Welten, Bibliothek, Bilder) in einer Runde. */
import { supabaseServer, bildLinks } from '../../../../lib/supabase/server';
import type { Felder } from '../../../../lib/richtung';
import { Raster, type RTeil, type RSpalte, type RZeile, type RZelle, type RRichtung } from './raster';
import type { WbWelt } from '../../werkbank/werkbank';
import '../../werkbank/werkbank.css';
import './raster.css';

export type SpalteRoh = { id: string; richtung_id: string; richtungen: { id: string; name: string; beschreibung: string | null; felder: Felder; quelle: string; bild_pfad: string | null } | null };
type TeilZeile = { id: string; status: string; name: string; rolle: string; typ: string | null; material: string | null; volumen_ml: number | null; hals: string | null; verschluss_art: string | null; kollektion: string | null; artikelnummer: string | null; bild_pfad: string | null };
const zahl = (v: unknown): number | null => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));
const hex = (v: unknown) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null);

export async function RasterDaten({ vid, cols, pos, zellen }: {
  vid: string; cols: SpalteRoh[]; pos: { id: string; teil_id: string; cap_id: string | null }[];
  zellen: { id: string; teil_id: string; cap_id: string | null; welt_id: string; status: string; log: string | null; bild_pfad: string | null }[];
}) {
  const sb = supabaseServer();
  const [{ data: t }, { data: tv }, { data: w }, { data: bib }] = await Promise.all([
    sb.from('teile').select('id, name, rolle, typ, material, volumen_ml, hals, verschluss_art, kollektion, artikelnummer, bild_pfad, status').neq('status', 'verworfen').order('name'),
    sb.from('teil_verschluesse').select('teil_id, verschluss_id'),
    sb.from('design_welten').select('id, name, felder, bild_pfad').eq('aktiv', true),
    sb.from('richtungen').select('id, name, beschreibung, felder, quelle, bild_pfad, version_von').eq('archiviert', false).order('erstellt_am', { ascending: false }).limit(80),
  ]);
  const teileRoh = (t ?? []) as TeilZeile[];
  const welten = (w ?? []) as { id: string; name: string; felder: Record<string, unknown>; bild_pfad: string | null }[];
  const bibAlle = (bib ?? []) as { id: string; name: string; beschreibung: string | null; felder: Felder; quelle: string; bild_pfad: string | null; version_von: string | null }[];
  const ersetzt = new Set(bibAlle.map((b) => b.version_von).filter(Boolean));
  const bibliothek = bibAlle.filter((b) => !ersetzt.has(b.id));
  const [teilBild, weltBild, renderBild, refBild] = await Promise.all([
    bildLinks(teileRoh.map((x) => x.bild_pfad)),
    bildLinks(welten.map((x) => x.bild_pfad), 'welten'),
    bildLinks(zellen.map((z) => z.bild_pfad), 'renders'),
    bildLinks([...bibliothek.map((b) => b.bild_pfad), ...cols.map((c) => c.richtungen?.bild_pfad)], 'referenzen'),
  ]);
  const caps = new Map<string, string[]>();
  for (const r of (tv ?? []) as { teil_id: string; verschluss_id: string }[]) caps.set(r.teil_id, [...(caps.get(r.teil_id) ?? []), r.verschluss_id]);

  const teile: RTeil[] = teileRoh.map((x) => ({ id: x.id, aktiv: x.status === 'aktiv', name: x.name, rolle: x.rolle, typ: x.typ, material: x.material, volumen: x.volumen_ml, hals: x.hals,
    verschluss: x.verschluss_art, kollektion: x.kollektion, artikelnummer: x.artikelnummer, bild: x.bild_pfad ? teilBild.get(x.bild_pfad) ?? null : null, caps: caps.get(x.id) ?? [] }));
  const richtung = (r: { id: string; name: string; beschreibung: string | null; felder: Felder; quelle: string; bild_pfad: string | null }): RRichtung => ({
    id: r.id, name: r.name, beschreibung: r.beschreibung ?? '', quelle: r.quelle, bild: r.bild_pfad ? refBild.get(r.bild_pfad) ?? null : null,
    bodyHex: hex(r.felder.Body_Hex), capHex: hex(r.felder.Cap_Hex), akzentHex: hex(r.felder.Akzent_Hex),
    finish: typeof r.felder.Finish_Body === 'string' ? r.felder.Finish_Body : null,
  });
  const spalten: RSpalte[] = cols.filter((c) => c.richtungen).map((c) => ({ id: c.id, richtung: richtung(c.richtungen!) }));
  const zeilen: RZeile[] = pos.map((p) => ({ id: p.id, teilId: p.teil_id, capId: p.cap_id }));
  const zellenOut: RZelle[] = zellen.map((z) => ({ id: z.id, teilId: z.teil_id, richtungId: z.welt_id, capId: z.cap_id, status: z.status, log: z.log, bild: z.bild_pfad ? renderBild.get(z.bild_pfad) ?? null : null }));
  const imRaster = new Set(spalten.map((s) => s.richtung.id));
  const wl: WbWelt[] = welten.map((x) => ({ id: x.id, art: 'welt', name: x.name, brand: String(x.felder.Brand ?? ''), bild: x.bild_pfad ? weltBild.get(x.bild_pfad) ?? null : null,
    register: x.felder.Register ? String(x.felder.Register) : null, laut: zahl(x.felder.Temp_Laut), farbtemp: zahl(x.felder.Farbtemp),
    bodyHex: hex(x.felder.Body_Hex), capHex: hex(x.felder.Cap_Hex), wirkung: String(x.felder.Wirkung_Keywords ?? '') }));

  return <Raster vid={vid} teile={teile} spalten={spalten} zeilen={zeilen} zellen={zellenOut} welten={wl}
    bibliothek={bibliothek.filter((b) => !imRaster.has(b.id)).map(richtung)} />;
}
