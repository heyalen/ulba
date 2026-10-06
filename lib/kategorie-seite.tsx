/* ulba · lib/kategorie-seite.tsx — gemeinsamer Inhalt für Typ- und Kombi-Seiten. */
import type { Metadata } from 'next';
import { alleKategorien, kategorieTitel, kategoriePfad, SITE_URL, type Kategorie } from './teile';
import { Seite, Raster, Chips, farbe } from './seo-ui';

export function kategorieMeta(k: Kategorie): Metadata {
  const titel = kategorieTitel(k);
  const lieferanten = Array.from(new Set(k.teile.map((t) => t.supplier).filter(Boolean)));
  return {
    title: `${titel} – ${k.teile.length} bestellbare Teile | ulba`,
    description: `${k.teile.length} × ${titel} für Beauty & Kosmetik${lieferanten.length ? ` von ${lieferanten.slice(0, 3).join(', ')}` : ''}. Vergleichen, filtern und Muster direkt anfragen.`.slice(0, 158),
    alternates: { canonical: `${SITE_URL}${kategoriePfad(k)}` },
  };
}

export async function KategorieInhalt({ k }: { k: Kategorie }) {
  const alle = await alleKategorien();
  const geschwister = alle.filter((x) => x.typSlug === k.typSlug && x.filter && x.filter.slug !== k.filter?.slug);
  const andereTypen = alle.filter((x) => !x.filter && x.typSlug !== k.typSlug);
  const lieferanten = Array.from(new Map(k.teile.filter((t) => t.supplierSlug).map((t) => [t.supplierSlug, t.supplier])));
  const titel = kategorieTitel(k);

  return (
    <Seite pfad={k.filter ? [{ label: k.typ, href: `/packmittel/${k.typSlug}` }, { label: k.filter.wert }] : [{ label: k.typ }]}>
      <h1 style={{ fontSize: 32, margin: '24px 0 6px' }}>{titel}</h1>
      <p style={{ color: farbe.grau, margin: '0 0 32px' }}>
        {k.teile.length} bestellbare Teile{lieferanten.length ? ` von ${lieferanten.map(([, n]) => n).join(', ')}` : ''} — Muster direkt über ulba anfragen.
      </p>
      <Raster teile={k.teile} />
      <Chips titel={`${k.typ} eingrenzen`} links={geschwister.map((x) => ({ label: kategorieTitel(x), href: kategoriePfad(x) }))} />
      <Chips titel="Lieferanten" links={lieferanten.map(([slug, name]) => ({ label: name, href: `/lieferant/${slug}` }))} />
      <Chips titel="Andere Packmittel" links={andereTypen.map((x) => ({ label: x.typ, href: kategoriePfad(x) }))} />
    </Seite>
  );
}
