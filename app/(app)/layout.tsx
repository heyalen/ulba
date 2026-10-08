/* ulba · app/(app)/layout.tsx — die App bleibt über alle Seiten am Leben.
   /, /teil/…, /lieferant/…, /packmittel/… liefern nur ihren Inhalt hinein;
   Navigation, Projekte und Favoriten bleiben dabei stehen. */
import type { ReactNode } from 'react';
import { UlbaShell } from '../_ulba/app';
import '../_katalog/katalog.css';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <UlbaShell>{children}</UlbaShell>;
}
