'use server';
/* ulba · Einstellungen: Absender-Profil (erscheint auf der Empfängerseite /v). */
import { revalidatePath } from 'next/cache';
import { ladeKontext, supabaseAdmin } from '../../../lib/supabase/server';

export async function absenderSpeichern(f: FormData): Promise<{ ok?: boolean; fehler?: string }> {
  const k = await ladeKontext();
  if (!k?.firma) return { fehler: 'Bitte neu anmelden.' };
  const s = (n: string, max: number) => String(f.get(n) ?? '').trim().slice(0, max) || null;
  const sb = supabaseAdmin();
  const neu: Record<string, string | null> = { anzeigename: s('anzeigename', 80), titel: s('titel', 80), telefon: s('telefon', 40) };
  const foto = f.get('foto');
  if (foto instanceof Blob && foto.size > 0) {
    if (foto.size > 600_000 || !/^image\/(jpeg|png|webp)$/.test(foto.type)) return { fehler: 'Das Foto ist zu gross oder kein Bild.' };
    const pfad = `${k.firma.id}/absender_${k.userId}.jpg`;
    const { error } = await sb.storage.from('logos').upload(pfad, foto, { upsert: true, contentType: foto.type });
    if (error) return { fehler: 'Das Foto konnte nicht gespeichert werden.' };
    neu.foto_pfad = pfad;
  }
  const { error } = await sb.from('mitglieder').update(neu).eq('firma_id', k.firma.id).eq('user_id', k.userId);
  if (error) return { fehler: 'Das Profil konnte nicht gespeichert werden.' };
  revalidatePath('/studio/einstellungen');
  return { ok: true };
}
