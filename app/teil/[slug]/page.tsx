/* ══════════════════════════════════════════════════════════════════════
   ulba · app/teil/[slug]/page.tsx
   Indexierbare Seite pro Packmittel. Server Component + ISR (1 h).
   Google sieht: Titel, Beschreibung, Bild, schema.org Product.
   ══════════════════════════════════════════════════════════════════════ */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { teilBySlug, alleTeile, SITE_URL } from '../../../lib/teile';

export const revalidate = 3600; // ISR: stündlich neu

/* Beim Build alle bekannten Slugs vorab erzeugen; neue Teile kommen
   per ISR on-demand dazu (dynamicParams default = true). */
export async function generateStaticParams() {
  try {
    const teile = await alleTeile();
    return teile.map((t) => ({ slug: t.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const { slug } = params;
  const t = await teilBySlug(slug);
  if (!t) return { title: 'Teil nicht gefunden | ulba' };
  const teileText = [t.type, t.material.join('/'), t.sizes.length ? t.sizes.join(', ') : '']
    .filter(Boolean).join(' · ');
  const desc = (t.beschreibung ||
    `${t.name}: ${teileText}. Bestellbares Beauty-Packaging${t.supplier ? ` von ${t.supplier}` : ''} — Muster direkt über ulba anfragen.`
  ).slice(0, 158);
  return {
    title: `${t.name}${t.supplier ? ` – ${t.supplier}` : ''} | ulba`,
    description: desc,
    alternates: { canonical: `${SITE_URL}/teil/${t.slug}` },
    openGraph: {
      title: t.name,
      description: desc,
      images: t.bild ? [t.bild] : [],
      type: 'website',
    },
  };
}

export default async function TeilSeite(
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const t = await teilBySlug(slug);
  if (!t) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: t.name,
    description: t.beschreibung || undefined,
    image: t.bild || undefined,
    material: t.material.join(', ') || undefined,
    brand: t.supplier ? { '@type': 'Brand', name: t.supplier } : undefined,
    url: `${SITE_URL}/teil/${t.slug}`,
  };

  const zeile = (label: string, wert: string) =>
    wert ? (
      <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #eee' }}>
        <span style={{ width: 160, color: '#888', flexShrink: 0 }}>{label}</span>
        <span>{wert}</span>
      </div>
    ) : null;

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/" style={{ color: '#888', textDecoration: 'none', fontSize: 14 }}>← ulba Suche</Link>

      <div style={{ display: 'flex', gap: 40, marginTop: 24, flexWrap: 'wrap' }}>
        {t.bild && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={t.bild} alt={t.name} style={{ width: 280, height: 280, objectFit: 'contain', background: '#fafafa', borderRadius: 12 }} />
        )}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ fontSize: 28, margin: '0 0 4px' }}>{t.name}</h1>
          {t.supplier && <p style={{ color: '#666', margin: '0 0 20px' }}>von {t.supplier}</p>}

          {zeile('Typ', t.type)}
          {zeile('Material', t.material.join(', '))}
          {zeile('Form', t.form.join(', '))}
          {zeile('Verschluss', t.closure)}
          {zeile('Verfügbare Größen', t.sizes.join(', '))}
          {zeile('Verfügbare Materialien', t.materialsAvailable.join(', '))}

          {t.beschreibung && <p style={{ marginTop: 20, lineHeight: 1.6 }}>{t.beschreibung}</p>}

          <Link
            href={`/?teil=${t.id}`}
            style={{ display: 'inline-block', marginTop: 28, padding: '12px 24px', background: '#111', color: '#fff', borderRadius: 8, textDecoration: 'none' }}
          >
            In ulba öffnen · Muster anfragen
          </Link>
        </div>
      </div>
    </main>
  );
}
