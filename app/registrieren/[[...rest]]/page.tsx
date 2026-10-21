/* ulba · /registrieren — kostenloses Konto (Clerk), v78. Eigene ruhige
   Seite ausserhalb der App-Shell; danach geht es zurueck zur Suche. */
import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';

export const metadata: Metadata = { title: 'Kostenlos registrieren — ulba.ai' };

export default function RegistrierenSeite() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="konto-seite">
        <a className="konto-zurueck" href="/">← Zurück zu ulba</a>
        <p className="konto-hinweis">Die Registrierung wird gerade eingerichtet — schau in Kürze wieder vorbei.</p>
      </main>
    );
  }
  return (
    <main className="konto-seite">
      <a className="konto-zurueck" href="/">← Zurück zu ulba</a>
      <SignUp />
    </main>
  );
}
