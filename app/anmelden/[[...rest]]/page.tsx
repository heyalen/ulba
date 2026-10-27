/* ulba · /anmelden — Anmeldung (Clerk), v79.8 nach Claude-Vorbild:
   zweispaltig — links Wortmarke, grosse Überschrift, Karte; rechts das
   grosse Markenvisual. Alles auf einer Fläche (#FAFAFA). */
import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import { RechtLinks } from '../../../lib/rechtlich';
import { KontoVideo } from '../../../lib/kontoVideo';

export const metadata: Metadata = { title: 'Anmelden — ulba.ai' };

export default function AnmeldenSeite() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="konto-seite">
        <a className="konto-marke" href="/">ulba</a>
        <p className="konto-hinweis">Die Anmeldung wird gerade eingerichtet — schau in Kürze wieder vorbei.</p>
      </main>
    );
  }
  return (
    <main className="konto-seite">
      <a className="konto-marke" href="/">ulba</a>
      <div className="konto-spalten">
        <div className="konto-links">
          <h1 className="konto-titel">Schön, dich wiederzusehen</h1>
          <p className="konto-sub">Dein Sourcing-Partner für Beauty-Packaging</p>
          <SignIn />
          <RechtLinks className="konto-recht" />
        </div>
        <div className="konto-visual"><KontoVideo /></div>
      </div>
    </main>
  );
}
