'use server';
/* ulba · Login per E-Mail-Link (Supabase Auth, ohne Passwort). */
import { headers } from 'next/headers';
import { supabaseServer } from '../../lib/supabase/server';

export type LoginStatus = { ok: boolean; fehler?: string; email?: string };

function herkunft(): string {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'ulba.ai';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

export async function linkSenden(_vorher: LoginStatus, form: FormData): Promise<LoginStatus> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, fehler: 'Bitte eine gültige E-Mail-Adresse eingeben.' };
  const { error } = await supabaseServer().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${herkunft()}/auth/callback?next=/studio`, shouldCreateUser: true },
  });
  if (error) {
    const zuViele = error.status === 429 || /rate/i.test(error.message);
    return { ok: false, fehler: zuViele ? 'Zu viele Versuche. Bitte in ein paar Minuten nochmals.' : 'Der Link konnte nicht gesendet werden. Bitte nochmals versuchen.' };
  }
  return { ok: true, email };
}
