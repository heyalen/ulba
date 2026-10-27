/* v85 — Impressum & Datenschutz: Angaben zum Anbieter an EINER Stelle.
   Beide Seiten (/impressum, /datenschutz) lesen nur von hier. */
import type { ReactNode } from 'react';

export const ANBIETER = {
  name: 'ANBIETER_NAME',
  strasse: 'ANBIETER_STRASSE',
  ort: 'ANBIETER_PLZ_ORT',
  land: 'Schweiz',
  email: 'ANBIETER_EMAIL',
};

export const STAND = 'Oktober 2026';

export function RechtSeite({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <main className="recht">
      <a className="konto-marke" href="/">ulba</a>
      <article className="recht-inhalt">
        <h1>{titel}</h1>
        {children}
        <p className="recht-fuss">
          <a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a> · <a href="/">Zurück zu ulba</a>
        </p>
      </article>
    </main>
  );
}

export function Adresse() {
  return (
    <p>
      {ANBIETER.name}<br />
      {ANBIETER.strasse}<br />
      {ANBIETER.ort}<br />
      {ANBIETER.land}<br />
      E-Mail: <a href={`mailto:${ANBIETER.email}`}>{ANBIETER.email}</a>
    </p>
  );
}
