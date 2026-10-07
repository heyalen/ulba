/* ══════════════════════════════════════════════════════════════════════
   ulba · /lieferant/[slug] — Lieferantenprofil, gleich aufgebaut wie das
   Profil in der App (Titelband, Logo, Fakten, Reiter nach Packmittel-Typ).
   Später die Seite, die der Lieferant über "Profil beanspruchen" übernimmt.
   ══════════════════════════════════════════════════════════════════════ */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { alleLieferanten, lieferantBySlug, SITE_URL } from '@/lib/teile';
import { Rahmen, Raster, bildVon } from '../../ui';
import { Reiter } from './reiter';

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

  const zaehler = new Map<string, number>();
  teile.forEach((t) => t.type && zaehler.set(t.type, (zaehler.get(t.type) || 0) + 1));
  const typen = [{ typ: 'Alle', n: teile.length }, ...Array.from(zaehler, ([typ, n]) => ({ typ, n })).sort((a, b) => a.typ.localeCompare(b.typ))];
  const kinder: Record<string, JSX.Element> = { Alle: <Raster teile={teile} /> };
  zaehler.forEach((_, typ) => { kinder[typ] = <Raster teile={teile.filter((t) => t.type === typ)} />; });

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: l.name, url: l.website || undefined, description: l.beschreibung || undefined,
    address: l.land ? { '@type': 'PostalAddress', addressCountry: l.land, addressLocality: l.standort || undefined } : undefined,
  };

  return (
    <Rahmen spur={[{ label: 'Lieferanten' }, { label: l.name }]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="ub-lp-titel" aria-hidden="true">
        <div className="ub-lp-reihe">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {teile.slice(0, 7).map((t) => <img key={t.id} src={bildVon(t.id)} alt="" loading="lazy" />)}
        </div>
      </div>
      <div className="ub-lp-kopf">
        <div className="ub-lp-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {l.hatLogo ? <img src={bildVon(l.id)} alt={`${l.name} Logo`} /> : <span>{l.name.charAt(0)}</span>}
        </div>
        <div className="ub-lp-id">
          <h1 className="ub-h1">{l.name}</h1>
          <span className="ub-lp-meta">{[[l.standort, l.land].filter(Boolean).join(', '), `${teile.length} Teile auf ulba`].filter(Boolean).join(' · ')}</span>
        </div>
        {l.website && <a className="ub-lp-web" href={l.website} rel="nofollow noopener" target="_blank">Website ↗</a>}
      </div>
      {l.beschreibung && <p className="ub-text" style={{ padding: '0 28px' }}>{l.beschreibung}</p>}
      <Reiter typen={typen} kinder={kinder} />
    </Rahmen>
  );
}
