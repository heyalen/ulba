/* ══════════════════════════════════════════════════════════════════════
   ulba · /teil/[slug] — indexierbare Seite pro Packmittel (ISR 1 h).
   Aufbau wie das DetailPanel der App: Bühne mit Verschluss-Wahl links,
   Fakten + Lieferant rechts, darunter Kategorien und ähnliche Teile.
   ══════════════════════════════════════════════════════════════════════ */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { teilBySlug, alleTeile, aehnlicheTeile, alleKategorien, alleLieferanten, kategorieTitel, kategoriePfad, slugify, SITE_URL } from '@/lib/teile';
import { Rahmen, Raster, Pillen, specText } from '../../ui';
import { Buehne } from './buehne';

export const revalidate = 3600;

export async function generateStaticParams() {
  try { return (await alleTeile()).map((t) => ({ slug: t.slug })); } catch { return []; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const t = await teilBySlug(params.slug);
  if (!t) return { title: 'Teil nicht gefunden | ulba' };
  const desc = (t.beschreibung ||
    `${t.name}: ${specText(t)}. Bestellbares Beauty-Packaging${t.supplier ? ` von ${t.supplier}` : ''} — Muster direkt über ulba anfragen.`
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
  const [aehnlich, kategorien, lieferanten] = await Promise.all([aehnlicheTeile(t), alleKategorien(), alleLieferanten()]);
  const passend = kategorien.filter((k) => k.teile.some((x) => x.id === t.id));
  const lief = lieferanten.find((l) => l.slug === t.supplierSlug);

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: t.name, description: t.beschreibung || undefined, image: t.bild || undefined,
    category: t.type || undefined, material: t.material.join(', ') || undefined,
    brand: t.supplier ? { '@type': 'Brand', name: t.supplier } : undefined,
    url: `${SITE_URL}/teil/${t.slug}`,
  };

  const fakten: [string, string][] = ([
    ['Typ', t.type], ['Material', t.material.join(', ')], ['Form', t.form.join(', ')],
    ['Verschlussart', t.closure], ['Halsmaß', t.hals.join(', ')], ['Größen', t.sizes.join(', ')],
    ['Materialvarianten', t.materialsAvailable.join(', ')], ['Veredelung', t.faehigkeiten.join(', ')],
  ] as [string, string][]).filter(([, v]) => v);

  return (
    <Rahmen spur={[...(t.type ? [{ label: t.type, href: `/packmittel/${slugify(t.type)}` }] : []), { label: t.name }]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Buehne teilId={t.id} name={t.name} caps={t.caps.map((c) => ({ id: c.id, art: c.art }))}>
        <h1 className="ub-h1">{t.name}</h1>
        <div className="ub-spec">{specText(t)}</div>

        {t.nichtMehrImKatalog && (
          <div className="ub-hinweis">Nicht mehr im Katalog des Lieferanten — ähnliche, verfügbare Teile findest du unten.</div>
        )}

        {lief && (
          <Link href={`/lieferant/${lief.slug}`} className="ub-lief">
            <span className="ub-lief-av">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {lief.hatLogo ? <img src={`/api/bild?r=${lief.id}`} alt={lief.name} /> : lief.name.charAt(0)}
            </span>
            <span>
              <b>{lief.name}</b>
              <span>{[lief.standort, lief.land].filter(Boolean).join(', ') || 'Lieferant'}</span>
            </span>
            <em>Profil →</em>
          </Link>
        )}

        {fakten.length > 0 && (
          <div className="ub-fakten">
            {fakten.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
          </div>
        )}

        {t.beschreibung && <p className="ub-text">{t.beschreibung}</p>}
      </Buehne>

      <Pillen titel="In diesen Kategorien" links={passend.map((k) => ({ label: kategorieTitel(k), href: kategoriePfad(k) }))} />

      {aehnlich.length > 0 && (
        <section className="ub-sektion">
          <span className="ub-lbl">Ähnliche Teile</span>
          <Raster teile={aehnlich} />
        </section>
      )}
    </Rahmen>
  );
}
