/* ulba · lib/supabase/server.ts — Supabase für Server-Komponenten, Server-Actions
   und Route-Handler. Liest/schreibt die Sitzung über Cookies; Rechte kommen aus
   der Row Level Security der Datenbank (Trennung pro Firma). */
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Umgebungsvariable ${name} fehlt`);
  return v;
}

export function supabaseServer() {
  const store = cookies();
  return createServerClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
    cookies: {
      getAll() { return store.getAll(); },
      setAll(liste) {
        try { liste.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* in Server-Komponenten nicht erlaubt — die Middleware frischt die Sitzung auf */ }
      },
    },
  });
}

/* Nur für Server-Code, der bewusst an der RLS vorbei muss (Firma anlegen,
   Vorschlagsseite per Token). Niemals in Client-Code importieren. */
export function supabaseAdmin() {
  return createAdminClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* Zeitlich begrenzte Bild-Links aus dem privaten Speicher (Bucket teile). */
export async function bildLinks(pfade: (string | null | undefined)[], bucket: 'teile' | 'renders' = 'teile'): Promise<Map<string, string>> {
  const liste = Array.from(new Set(pfade.filter((p): p is string => !!p)));
  const out = new Map<string, string>();
  if (!liste.length) return out;
  const { data } = await supabaseServer().storage.from(bucket).createSignedUrls(liste, 3600);
  (data ?? []).forEach((d) => { if (d.path && d.signedUrl) out.set(d.path, d.signedUrl); });
  return out;
}

export type Firma ={ id: string; name: string; typ: string; domain: string | null; plan: string };
export type Kontext = { userId: string; email: string; firma: Firma | null; rolle: string | null };

/* Wer ist angemeldet und zu welcher Firma gehört er? null = nicht angemeldet. */
export async function ladeKontext(): Promise<Kontext | null> {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from('mitglieder')
    .select('rolle, firmen ( id, name, typ, domain, plan )')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  const zeile = data as { rolle: string; firmen: Firma | null } | null;
  return { userId: user.id, email: user.email ?? '', firma: zeile?.firmen ?? null, rolle: zeile?.rolle ?? null };
}
