/* ulba · app/(katalog)/layout.tsx — Rahmen aller Katalog-Seiten im ulba-Design.
   Die Routengruppe "(katalog)" ändert keine URL (/teil, /packmittel, /lieferant). */
import type { ReactNode } from 'react';
import './katalog.css';

export default function KatalogLayout({ children }: { children: ReactNode }) {
  return <div className="ub">{children}</div>;
}
