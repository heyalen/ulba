/* ulba · /registrieren — kostenloses Konto (Clerk), v79.6 nach Claude-
   Vorbild: grosse Display-Überschrift auf der Fläche, darunter die Karte
   im selben Grundton — Karten-Überschrift ausgeblendet (Appearance). */
import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';

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
      <div className="konto-mitte">
        <h1 className="konto-titel">Finde dein perfektes Packaging</h1>
        <p className="konto-sub">Kostenlos — unbegrenzt suchen, 5 Renders im Monat.</p>
        <SignUp />
        <a className="konto-zurueck" href="/">← Zurück zu ulba</a>
      </div>
    </main>
  );
}
