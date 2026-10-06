/* ══════════════════════════════════════════════════════════════════════
   ulba · app/lieferant/[slug]/page.tsx — Lieferantenprofil (z. B. /lieferant/lumson).
   Fängt Suchen wie "Lumson Airless" ab; später die Seite, die der
   Lieferant über "Profil beanspruchen" übernimmt.
   ══════════════════════════════════════════════════════════════════════ */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { alleLieferanten, lieferantBySlug, alleKategorien, kategorieTitel, kategoriePfad, SITE_URL } from '../../../lib/teile';
import { Seite, Raster, Chips, farbe } from '../../../lib/seo-ui';

export const revalidate = 3600;

export async function generateStaticParams() {
  try { return (await alleLieferanten()).map((l) => ({ slug: l.slug })); } catch { return []; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const d = await lieferantBySlug(params.slug);
  if (!d) return { title: 'Lieferant nicht gefunden | ulba' };
  const typen = Array.from(new Set(d.teile.map((t) => t.type).filter(Boolean)));
  return {
    title: `${d.lieferant.name} – Kosmetikverpackungen${typen.length ? `: ${typen.slice(0, 3).join(', ')}` : ''} | ulba`,
    description: (d.lieferant.beschreibung ||
      `${d.teile.length} Packmittel von ${d.lieferant.name}${d.lieferant.land ? ` (${d.lieferant.land})` : ''}: ${typen.join(', ')}. Vergleichen und Muster direkt über ulba anfragen.`
    ).slice(0, 158),
    alternates: { canonical: `${SITE_URL}/lieferant/${d.lieferant.slug}` },
  };
}

export default async function LieferantSeite({ params }: { params: { slug: string } }) {
  const d = await lieferantBySlug(params.slug);
  if (!d) notFound();
  const { lieferant: l, teile } = d;
  const ids = new Set(teile.map((t) => t.id));
  const kategorien = (await alleKategorien()).filter((k) => !k.filter && k.teile.some((t) => ids.has(t.id)));

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: l.name, url: l.website || undefined, description: l.beschreibung || undefined,
    address: l.land ? { '@type': 'PostalAddress', addressCountry: l.land } : undefined,
  };

  return (
    <Seite pfad={[{ label: 'Lieferanten' }, { label: l.name }]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 style={{ fontSize: 32, margin: '24px 0 6px' }}>{l.name}</h1>
      <p style={{ color: farbe.grau, margin: '0 0 8px' }}>
        {[l.land, `${teile.length} Packmittel auf ulba`].filter(Boolean).join(' · ')}
      </p>
      {l.beschreibung && <p style={{ maxWidth: 680, lineHeight: 1.6 }}>{l.beschreibung}</p>}
      {l.website && (
        <p style={{ margin: '0 0 32px' }}>
          <a href={l.website} rel="nofollow noopener" target="_blank" style={{ color: farbe.tinte }}>Website des Lieferanten ↗</a>
        </p>
      )}
      <div style={{ marginTop: 24 }}><Raster teile={teile} /></div>
      <Chips titel="Sortiment nach Packmittel" links={kategorien.map((k) => ({ label: kategorieTitel(k), href: kategoriePfad(k) }))} />
    </Seite>
  );
}
