import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ladeKontext } from '../../lib/supabase/server';
import { RechtLinks } from '../../lib/rechtlich';
import { LoginFormular } from './formular';
import '../studio/studio.css';

export const metadata: Metadata = { title: 'Anmelden · ulba', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Login({ searchParams }: { searchParams: { fehler?: string } }) {
  const k = await ladeKontext();
  if (k) redirect(k.firma ? '/studio' : '/start');
  return (
    <main className="st st-eingang">
      <a className="st-marke" href="/login">ulba</a>
      <LoginFormular fehlerAusLink={searchParams.fehler === 'link'} />
      <RechtLinks className="st-recht" />
    </main>
  );
}
