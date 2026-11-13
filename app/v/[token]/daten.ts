/* ulba · Empfängerseite (Lookbook): Daten per Token laden (Server, Admin-Rechte, Token wird geprüft). */
import 'server-only';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { projektSync } from '../../../lib/projekt';

export const DEKO_TEXT: Record<string, string> = {
  einfaerbung_masse: 'in Masse eingefärbt', direktdruck: 'Direktdruck', etikett: 'Etikett', sleeve: 'Sleeve',
  spruehlackierung: 'Sprühlackierung', farbe_fix: 'Materialfarbe bleibt',
};

export type Empfaenger = { id: string; vorschlag_id: string; name: string | null; nachricht: string | null; marken_konto_id: string | null; laeuft_ab_am: string; weitergeleitet_von: string | null };

export async function empfaengerPruefen(token: string): Promise<Empfaenger | null> {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const { data } = await supabaseAdmin().from('empfaenger').select('id, vorschlag_id, name, nachricht, laeuft_ab_am, widerrufen_am, marken_konto_id, weitergeleitet_von').eq('token', token).maybeSingle();
  const e = data as (Empfaenger & { widerrufen_am: string | null }) | null;
  if (!e || e.widerrufen_am || new Date(e.laeuft_ab_am) < new Date()) return null;
  return e;
}

export type Fakten = { material: string | null; volumen: number | null; hals: string | null; verschluss: string | null; deko: string; pcr: number | null; moq: number | null; datenblatt: string | null; foto: string | null };
export type Ansicht = {
  lieferant: string; logo: string | null; marke: string | null; titel: string; einleitung: string | null; nachricht: string | null; empfaengerName: string | null; weitergeleitetVon: string | null;
  absender: { name: string; titel: string | null; email: string | null; telefon: string | null; foto: string | null } | null;
  richtungen: { id: string; name: string; beschreibung: string; hex: string | null }[];
  teile: { posId: string; teilId: string; name: string; satz: string | null; fakten: Fakten; renders: Record<string, string> }[];
};

const HEX = /^#[0-9a-f]{6}$/i;

async function signiert(bucket: string, pfade: (string | null | undefined)[]): Promise<Map<string, string>> {
  const liste = Array.from(new Set(pfade.filter((p): p is string => !!p)));
  const m = new Map<string, string>();
  if (!liste.length) return m;
  const { data } = await supabaseAdmin().storage.from(bucket).createSignedUrls(liste, 6 * 3600);
  (data ?? []).forEach((x) => { if (x.path && x.signedUrl) m.set(x.path, x.signedUrl); });
  return m;
}

