/* ulba · middleware.ts — Clerk-Handschlag (v78).
   Nur aktiv, wenn beide Clerk-Schluessel in der Umgebung stehen — ohne sie
   laeuft jede Anfrage unveraendert durch (Deploy-sicher vor dem Setup). */
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const aktiv = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

export default aktiv ? clerkMiddleware() : function durchlass() { return NextResponse.next(); };

export const config = {
  matcher: [
    // Alles ausser Next-Interna und statischen Dateien.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
