/* ulba · middleware.ts — Teaser-Modus (v86) + Supabase-Sitzung (neues ulba) + Clerk (altes ulba).

   Teaser-Modus: Auf ulba.ai / www.ulba.ai zeigt jede App-Adresse die Seite /bald.
   Erreichbar bleiben /bald, Rechtsseiten, /api und /auth (E-Mail-Link-Rückkehr).
   - Abschalten: Vercel-Umgebungsvariable ULBA_TEASER=0 setzen.
   - Vorschau für Alen: ULBA_VORSCHAU_KEY in Vercel setzen, dann einmal
     https://ulba.ai/?vorschau=<KEY> öffnen → Cookie für 180 Tage, volle App.

   Supabase: Für die Bereiche des neuen ulba (/login, /auth, /start, /studio)
   wird die Anmelde-Sitzung bei jedem Aufruf aufgefrischt.
   Clerk: bleibt nur für die alten Seiten aktiv, bis sie entfernt sind. */
import { clerkMiddleware } from '@clerk/nextjs/server';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const CLERK = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const TEASER_HOSTS = ['ulba.ai', 'www.ulba.ai'];
const OFFEN = ['/bald', '/impressum', '/datenschutz', '/agb', '/api', '/auth', '/v'];  // /v = Vorschlagsseite für Marken (per Token)
const NEU = ['/login', '/auth', '/start', '/studio'];
const COOKIE = 'ulba_vorschau';

const passt = (pfad: string, liste: string[]) => liste.some((p) => pfad === p || pfad.startsWith(p + '/'));

function teaser(req: NextRequest): NextResponse | undefined {
  if (process.env.ULBA_TEASER === '0') return undefined;
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0];
  if (!TEASER_HOSTS.includes(host)) return undefined;
  if (passt(req.nextUrl.pathname, OFFEN)) return undefined;

  const key = process.env.ULBA_VORSCHAU_KEY;
  if (key) {
    if (req.nextUrl.searchParams.get('vorschau') === key) {
      const ziel = req.nextUrl.clone();
      ziel.searchParams.delete('vorschau');
      const res = NextResponse.redirect(ziel);
      res.cookies.set(COOKIE, key, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 180, path: '/' });
      return res;
    }
    if (req.cookies.get(COOKIE)?.value === key) return undefined;
  }

  const ziel = req.nextUrl.clone();
  ziel.pathname = '/bald';
  ziel.search = '';
  return NextResponse.rewrite(ziel);
}

async function supabaseSitzung(req: NextRequest): Promise<NextResponse> {
  let res = NextResponse.next({ request: req });
  if (!SB_URL || !SB_KEY) return res;
  const sb = createServerClient(SB_URL, SB_KEY, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(liste) {
        liste.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        liste.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  await sb.auth.getUser();
  return res;
}

async function ablauf(req: NextRequest): Promise<NextResponse | undefined> {
  const t = teaser(req);
  if (t) return t;
  if (passt(req.nextUrl.pathname, NEU)) return supabaseSitzung(req);
  return undefined;
}

export default CLERK
  ? clerkMiddleware((_auth, req) => ablauf(req))
  : async function ohneClerk(req: NextRequest) { return (await ablauf(req)) ?? NextResponse.next(); };

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
