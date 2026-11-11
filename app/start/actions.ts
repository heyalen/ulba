'use server';
/* ulba · Firma anlegen: neue Firma + aktueller Nutzer als Inhaber.
   Läuft serverseitig mit Admin-Rechten, weil es vor der ersten Mitgliedschaft
   noch keine Firma gibt, die die RLS freigeben könnte. */
import { redirect } from 'next/navigation';
import { ladeKontext, supabaseAdmin } from '../../lib/supabase/server';

export type StartStatus = { fehler?: string };
const TYPEN = ['lieferant', 'haendler', 'lohnhersteller'];

function domainAus(eingabe: string): string | null {
  const s = eingabe.trim().toLowerCase();
  if (!s) return null;
  try { return new URL(s.includes('://') ? s : `https://${s}`).hostname.replace(/^www\./, ''); }
  catch { return null; }
}

export async function firmaAnlegen(_v: StartStatus, form: FormData): Promise<StartStatus> {
  const k = await ladeKontext();
  if (!k) redirect('/login');
  if (k.firma) redirect('/studio');

  const name = String(form.get('name') ?? '').trim();
  const typ = String(form.get('typ') ?? 'lieferant');
  const website = String(form.get('website') ?? '');
  if (name.length < 2 || name.length > 120) return { fehler: 'Bitte den Firmennamen eingeben.' };
  if (!TYPEN.includes(typ)) return { fehler: 'Bitte auswählen, was deine Firma macht.' };
  const domain = domainAus(website);
  if (website.trim() && !domain) return { fehler: 'Die Website-Adresse sieht nicht richtig aus.' };

  const admin = supabaseAdmin();
  const { data: firma, error } = await admin.from('firmen').insert({ name, typ, domain }).select('id').single();
  if (error || !firma) return { fehler: 'Die Firma konnte nicht angelegt werden. Bitte nochmals versuchen.' };
  const { error: e2 } = await admin.from('mitglieder').insert({ firma_id: (firma as { id: string }).id, user_id: k.userId, rolle: 'inhaber' });
  if (e2) {
    await admin.from('firmen').delete().eq('id', (firma as { id: string }).id);
    return { fehler: 'Die Firma konnte nicht angelegt werden. Bitte nochmals versuchen.' };
  }
  redirect('/studio');
}
