/* ══════════════════════════════════════════════════════════════════════
   ulba · app/teil/[slug]/page.tsx
   Indexierbare Seite pro Packmittel (Server Component, ISR 1 h).
   Zeigt Teil + alle passenden Verschlüsse + Lieferant + ähnliche Teile.
   ══════════════════════════════════════════════════════════════════════ */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { teilBySlug, alleTeile, aehnlicheTeile, alleKategorien, kategorieTitel, kategoriePfad, slugify, SITE_URL } from '../../../lib/teile';
import { Seite, Raster, Chips, farbe } from '../../../lib/seo-ui';

export const revalidate = 3600;

export async function generateStaticParams() {
  try { return (await alleTeile()).map((t) => ({ slug: t.slug })); } catch { return []; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const t = await teilBySlug(params.slug);
  if (!t) return { title: 'Teil nicht gefunden | ulba' };
  const fakten = [t.type, t.material.join('/'), t.sizes.join(', ')].filter(Boolean).join(' · ');
  const desc = (t.beschreibung ||
    `${t.name}: ${fakten}. Bestellbares Beauty-Packaging${t.supplier ? ` von ${t.supplier}` : ''} — Muster direkt über ulba anfragen.`
  ).slice(0, 158);
  return {
    title: `${t.name}${t.type ? ` ${t.type}` : ''}${t.supplier ? ` – ${t.supplier}` : ''} | ulba`,
    description: desc,
    alternates: { canonical: `${SITE_URL}/teil/${t.slug}` },
    openGraph: { title: t.name, description: desc, images: t.bild ? [t.bild] : [], type: 'website' },
  };
}

export default async function TeilSeite({ params }: { params: { slug: string } }) {
  const t = await teilBySlug(params.slug);
  if (!t) notFound();
  const [aehnlich, kategorien] = await Promise.all([aehnlicheTeile(t), alleKategorien()]);
  const passend = kategorien.filter((k) => k.teile.some((x) => x.id === t.id));
  const typSlug = slugify(t.type);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: t.name,
    description: t.beschreibung || undefined,
    image: t.bild || undefined,
    category: t.type || undefined,
    material: t.material.join(', ') || undefined,
    brand: t.supplier ? { '@type': 'Brand', name: t.supplier } : undefined,
    url: `${SITE_URL}/teil/${t.slug}`,
  };

  const zeile = (label: string, wert: ReactNodeOrString) =>
    wert ? (
      <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: `1px solid ${farbe.linie}` }}>
        <span style={{ width: 170, color: farbe.hell, flexShrink: 0 }}>{label}</span>
        <span>{wert}</span>
      </div>
    ) : null;

  return (
    <Seite pfad={[...(t.type ? [{ label: t.type, href: `/packmittel/${typSlug}` }] : []), { label: t.name }]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ display: 'flex', gap: 40, marginTop: 24, flexWrap: 'wrap' }}>
        {t.bild && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={`/api/bild?r=${t.id}`} alt={`${t.name}${t.supplier ? ` von ${t.supplier}` : ''}`} style={{ width: 300, maxWidth: '100%', aspectRatio: '1', objectFit: 'contain', background: farbe.nische, borderRadius: 14 }} />
        )}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ fontSize: 30, margin: '0 0 4px' }}>{t.name}</h1>
          {t.supplier && (
            <p style={{ margin: '0 0 20px', color: farbe.grau }}>
              von <Link href={`/lieferant/${t.supplierSlug}`} style={{ color: farbe.tinte }}>{t.supplier}</Link>
            </p>
          )}
          {t.nichtMehrImKatalog && (
            <p style={{ padding: '10px 14px', background: farbe.nische, borderRadius: 10, fontSize: 14 }}>
              Dieses Teil ist nicht mehr im Katalog des Lieferanten. Ähnliche, verfügbare Teile findest du unten.
            </p>
          )}

          {zeile('Typ', t.type)}
          {zeile('Material', t.material.join(', '))}
          {zeile('Form', t.form.join(', '))}
          {zeile('Verschlussart', t.closure)}
          {zeile('Halsmaß', t.hals.join(', '))}
          {zeile('Verfügbare Größen', t.sizes.join(', '))}
          {zeile('Verfügbare Materialien', t.materialsAvailable.join(', '))}
          {zeile('Veredelung', t.faehigkeiten.join(', '))}

          {t.beschreibung && <p style={{ marginTop: 20, lineHeight: 1.6 }}>{t.beschreibung}</p>}

          <Link href={`/?teil=${t.id}`} style={{ display: 'inline-block', marginTop: 28, padding: '13px 24px', background: farbe.tinte, color: '#fff', borderRadius: 10, textDecoration: 'none' }}>
            In ulba ansehen · Muster anfragen
          </Link>
        </div>
      </div>

      {t.caps.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 6px' }}>Passende Verschlüsse ({t.caps.length})</h2>
          <p style={{ margin: '0 0 16px', color: farbe.grau, fontSize: 14 }}>Antippen, um das Teil mit diesem Verschluss in ulba zu sehen.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 14 }}>
            {t.caps.map((c) => (
              <Link key={c.id} href={`/?teil=${t.id}&cap=${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                {c.bild
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={`/api/bild?r=${c.id}`} alt={`${c.art || 'Verschluss'} für ${t.name}`} loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: farbe.nische, borderRadius: 10 }} />
                  : <div style={{ width: '100%', aspectRatio: '1', background: farbe.nische, borderRadius: 10 }} />}
                <div style={{ marginTop: 6, fontSize: 13 }}>{c.art || 'Verschluss'}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Chips titel="In diesen Kategorien" links={passend.map((k) => ({ label: kategorieTitel(k), href: kategoriePfad(k) }))} />

      {aehnlich.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>Ähnliche Teile</h2>
          <Raster teile={aehnlich} />
        </section>
      )}
    </Seite>
  );
}

type ReactNodeOrString = string | null | undefined;
