/* v85 — Impressum, Datenschutz, AGB: Angaben zum Anbieter an EINER Stelle.
   Alle Rechtsseiten und Fusszeilen lesen nur von hier.
   OFFEN: Platzhalter in [eckigen Klammern] vor dem Go-live ersetzen. */
import type { ReactNode } from 'react';

export const ANBIETER = {
  name: '[Name der Inhaberin]',
  zusatz: 'ulba.ai',
  strasse: '[Strasse und Hausnummer]',
  ort: '[PLZ Ort]',
  land: 'Deutschland',
  email: '[kontakt@ulba.ai]',
  ustId: '[USt-IdNr., falls vorhanden]',
};

export const STAND = 'Oktober 2026';

/* Einheitliche Rechts-Links für jede Fusszeile. */
export function RechtLinks({ className }: { className?: string }) {
  return (
    <p className={className}>
      <a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a> · <a href="/agb">AGB</a>
    </p>
  );
}

export function RechtSeite({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <main className="recht">
      <a className="konto-marke" href="/">ulba</a>
      <article className="recht-inhalt">
        <h1>{titel}</h1>
        {children}
        <div className="recht-fuss">
          <RechtLinks />
          <a href="/">← Zurück zu ulba</a>
        </div>
      </article>
    </main>
  );
}

export function Adresse() {
  return (
    <p>
      {ANBIETER.name}<br />
      {ANBIETER.zusatz}<br />
      {ANBIETER.strasse}<br />
      {ANBIETER.ort}<br />
      {ANBIETER.land}<br />
      E-Mail: <a href={`mailto:${ANBIETER.email}`}>{ANBIETER.email}</a>
    </p>
  );
}
