/* ulba · middleware.ts — Clerk-Handschlag (v78) + Teaser-Modus (v86).
   Clerk nur aktiv, wenn beide Clerk-Schluessel in der Umgebung stehen.

   Teaser-Modus (v86): Auf ulba.ai / www.ulba.ai zeigt jede App-Adresse die
   Seite /bald. Erreichbar bleiben /bald, Rechtsseiten und /api.
   - Abschalten: Vercel-Umgebungsvariable ULBA_TEASER=0 setzen.
   - Vorschau für Alen: ULBA_VORSCHAU_KEY in Vercel setzen, dann einmal
     https://ulba.ai/?vorschau=<KEY> öffnen → Cookie für 180 Tage, volle App. */
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

const aktiv = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

const TEASER_HOSTS = ['ulba.ai', 'www.ulba.ai'];
const OFFEN = ['/bald', '/impressum', '/datenschutz', '/agb', '/api'];
const COOKIE = 'ulba_vorschau';

function teaser(req: NextRequest): NextResponse | undefined {
  if (process.env.ULBA_TEASER === '0') return undefined;
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0];
  if (!TEASER_HOSTS.includes(host)) return undefined;

  const pfad = req.nextUrl.pathname;
  if (OFFEN.some((p) => pfad === p || pfad.startsWith(p + '/'))) return undefined;

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

export default aktiv
  ? clerkMiddleware((_auth, req) => teaser(req))
  : function durchlass(req: NextRequest) { return teaser(req) ?? NextResponse.next(); };

export const config = {
  matcher: [
    // Alles ausser Next-Interna und statischen Dateien.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
