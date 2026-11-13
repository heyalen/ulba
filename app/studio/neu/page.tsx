/* ulba · Entwurf: aus einem Satz werden passende Cards und ein Look-Vorschlag. Ein Bildschirm, ein Knopf. */
import { supabaseServer, bildLinks } from '../../../lib/supabase/server';
import { anfrageLesen, passung } from '../../../lib/anfrage';
import { Entwurf, type ECard, type ELook } from './entwurf';

export const dynamic = 'force-dynamic';

export default async function Neu({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').slice(0, 300).trim();
  const a = anfrageLesen(q);
  const sb = supabaseServer();
  const [{ data: t }, { data: tv }, { data: bib }] = await Promise.all([
    sb.from('teile').select('id, name, rolle, typ, material, volumen_ml, kollektion, verschluss_art, bild_pfad, kurzbeschreibung').eq('status', 'aktiv').order('name'),
    sb.from('teil_verschluesse').select('teil_id, verschluss_id'),
    sb.from('richtungen').select('id, name, felder, version_von').eq('archiviert', false).order('erstellt_am', { ascending: false }).limit(40),
  ]);
  type T = { id: string; name: string; rolle: string; typ: string | null; material: string | null; volumen_ml: number | null; kollektion: string | null; verschluss_art: string | null; bild_pfad: string | null };
  const alle = (t ?? []) as T[];
  const nachId = new Map(alle.map((x) => [x.id, x]));
  const caps = new Map<string, T[]>();
  for (const v of (tv ?? []) as { teil_id: string; verschluss_id: string }[]) {
    const c = nachId.get(v.verschluss_id);
    if (c && !/over\s?cap/i.test(c.name)) caps.set(v.teil_id, [...(caps.get(v.teil_id) ?? []), c]);
  }
  const wunschCap = a.was.find((w) => w.art === 'verschluss');
  const capFuer = (id: string) => {
    const l = (caps.get(id) ?? []).slice().sort((x, y) => Number(!!y.bild_pfad) - Number(!!x.bild_pfad));
    const w = wunschCap ? l.find((c) => `${c.name} ${c.verschluss_art ?? ''} ${c.typ ?? ''}`.toLowerCase().match(wunschCap.wort === 'pipette' || wunschCap.wort === 'dropper' ? /pipette|dropper|drop/ : wunschCap.wort.startsWith('pump') ? /pump/ : /spray|sprüh|mist/)) : null;
    return (w ?? l[0])?.id ?? null;
  };
  const hatKriterien = !!a.volumen || a.was.some((w) => w.art !== 'verschluss');
  const behaelter = alle.filter((x) => x.rolle !== 'verschluss' && x.bild_pfad);
  const bewertet = behaelter.map((x) => ({ x, p: hatKriterien ? passung(a, { name: x.name, typ: x.typ, material: x.material, volumen: x.volumen_ml, kollektion: x.kollektion }) : 0 }))
    .sort((m, n) => n.p - m.p || m.x.name.localeCompare(n.x.name));
  const treffer = hatKriterien ? bewertet.filter((b) => b.p >= 4).slice(0, 12) : [];
  const rest = bewertet.filter((b) => !treffer.includes(b)).slice(0, 60);
  const links = await bildLinks([...treffer, ...rest].map((b) => b.x.bild_pfad));
  const card = (b: { x: T }): ECard => ({ id: b.x.id, name: b.x.name, spec: [b.x.typ, b.x.volumen_ml ? `${b.x.volumen_ml} ml` : null, b.x.material].filter(Boolean).join(' · '), bild: b.x.bild_pfad ? links.get(b.x.bild_pfad) ?? null : null, capId: capFuer(b.x.id) });
  const HEX = /^#[0-9a-f]{6}$/i;
  const alt = new Set(((bib ?? []) as { version_von: string | null }[]).map((r) => r.version_von).filter(Boolean));
  const looks: ELook[] = ((bib ?? []) as { id: string; name: string; felder: Record<string, unknown> }[]).filter((r) => !alt.has(r.id)).slice(0, 10)
    .map((r) => ({ id: r.id, name: r.name, hex: typeof r.felder?.Body_Hex === 'string' && HEX.test(r.felder.Body_Hex) ? r.felder.Body_Hex : '#E9E2D6' }));

  return <Entwurf q={q} erkannt={[...(a.volumen ? [`${a.volumen} ml`] : []), ...a.was.map((w) => w.label)]} url={a.url} stil={a.stil}
    treffer={treffer.map(card)} weitere={rest.map(card)} looks={looks} />;
}
