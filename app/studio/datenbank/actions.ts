'use server';
/* ulba · Datenbank: Katalog-Quelle anlegen (Link oder PDF). */
import { revalidatePath } from 'next/cache';
import { ladeKontext, supabaseServer } from '../../../lib/supabase/server';

export type QuelleStatus = { ok: boolean; fehler?: string };

function normalisiereUrl(eingabe: string): string | null {
  const s = eingabe.trim();
  if (!s) return null;
  try {
    const u = new URL(s.includes('://') ? s : `https://${s}`);
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch { return null; }
}

export async function quelleAnlegen(_v: QuelleStatus, form: FormData): Promise<QuelleStatus> {
  const k = await ladeKontext();
  if (!k?.firma) return { ok: false, fehler: 'Nicht angemeldet.' };
  const sb = supabaseServer();

  const art = String(form.get('art') ?? 'link');
  if (art === 'link') {
    const url = normalisiereUrl(String(form.get('url') ?? ''));
    if (!url) return { ok: false, fehler: 'Die Katalog-Adresse sieht nicht richtig aus.' };
    const { error } = await sb.from('quellen').insert({ firma_id: k.firma.id, art: 'link', katalog_url: url, erstellt_von: k.userId });
    if (error) return { ok: false, fehler: 'Die Quelle konnte nicht gespeichert werden.' };
  } else {
    const datei = form.get('pdf');
    if (!(datei instanceof File) || datei.size === 0) return { ok: false, fehler: 'Bitte eine PDF-Datei wählen.' };
    if (datei.type !== 'application/pdf') return { ok: false, fehler: 'Nur PDF-Dateien sind möglich.' };
    if (datei.size > 50 * 1024 * 1024) return { ok: false, fehler: 'Die Datei ist grösser als 50 MB.' };
    const pfad = `${k.firma.id}/${Date.now()}-${datei.name.replace(/[^\w.\-]+/g, '_')}`;
    const { error: up } = await sb.storage.from('kataloge').upload(pfad, datei, { contentType: 'application/pdf' });
    if (up) return { ok: false, fehler: 'Das PDF konnte nicht hochgeladen werden.' };
    const { error } = await sb.from('quellen').insert({ firma_id: k.firma.id, art: 'pdf', pdf_pfad: pfad, erstellt_von: k.userId });
    if (error) return { ok: false, fehler: 'Die Quelle konnte nicht gespeichert werden.' };
  }
  revalidatePath('/studio/datenbank');
  return { ok: true };
}
