/* ulba · Studio — Start mit der Suche über die eigenen Teile.
   Teil wählen → Verschluss oben wählen → im Design-Raum eine Welt setzen → rendern. */
import { supabaseServer, bildLinks } from '../../lib/supabase/server';
import { Werkbank, type WbTeil, type WbWelt } from './werkbank/werkbank';
import './werkbank/werkbank.css';

export const maxDuration = 60;

type TeilZeile = { id: string; name: string; rolle: string; typ: string | null; material: string | null; volumen_ml: number | null; hals: string | null;
  verschluss_art: string | null; kollektion: string | null; kurzbeschreibung: string | null; artikelnummer: string | null; mindestmenge: number | null;
  deko_faehigkeiten: unknown; einfaerbbar: boolean | null; bild_pfad: string | null };

const zahl = (v: unknown): number | null => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));

export default async function Studio() {
  const sb = supabaseServer();
  const [{ data: t }, { data: tv }, { data: w }, { data: vs }] = await Promise.all([
    sb.from('teile').select('id, name, rolle, typ, material, volumen_ml, hals, verschluss_art, kollektion, kurzbeschreibung, artikelnummer, mindestmenge, deko_faehigkeiten, einfaerbbar, bild_pfad')
      .eq('status', 'aktiv').order('name'),
    sb.from('teil_verschluesse').select('teil_id, verschluss_id'),
    sb.from('design_welten').select('id, name, felder, bild_pfad').eq('aktiv', true),
    sb.from('vorschlaege').select('marke_id').not('marke_id', 'is', null),
  ]);
  const zeilen = (t ?? []) as TeilZeile[];
  const markenIds = Array.from(new Set(((vs ?? []) as { marke_id: string }[]).map((v) => v.marke_id)));
  const { data: looks } = markenIds.length
    ? await sb.from('marken_looks').select('id, linie_name, design_komponenten, marken ( name )').in('marke_id', markenIds)
    : { data: [] };

  const welten = (w ?? []) as { id: string; name: string; felder: Record<string, unknown>; bild_pfad: string | null }[];
  const [teilBilder, weltBilder] = await Promise.all([bildLinks(zeilen.map((z) => z.bild_pfad)), bildLinks(welten.map((x) => x.bild_pfad), 'welten')]);

  const caps = new Map<string, string[]>();
  for (const r of (tv ?? []) as { teil_id: string; verschluss_id: string }[]) caps.set(r.teil_id, [...(caps.get(r.teil_id) ?? []), r.verschluss_id]);

  const teile: WbTeil[] = zeilen.map((z) => ({
    id: z.id, name: z.name, rolle: z.rolle, typ: z.typ, material: z.material, volumen: z.volumen_ml, hals: z.hals, verschluss: z.verschluss_art,
    kollektion: z.kollektion, beschreibung: z.kurzbeschreibung, artikelnummer: z.artikelnummer, mindestmenge: z.mindestmenge,
    deko: Array.isArray(z.deko_faehigkeiten) ? (z.deko_faehigkeiten as unknown[]).map(String) : [], einfaerbbar: z.einfaerbbar,
    bild: z.bild_pfad ? teilBilder.get(z.bild_pfad) ?? null : null, caps: caps.get(z.id) ?? [],
  }));

  const wl: WbWelt[] = [
    ...welten.map((x) => ({
      id: x.id, art: 'welt' as const, name: x.name, brand: String(x.felder.Brand ?? ''), bild: x.bild_pfad ? weltBilder.get(x.bild_pfad) ?? null : null,
      register: x.felder.Register ? String(x.felder.Register) : null, laut: zahl(x.felder.Temp_Laut), farbtemp: zahl(x.felder.Farbtemp),
      bodyHex: x.felder.Body_Hex ? String(x.felder.Body_Hex) : null, capHex: x.felder.Cap_Hex ? String(x.felder.Cap_Hex) : null,
      wirkung: String(x.felder.Wirkung_Keywords ?? ''),
    })),
    ...((looks ?? []) as unknown as { id: string; linie_name: string; design_komponenten: Record<string, unknown>; marken: { name: string } | null }[]).map((l) => ({
      id: l.id, art: 'look' as const, name: l.linie_name, brand: l.marken?.name ?? '', bild: null, register: null, laut: null, farbtemp: null,
      bodyHex: l.design_komponenten?.Body_Hex ? String(l.design_komponenten.Body_Hex) : null,
      capHex: l.design_komponenten?.Cap_Hex ? String(l.design_komponenten.Cap_Hex) : null,
      wirkung: String(l.design_komponenten?.beschreibung ?? l.design_komponenten?.Wirkung_Keywords ?? ''),
    })),
  ];

  return <Werkbank teile={teile} welten={wl} />;
}
