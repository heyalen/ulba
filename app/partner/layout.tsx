/* ulba · app/partner/layout.tsx — Lieferanten-Portal (v81).
   Bewusst eine andere Maske als die Suche: ruhiges Cockpit mit Kopfzeile,
   linker Navigation und weissen Karten auf ulbas Fläche. */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { UserButton } from '@clerk/nextjs';
import { PartnerNav } from './nav';
import { ladeKontext, CLERK_AKTIV } from './_kontext';
import { RechtLinks } from '../../lib/rechtlich';
import './partner.css';

export const metadata: Metadata = {
  title: 'ulba Partner — Lieferanten-Portal',
  description: 'Profil pflegen, Teile sehen, Musteranfragen beantworten.',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function PartnerLayout({ children }: { children: ReactNode }) {
  const k = await ladeKontext();
  const drin = !!k.userId;
  return (
    <div className="pa">
      <header className="pa-kopf">
        <a className="pa-marke" href="/partner">ulba <span>Partner</span></a>
        <div className="pa-kopf-rechts">
          <a className="pa-link" href="/" target="_blank" rel="noopener">Zur Suche ↗</a>
          {drin && CLERK_AKTIV && <UserButton afterSignOutUrl="/partner" />}
        </div>
      </header>
      <div className="pa-koerper">
        {drin && k.lieferant && (
          <aside className="pa-seite">
            <div className="pa-firma">
              <div className="pa-firma-logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {k.lieferant.logoUrl ? <img src={`/api/bild?r=${k.lieferant.id}`} alt="" /> : <span>{k.lieferant.name.charAt(0)}</span>}
              </div>
              <div>
                <b>{k.lieferant.name}</b>
                <small>{k.lieferant.freigegeben ? 'Profil bestätigt' : 'Wird geprüft'}</small>
              </div>
            </div>
            <PartnerNav anfragen={k.lieferant.anfrageIds.length} teile={k.lieferant.systemIds.length} />
          </aside>
        )}
        <main className="pa-inhalt">{children}</main>
      </div>
      <footer className="pa-fuss"><RechtLinks /></footer>
    </div>
  );
}