export async function ladeAnsicht(e: Empfaenger): Promise<Ansicht | null> {
  const sb = supabaseAdmin();
  const { data: v } = await sb.from('vorschlaege').select('id, titel, einleitung, firma_id, erstellt_von, firmen ( name, logo_pfad ), marken ( name )').eq('id', e.vorschlag_id).single();
  if (!v) return null;
  const vv = v as unknown as { titel: string; einleitung: string | null; firma_id: string; erstellt_von: string | null; firmen: { name: string; logo_pfad: string | null } | null; marken: { name: string } | null };
  // Links sind live: neueste Designs des Vorschlags übernehmen
  await projektSync(sb, e.vorschlag_id).catch(() => 0);
  const [{ data: ri }, { data: pos }, { data: rend }, { data: mit }, { data: von }, autor] = await Promise.all([
    sb.from('vorschlag_richtungen').select('id, reihenfolge, hex, richtungen ( name, beschreibung, felder )').eq('vorschlag_id', e.vorschlag_id).not('richtung_id', 'is', null).order('reihenfolge'),
    sb.from('vorschlag_positionen').select('id, reihenfolge, teil_id, verkaufssatz, teile:teil_id ( name, material, volumen_ml, hals, mindestmenge, deko_faehigkeiten, pcr_prozent, quelle_url, bild_pfad ), cap:cap_id ( name )').eq('vorschlag_id', e.vorschlag_id).order('reihenfolge'),
    sb.from('renders').select('position_id, richtung_id, bild_pfad').eq('vorschlag_id', e.vorschlag_id).eq('status', 'fertig'),
    vv.erstellt_von ? sb.from('mitglieder').select('anzeigename, titel, telefon, foto_pfad').eq('firma_id', vv.firma_id).eq('user_id', vv.erstellt_von).maybeSingle() : Promise.resolve({ data: null }),
    e.weitergeleitet_von ? sb.from('empfaenger').select('name').eq('id', e.weitergeleitet_von).maybeSingle() : Promise.resolve({ data: null }),
    vv.erstellt_von ? sb.auth.admin.getUserById(vv.erstellt_von).catch(() => null) : Promise.resolve(null),
  ]);
  type Pos = { id: string; teil_id: string; verkaufssatz: string | null; cap: { name: string } | null; teile: { name: string; material: string | null; volumen_ml: number | null; hals: string | null; mindestmenge: number | null; deko_faehigkeiten: string[] | null; pcr_prozent: number | null; quelle_url: string | null; bild_pfad: string | null } | null };
  const R = (rend ?? []) as { position_id: string; richtung_id: string; bild_pfad: string }[];
  const P = (pos ?? []) as unknown as Pos[];
  const M = mit as { anzeigename: string | null; titel: string | null; telefon: string | null; foto_pfad: string | null } | null;
  const [renderUrl, fotoUrl, logoUrl] = await Promise.all([
    signiert('renders', R.map((r) => r.bild_pfad)),
    signiert('teile', P.map((p) => p.teile?.bild_pfad)),
    signiert('logos', [vv.firmen?.logo_pfad, M?.foto_pfad]),
  ]);
  const mitRender = new Set(R.filter((r) => renderUrl.has(r.bild_pfad)).map((r) => r.richtung_id));
  const email = (autor as { data?: { user?: { email?: string } | null } } | null)?.data?.user?.email ?? null;
  const name = M?.anzeigename?.trim() || null;

  return {
    lieferant: vv.firmen?.name ?? 'Lieferant', logo: vv.firmen?.logo_pfad ? logoUrl.get(vv.firmen.logo_pfad) ?? null : null,
    marke: vv.marken?.name ?? null, titel: vv.titel, einleitung: vv.einleitung ?? null, nachricht: e.nachricht, empfaengerName: e.name,
    weitergeleitetVon: (von as { name: string | null } | null)?.name ?? (e.weitergeleitet_von ? 'einer Kollegin' : null),
    absender: name || email ? { name: name ?? email!, titel: M?.titel ?? null, email, telefon: M?.telefon ?? null, foto: M?.foto_pfad ? logoUrl.get(M.foto_pfad) ?? null : null } : null,
    richtungen: ((ri ?? []) as unknown as { id: string; hex: string | null; richtungen: { name: string; beschreibung: string | null; felder: Record<string, unknown> } | null }[])
      .filter((r) => mitRender.has(r.id))
      .map((r) => {
        const b = r.richtungen?.felder?.Body_Hex;
        return { id: r.id, name: r.richtungen?.name ?? 'Richtung', beschreibung: r.richtungen?.beschreibung ?? '', hex: typeof b === 'string' && HEX.test(b) ? b : r.hex && HEX.test(r.hex) ? r.hex : null };
      }),
    teile: P.filter((p) => R.some((r) => r.position_id === p.id && renderUrl.has(r.bild_pfad))).map((p) => {
      const t = p.teile;
      return {
        posId: p.id, teilId: p.teil_id, name: t?.name ?? 'Teil', satz: p.verkaufssatz ?? null,
        fakten: {
          material: t?.material ?? null, volumen: t?.volumen_ml ?? null, hals: t?.hals ?? null, verschluss: p.cap?.name ?? null,
          deko: (t?.deko_faehigkeiten ?? []).map((d) => DEKO_TEXT[d] ?? d).join(', '), pcr: t?.pcr_prozent ?? null, moq: t?.mindestmenge ?? null,
          datenblatt: t?.quelle_url && /^https?:\/\//.test(t.quelle_url) ? t.quelle_url : null, foto: t?.bild_pfad ? fotoUrl.get(t.bild_pfad) ?? null : null,
        },
        renders: Object.fromEntries(R.filter((r) => r.position_id === p.id && renderUrl.has(r.bild_pfad)).map((r) => [r.richtung_id, renderUrl.get(r.bild_pfad)!])),
      };
    }),
  };
}
