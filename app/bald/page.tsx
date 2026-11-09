/* v86 — Teaser-Seite für ulba.ai, solange die App noch nicht offiziell live ist.
   Die Middleware schreibt im Teaser-Modus jede App-Adresse auf diese Seite um;
   Rechtsseiten bleiben erreichbar. Bewusst schlicht: ein Satz, kein Formular. */
import type { Metadata } from 'next';
import { RechtLinks } from '../../lib/rechtlich';

export const metadata: Metadata = {
  title: 'ulba.ai',
  description: 'Verpackungen und Lieferanten für Beauty-Marken finden.',
  robots: { index: false, follow: false },
};

export default function Bald() {
  return (
    <main className="bald">
      <div className="bald-mitte">
        <p className="bald-marke">ulba</p>
        <p className="bald-satz">Verpackungen und Lieferanten für Beauty-Marken finden.</p>
        <p className="bald-status">Bald verfügbar.</p>
      </div>
      <RechtLinks className="bald-recht" />
      <style>{`
        .bald { min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 16px 28px; background: #FFFFFF; }
        .bald-mitte { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 10px; }
        .bald-marke { font-weight: 800; font-size: 34px; letter-spacing: -.045em; line-height: 1; color: #1C1C1A; margin-bottom: 8px; }
        .bald-satz { font-size: 15px; color: #5D5D58; max-width: 30ch; }
        .bald-status { font-size: 13px; color: #8F8E89; }
        .bald-recht { font-size: 12.5px; color: #8F8E89; }
        .bald-recht a { color: inherit; text-decoration: none; }
        .bald-recht a:hover { color: #141413; }
      `}</style>
    </main>
  );
}
