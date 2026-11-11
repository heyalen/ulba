'use server';
/* ulba · Vorschlagsseite: Aktionen der Marke (ohne Konto, per Token). */
import { supabaseAdmin } from '../../../lib/supabase/server';
import { empfaengerPruefen } from './daten';

const ARTEN = ['richtung_gewaehlt', 'gefaellt', 'frage_gestellt'];

export async function ereignis(token: string, art: string, zielId: string | null) {
  if (!ARTEN.includes(art)) return;
  const e = await empfaengerPruefen(token);
  if (!e) return;
  await supabaseAdmin().from('ereignisse').insert({ empfaenger_id: e.id, art, ziel_id: zielId && /^[0-9a-f-]{36}$/.test(zielId) ? zielId : null });
}

export type AnfrageStatus = { ok: boolean; fehler?: string };
export async function musterAnfragen(token: string, teilIds: string[], richtungId: string | null, email: string, nachricht: string): Promise<AnfrageStatus> {
  const e = await empfaengerPruefen(token);
  if (!e) return { ok: false, fehler: 'Dieser Link ist nicht mehr gültig.' };
  const mail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { ok: false, fehler: 'Bitte eine gültige E-Mail-Adresse eingeben.' };
  const sb = supabaseAdmin();
  // nur Teile, die wirklich in diesem Vorschlag stehen
  const { data: pos } = await sb.from('vorschlag_positionen').select('teil_id').eq('vorschlag_id', e.vorschlag_id).in('teil_id', teilIds.slice(0, 50));
  const erlaubt = ((pos ?? []) as any[]).map((p) => p.teil_id as string);
  if (!erlaubt.length) return { ok: false, fehler: 'Bitte mindestens ein Teil auswählen.' };
  const { data: ri } = richtungId ? await sb.from('vorschlag_richtungen').select('id').eq('id', richtungId).eq('vorschlag_id', e.vorschlag_id).maybeSingle() : { data: null };
  const { error } = await sb.from('musteranfragen').insert(erlaubt.map((t) => ({ empfaenger_id: e.id, teil_id: t, richtung_id: (ri as any)?.id ?? null, email: mail, nachricht: nachricht.trim().slice(0, 1000) || null })));
  if (error) return { ok: false, fehler: 'Die Anfrage konnte nicht gesendet werden.' };
  await sb.from('ereignisse').insert(erlaubt.map((t) => ({ empfaenger_id: e.id, art: 'muster_angefragt', ziel_id: t })));
  // Sammelmappe: Marken-Konto zur E-Mail anlegen bzw. verknüpfen
  const { data: konto } = await sb.from('marken_konten').upsert({ email: mail }, { onConflict: 'email' }).select('id').single();
  if (konto && !e.marken_konto_id) await sb.from('empfaenger').update({ marken_konto_id: (konto as any).id }).eq('id', e.id);
  return { ok: true };
}
