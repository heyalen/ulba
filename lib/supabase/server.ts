import { cache } from 'react';
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
const LINK_CACHE = new Map<string, { url: string; bis: number }>();
export async function bildLinks(pfade: (string | null | undefined)[], bucket: 'teile' | 'renders' | 'welten' = 'teile'): Promise<Map<string, string>> {
  const liste = Array.from(new Set(pfade.filter((p): p is string => !!p)));
  const out = new Map<string, string>();
  const jetzt = Date.now();
  // Gleiche URL wiederverwenden, solange sie noch > 1 h gilt → der Browser cached die Bilder
  const offen = liste.filter((p) => { const c = LINK_CACHE.get(`${bucket}/${p}`); if (c && c.bis - jetzt > 3_600_000) { out.set(p, c.url); return false; } return true; });
  if (!offen.length) return out;
  const { data } = await supabaseServer().storage.from(bucket).createSignedUrls(offen, 6 * 3600);
  (data ?? []).forEach((d) => { if (d.path && d.signedUrl) { out.set(d.path, d.signedUrl); LINK_CACHE.set(`${bucket}/${d.path}`, { url: d.signedUrl, bis: jetzt + 6 * 3_600_000 }); } });
  if (LINK_CACHE.size > 5000) LINK_CACHE.clear();
  return out;
}

export type Firma ={ id: string; name: string; typ: string; domain: string | null; plan: string };
export type Kontext = { userId: string; email: string; firma: Firma | null; rolle: string | null };

/* Wer ist angemeldet und zu welcher Firma gehört er? null = nicht angemeldet. */
export const ladeKontext = cache(async (): Promise<Kontext | null> => {
  const sb = supabaseServer();
  // Token lokal prüfen (Middleware hat es bereits aufgefrischt) — kein Extra-Aufruf an Supabase Auth
  const { data: c } = await sb.auth.getClaims();
  const claims = c?.claims as { sub?: string; email?: string } | undefined;
  if (!claims?.sub) return null;
  const user = { id: claims.sub, email: claims.email };
  const { data } = await sb
    .from('mitglieder')
    .select('rolle, firmen ( id, name, typ, domain, plan )')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  const zeile = data as { rolle: string; firmen: Firma | null } | null;
  return { userId: user.id, email: user.email ?? '', firma: zeile?.firmen ?? null, rolle: zeile?.rolle ?? null };
});
