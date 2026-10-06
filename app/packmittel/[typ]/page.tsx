/* ══════════════════════════════════════════════════════════════════════
   ulba · app/packmittel/[typ]/page.tsx
   Kategorieseite pro Packmittel-Typ (z. B. /packmittel/airless).
   Fängt generische Suchen ab und verlinkt auf alle Teil-Seiten.
   ══════════════════════════════════════════════════════════════════════ */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { alleTypen, teileNachTyp, SITE_URL } from '../../../lib/teile';

export const revalidate = 3600;

export async function generateStaticParams() {
  try { return (await alleTypen()).map((t) => ({ typ: t.slug })); } catch { return []; }
}

export async function generateMetadata(
  { params }: { params: { typ: string } }
): Promise<Metadata> {
  const { typ } = params;
  const k = await teileNachTyp(typ);
  if (!k) return { title: 'Kategorie nicht gefunden | ulba' };
  const lieferanten = Array.from(new Set(k.teile.map((t) => t.supplier).filter(Boolean)));
  return {
    title: `${k.typ} für Kosmetik – ${k.teile.length} bestellbare Teile | ulba`,
    description: `${k.teile.length} ${k.typ}-Packmittel für Beauty & Kosmetik${lieferanten.length ? ` von ${lieferanten.slice(0, 3).join(', ')}` : ''}. Vergleichen, filtern und Muster direkt anfragen.`.slice(0, 158),
    alternates: { canonical: `${SITE_URL}/packmittel/${typ}` },
  };
}

export default async function KategorieSeite(
  { params }: { params: { typ: string } }
) {
  const { typ } = params;
  const k = await teileNachTyp(typ);
  if (!k) notFound();

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <Link href="/" style={{ color: '#888', textDecoration: 'none', fontSize: 14 }}>← ulba Suche</Link>
      <h1 style={{ fontSize: 30, margin: '20px 0 6px' }}>{k.typ} für Kosmetik</h1>
      <p style={{ color: '#666', margin: '0 0 32px' }}>{k.teile.length} bestellbare Teile — Muster direkt über ulba anfragen.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
        {k.teile.map((t) => (
          <Link key={t.id} href={`/teil/${t.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            {t.bild && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={t.bild} alt={t.name} loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#fafafa', borderRadius: 10 }} />
            )}
            <div style={{ marginTop: 8, fontSize: 15 }}>{t.name}</div>
            <div style={{ color: '#888', fontSize: 13 }}>{[t.material.join('/'), t.supplier].filter(Boolean).join(' · ')}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
