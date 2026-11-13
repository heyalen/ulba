/* ulba · Studio — Arbeitsbereich der Lieferanten (neues ulba). */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { ladeKontext } from '../../lib/supabase/server';
import { StudioNav } from './nav';
import { ladeProjekte } from '../../lib/projekt';
import './studio.css';

export const metadata: Metadata = { title: 'ulba Studio', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const k = await ladeKontext();
  if (!k) redirect('/login');
  if (!k.firma) redirect('/start');
  const projekte = await ladeProjekte();
  return (
    <div className="st st-app">
      <StudioNav projekte={projekte} firma={k.firma.name} />
      <main className="st-inhalt">{children}</main>
    </div>
  );
}
