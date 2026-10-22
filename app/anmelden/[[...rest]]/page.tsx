/* ulba · /anmelden — Anmeldung (Clerk), v79.6 nach Claude-Vorbild:
   grosse Display-Überschrift auf der Fläche, darunter die Karte im selben
   Grundton — die Karten-eigene Überschrift ist ausgeblendet (Appearance). */
import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';

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
      <div className="konto-mitte">
        <h1 className="konto-titel">Schön, dich wiederzusehen</h1>
        <p className="konto-sub">Dein Werkzeug für Beauty Packaging — suchen, vergleichen, rendern.</p>
        <SignIn />
        <a className="konto-zurueck" href="/">← Zurück zu ulba</a>
      </div>
    </main>
  );
}
