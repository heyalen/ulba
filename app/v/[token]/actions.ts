'use server';
/* ulba · Empfängerseite: Aktionen der Marke (ohne Konto, per Token). */
import { supabaseAdmin } from '../../../lib/supabase/server';
import { CHIPS, verfeinern, komponenten, type Chip, type Felder } from '../../../lib/richtung';
import { empfaengerPruefen } from './daten';

const ARTEN = ['richtung_gewaehlt', 'gefaellt', 'verglichen', 'pdf_export'];
const UUID = /^[0-9a-f-]{36}$/;
const uuid = (x: string | null | undefined) => (x && UUID.test(x) ? x : null);
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Spalte muss zu diesem Vorschlag gehören */
async function spalteDes(vid: string, spalteId: string | null) {
  if (!uuid(spalteId)) return null;
  const { data } = await supabaseAdmin().from('vorschlag_richtungen').select('id, richtung_id').eq('id', spalteId!).eq('vorschlag_id', vid).maybeSingle();
  return data as { id: string; richtung_id: string | null } | null;
}

export async function ereignis(token: string, art: string, zielId: string | null, spalteId: string | null = null) {
  if (!ARTEN.includes(art)) return;
  const e = await empfaengerPruefen(token);
  if (!e) return;
  const s = await spalteDes(e.vorschlag_id, spalteId);
  await supabaseAdmin().from('ereignisse').insert({ empfaenger_id: e.id, art, ziel_id: uuid(zielId), richtung_id: s?.id ?? null });
}

export type Status = { ok: boolean; fehler?: string };

export async function musterAnfragen(token: string, designs: { teilId: string; spalteId: string | null }[], email: string, nachricht: string): Promise<Status> {
  const e = await empfaengerPruefen(token);
  if (!e) return { ok: false, fehler: 'Dieser Link ist nicht mehr gültig.' };
  const mail = email.trim().toLowerCase();
  if (!MAIL.test(mail)) return { ok: false, fehler: 'Bitte eine gültige E-Mail-Adresse eingeben.' };
  const sb = supabaseAdmin();
  const liste = designs.slice(0, 50);
  const [{ data: pos }, { data: cols }] = await Promise.all([
    sb.from('vorschlag_positionen').select('teil_id').eq('vorschlag_id', e.vorschlag_id).in('teil_id', liste.map((d) => d.teilId).filter((x) => UUID.test(x))),
    sb.from('vorschlag_richtungen').select('id').eq('vorschlag_id', e.vorschlag_id),
  ]);
  const teile = new Set(((pos ?? []) as { teil_id: string }[]).map((p) => p.teil_id));
  const spalten = new Set(((cols ?? []) as { id: string }[]).map((c) => c.id));
  const ok = liste.filter((d) => teile.has(d.teilId)).map((d) => ({ teilId: d.teilId, spalteId: d.spalteId && spalten.has(d.spalteId) ? d.spalteId : null }));
  if (!ok.length) return { ok: false, fehler: 'Bitte mindestens ein Design auswählen.' };
  const text = nachricht.trim().slice(0, 1000) || null;
  const { error } = await sb.from('musteranfragen').insert(ok.map((d) => ({ empfaenger_id: e.id, teil_id: d.teilId, richtung_id: d.spalteId, email: mail, nachricht: text })));
  if (error) return { ok: false, fehler: 'Die Anfrage konnte nicht gesendet werden.' };
  await sb.from('ereignisse').insert(ok.map((d) => ({ empfaenger_id: e.id, art: 'muster_angefragt', ziel_id: d.teilId, richtung_id: d.spalteId })));
  // Sammelmappe: Marken-Konto zur E-Mail anlegen bzw. verknüpfen
  const { data: konto } = await sb.from('marken_konten').upsert({ email: mail }, { onConflict: 'email' }).select('id').single();
  if (konto && !e.marken_konto_id) await sb.from('empfaenger').update({ marken_konto_id: (konto as { id: string }).id }).eq('id', e.id);
  return { ok: true };
}

/* «Anpassen wünschen»: dieselben Chips wie beim Verfeinern. Erscheint beim
   Lieferanten als neue Spalte (noch ohne Render — er entscheidet, ob er rendert). */
