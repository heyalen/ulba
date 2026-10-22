/* ulba · /registrieren — kostenloses Konto (Clerk), v79.8 nach Claude-
   Vorbild: zweispaltig — links Wortmarke, grosse Überschrift, Karte;
   rechts das grosse Markenvisual. Alles auf einer Fläche (#FAFAFA). */
import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { KontoVisual } from '../../../lib/kontoVisual';

export const metadata: Metadata = { title: 'Kostenlos registrieren — ulba.ai' };

export default function RegistrierenSeite() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="konto-seite">
        <a className="konto-marke" href="/">ulba</a>
        <p className="konto-hinweis">Die Registrierung wird gerade eingerichtet — schau in Kürze wieder vorbei.</p>
      </main>
    );
  }
  return (
    <main className="konto-seite">
      <a className="konto-marke" href="/">ulba</a>
      <div className="konto-spalten">
        <div className="konto-links">
          <h1 className="konto-titel">Finde dein perfektes Packaging</h1>
          <p className="konto-sub">Kostenlos — unbegrenzt suchen, 5 Renders im Monat.</p>
          <SignUp />
          <a className="konto-zurueck" href="/">← Zurück zu ulba</a>
        </div>
        <div className="konto-visual" aria-hidden><KontoVisual /></div>
      </div>
    </main>
  );
}
