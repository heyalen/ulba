import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ladeKontext } from '../../lib/supabase/server';
import { StartFormular } from './formular';
import '../studio/studio.css';

export const metadata: Metadata = { title: 'Firma anlegen · ulba', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Start() {
  const k = await ladeKontext();
  if (!k) redirect('/login');
  if (k.firma) redirect('/studio');
  return (
    <main className="st st-eingang">
      <span className="st-marke">ulba</span>
      <StartFormular email={k.email} />
    </main>
  );
}