export async function anpassenWuenschen(token: string, teilId: string, spalteId: string, chips: string[], notiz: string): Promise<Status> {
  const e = await empfaengerPruefen(token);
  if (!e) return { ok: false, fehler: 'Dieser Link ist nicht mehr gültig.' };
  const gueltig = CHIPS.filter(([k]) => chips.includes(k));
  const text = notiz.trim().slice(0, 300);
  if (!gueltig.length && !text) return { ok: false, fehler: 'Bitte mindestens eine Änderung wählen oder beschreiben.' };
  const sb = supabaseAdmin();
  const s = await spalteDes(e.vorschlag_id, spalteId);
  if (!s?.richtung_id) return { ok: false, fehler: 'Diese Richtung gibt es nicht mehr.' };
  const { count } = await sb.from('vorschlag_richtungen').select('id', { count: 'exact', head: true }).eq('wunsch_von', e.id);
  if ((count ?? 0) >= 10) return { ok: false, fehler: 'Sie haben schon 10 Wünsche geschickt. Bitte melden Sie sich direkt beim Absender.' };
  const { data: alt } = await sb.from('richtungen').select('id, firma_id, name, beschreibung, felder, bild_pfad, basis_welt_id').eq('id', s.richtung_id).single();
  const a = alt as { id: string; firma_id: string; name: string; beschreibung: string | null; felder: Felder; bild_pfad: string | null; basis_welt_id: string | null } | null;
  if (!a) return { ok: false, fehler: 'Diese Richtung gibt es nicht mehr.' };
  let felder: Felder = a.felder ?? {};
  for (const [k] of gueltig) felder = verfeinern(felder, k as Chip).felder;
  if (text) { const k = komponenten(felder); k.design_dna = `${String(k.design_dna || '').trim()} Client request: ${text}.`.trim(); felder = { ...felder, Design_Komponenten: k }; }
  const wer = e.name?.trim() || 'Empfänger';
  const wunsch = `${wer}: ${[...gueltig.map(([, t]) => t), text].filter(Boolean).join(', ')}`.slice(0, 400);
  const { data: dup } = await sb.from('vorschlag_richtungen').select('id').eq('vorschlag_id', e.vorschlag_id).eq('wunsch_von', e.id).eq('wunsch_text', wunsch).maybeSingle();
  if (dup) return { ok: true };
  const { data: neu, error } = await sb.from('richtungen').insert({ firma_id: a.firma_id, name: `${a.name.replace(/ · Wunsch.*$/, '')} · Wunsch`.slice(0, 60), beschreibung: a.beschreibung,
    felder, quelle: 'verfeinert', bild_pfad: a.bild_pfad, basis_welt_id: a.basis_welt_id }).select('id').single();
  if (error || !neu) return { ok: false, fehler: 'Der Wunsch konnte nicht gespeichert werden.' };
  const { count: n } = await sb.from('vorschlag_richtungen').select('id', { count: 'exact', head: true }).eq('vorschlag_id', e.vorschlag_id);
  const { data: col } = await sb.from('vorschlag_richtungen').insert({ vorschlag_id: e.vorschlag_id, richtung_id: (neu as { id: string }).id, reihenfolge: n ?? 0, wunsch_von: e.id, wunsch_text: wunsch }).select('id').single();
  await sb.from('ereignisse').insert({ empfaenger_id: e.id, art: 'anpassen_gewuenscht', ziel_id: uuid(teilId), richtung_id: s.id });
  await sb.from('vorschlaege').update({ aktualisiert_am: new Date().toISOString() }).eq('id', e.vorschlag_id);
  return col ? { ok: true } : { ok: false, fehler: 'Der Wunsch konnte nicht gespeichert werden.' };
}

/* Weiterleiten an Kolleginnen: eigener Unterlink, läuft nicht länger als der eigene. */
export async function weiterleiten(token: string, name: string, email: string): Promise<Status & { token?: string }> {
  const e = await empfaengerPruefen(token);
  if (!e) return { ok: false, fehler: 'Dieser Link ist nicht mehr gültig.' };
  const n = name.trim().slice(0, 120);
  if (!n) return { ok: false, fehler: 'Bitte einen Namen eingeben.' };
  const mail = email.trim().toLowerCase();
  if (mail && !MAIL.test(mail)) return { ok: false, fehler: 'Bitte eine gültige E-Mail-Adresse eingeben.' };
  const sb = supabaseAdmin();
  const { count } = await sb.from('empfaenger').select('id', { count: 'exact', head: true }).eq('weitergeleitet_von', e.id);
  if ((count ?? 0) >= 10) return { ok: false, fehler: 'Sie haben dieses Lookbook schon 10-mal weitergeleitet.' };
  const { data, error } = await sb.from('empfaenger').insert({ vorschlag_id: e.vorschlag_id, name: n, email: mail || null, nachricht: e.nachricht,
    weitergeleitet_von: e.id, laeuft_ab_am: e.laeuft_ab_am }).select('id, token').single();
  if (error || !data) return { ok: false, fehler: 'Der Link konnte nicht erstellt werden.' };
  await sb.from('ereignisse').insert({ empfaenger_id: e.id, art: 'weitergeleitet', ziel_id: (data as { id: string }).id });
  return { ok: true, token: (data as { token: string }).token };
}

/* Team-Link (ohne feste E-Mail, z. B. an einen Verteiler): wer zum ersten Mal ♥, Wunsch oder Muster nutzt,
   nennt einmal Name und E-Mail. Daraus entsteht ein eigener Unterlink — so sieht der Lieferant jede Person einzeln. */
export async function teamBeitreten(token: string, name: string, email: string): Promise<Status & { token?: string; email?: string }> {
  const e = await empfaengerPruefen(token);
  if (!e) return { ok: false, fehler: 'Dieser Link ist nicht mehr gültig.' };
  const n = name.trim().slice(0, 120), mail = email.trim().toLowerCase();
  if (!n) return { ok: false, fehler: 'Bitte Ihren Namen eingeben.' };
  if (!MAIL.test(mail)) return { ok: false, fehler: 'Bitte eine gültige E-Mail-Adresse eingeben.' };
  const sb = supabaseAdmin();
  const { data: da } = await sb.from('empfaenger').select('token').eq('weitergeleitet_von', e.id).eq('email', mail).is('widerrufen_am', null).maybeSingle();
  if (da) return { ok: true, token: (da as { token: string }).token, email: mail };
  const { count } = await sb.from('empfaenger').select('id', { count: 'exact', head: true }).eq('weitergeleitet_von', e.id);
  if ((count ?? 0) >= 200) return { ok: false, fehler: 'Über diesen Link haben sich schon sehr viele Personen angemeldet.' };
  const { data, error } = await sb.from('empfaenger').insert({ vorschlag_id: e.vorschlag_id, name: n, email: mail, nachricht: e.nachricht, weitergeleitet_von: e.id, laeuft_ab_am: e.laeuft_ab_am }).select('token').single();
  if (error || !data) return { ok: false, fehler: 'Das hat nicht geklappt. Bitte nochmal versuchen.' };
  await sb.from('ereignisse').insert({ empfaenger_id: (await empfaengerPruefen((data as { token: string }).token))!.id, art: 'geoeffnet' });
  return { ok: true, token: (data as { token: string }).token, email: mail };
}
