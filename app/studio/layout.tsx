/* ulba · Studio — Arbeitsbereich der Lieferanten (neues ulba). */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { ladeKontext } from '../../lib/supabase/server';
import { StudioNav } from './nav';
import { ladeProjekte, aktivesProjektId } from '../../lib/projekt';
import './studio.css';

export const metadata: Metadata = { title: 'ulba Studio', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const k = await ladeKontext();
  if (!k) redirect('/login');
  if (!k.firma) redirect('/start');
  const projekte = await ladeProjekte();
  const aktivId = aktivesProjektId(projekte);
  return (
    <div className="st">
      <header className="st-kopf">
        <a className="st-marke" href="/studio">ulba</a>
        <span className="st-firma">{k.firma.name}</span>
        <form action="/auth/abmelden" method="post"><button className="st-abmelden" type="submit">Abmelden</button></form>
      </header>
      <div className="st-koerper">
        <StudioNav projekte={projekte} aktivId={aktivId} />
        <main className="st-inhalt">{children}</main>
      </div>
    </div>
  );
}
