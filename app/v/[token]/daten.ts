/* ulba · Vorschlagsseite: Daten per Token laden (Server, Admin-Rechte, Token wird geprüft). */
import 'server-only';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { projektSync } from '../../../lib/projekt';

export const DEKO_TEXT: Record<string, string> = {
  einfaerbung_masse: 'in Masse eingefärbt', direktdruck: 'Direktdruck', etikett: 'Etikett', sleeve: 'Sleeve',
  spruehlackierung: 'Sprühlackierung', farbe_fix: 'Materialfarbe bleibt',
};

export async function empfaengerPruefen(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const { data } = await supabaseAdmin().from('empfaenger').select('id, vorschlag_id, name, nachricht, laeuft_ab_am, widerrufen_am, marken_konto_id').eq('token', token).maybeSingle();
  const e = data as any;
  if (!e || e.widerrufen_am || new Date(e.laeuft_ab_am) < new Date()) return null;
  return e as { id: string; vorschlag_id: string; name: string | null; nachricht: string | null; marken_konto_id: string | null };
}

export type Ansicht = {
  lieferant: string; marke: string | null; titel: string; nachricht: string | null; empfaengerName: string | null;
  looks: { id: string; name: string; beschreibung: string }[];
  teile: { posId: string; teilId: string; name: string; material: string | null; volumen: number | null; mindestmenge: number | null;
    deko: string; renders: Record<string, string> }[];
};

export async function ladeAnsicht(e: { id: string; vorschlag_id: string; name: string | null; nachricht: string | null }): Promise<Ansicht | null> {
  const sb = supabaseAdmin();
  const { data: v } = await sb.from('vorschlaege').select('id, titel, firma_id, firmen ( name ), marken ( name )').eq('id', e.vorschlag_id).single();
  if (!v) return null;
  // Links sind live: neueste Designs des Projekts übernehmen
  await projektSync(sb, e.vorschlag_id).catch(() => 0);
  const [{ data: ri }, { data: pos }, { data: rend }] = await Promise.all([
    sb.from('vorschlag_richtungen').select('id, reihenfolge, marken_looks ( linie_name, design_komponenten ), design_welten ( name, felder ), hex, richtungen ( name, beschreibung )').eq('vorschlag_id', e.vorschlag_id).not('richtung_id', 'is', null).order('reihenfolge'),
    sb.from('vorschlag_positionen').select('id, reihenfolge, teil_id, teile:teil_id ( name, material, volumen_ml, mindestmenge, deko_faehigkeiten )').eq('vorschlag_id', e.vorschlag_id).order('reihenfolge'),
    sb.from('renders').select('position_id, richtung_id, bild_pfad').eq('vorschlag_id', e.vorschlag_id).eq('status', 'fertig'),
  ]);
  const pfade = ((rend ?? []) as any[]).map((r) => r.bild_pfad).filter(Boolean);
  const links = new Map<string, string>();
  if (pfade.length) {
    const { data: s } = await sb.storage.from('renders').createSignedUrls(pfade, 3600);
    (s ?? []).forEach((x) => { if (x.path && x.signedUrl) links.set(x.path, x.signedUrl); });
  }
  const vv = v as any;
  return {
    lieferant: vv.firmen?.name ?? 'Lieferant', marke: vv.marken?.name ?? null, titel: vv.titel, nachricht: e.nachricht, empfaengerName: e.name,
    looks: ((ri ?? []) as any[]).map((r) => ({ id: r.id, name: r.richtungen?.name ?? r.marken_looks?.linie_name ?? r.design_welten?.name ?? 'Richtung', beschreibung: r.richtungen?.beschreibung ?? '' })),
    teile: ((pos ?? []) as any[]).filter((p) => ((rend ?? []) as any[]).some((r) => r.position_id === p.id)).map((p) => ({
      posId: p.id, teilId: p.teil_id, name: p.teile?.name ?? 'Teil', material: p.teile?.material ?? null, volumen: p.teile?.volumen_ml ?? null,
      mindestmenge: p.teile?.mindestmenge ?? null,
      deko: ((p.teile?.deko_faehigkeiten ?? []) as string[]).map((d) => DEKO_TEXT[d] ?? d).join(', '),
      renders: Object.fromEntries(((rend ?? []) as any[]).filter((r) => r.position_id === p.id && links.get(r.bild_pfad)).map((r) => [r.richtung_id, links.get(r.bild_pfad)!])),
    })),
  };
}
