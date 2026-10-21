/* ulba · /anmelden — Anmeldung (Clerk), v78. Eigene ruhige Seite
   ausserhalb der App-Shell; nach der Anmeldung geht es zurueck zur Suche. */
import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';

export const metadata: Metadata = { title: 'Anmelden — ulba.ai' };

export default function AnmeldenSeite() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="konto-seite">
        <a className="konto-zurueck" href="/">← Zurück zu ulba</a>
        <p className="konto-hinweis">Die Anmeldung wird gerade eingerichtet — schau in Kürze wieder vorbei.</p>
      </main>
    );
  }
  return (
    <main className="konto-seite">
      <a className="konto-zurueck" href="/">← Zurück zu ulba</a>
      <SignIn />
    </main>
  );
}
