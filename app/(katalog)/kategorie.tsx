/* ulba · gemeinsamer Inhalt für Typ- und Kombi-Seiten (/packmittel/...). */
import type { Metadata } from 'next';
import { alleKategorien, kategorieTitel, kategoriePfad, SITE_URL, type Kategorie } from '@/lib/teile';
import { Rahmen, Raster, Pillen } from './ui';

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

  return (
    <Rahmen spur={k.filter ? [{ label: k.typ, href: `/packmittel/${k.typSlug}` }, { label: k.filter.wert }] : [{ label: k.typ }]}>
      <h1 className="ub-h1">{kategorieTitel(k)}</h1>
      <p className="ub-unter">
        {k.teile.length} bestellbare Teile{lieferanten.length ? ` von ${lieferanten.map(([, n]) => n).join(', ')}` : ''} — Muster direkt über ulba anfragen.
      </p>
      {geschwister.length > 0 && (
        <div className="ub-pillen" style={{ marginTop: 24 }}>
          {k.filter && <a href={`/packmittel/${k.typSlug}`} className="ub-pille">Alle {k.typ}</a>}
          {geschwister.map((x) => <a key={kategoriePfad(x)} href={kategoriePfad(x)} className="ub-pille">{kategorieTitel(x)}</a>)}
        </div>
      )}
      <div style={{ marginTop: 28 }}><Raster teile={k.teile} /></div>
      <Pillen titel="Lieferanten" links={lieferanten.map(([slug, name]) => ({ label: name, href: `/lieferant/${slug}` }))} />
      <Pillen titel="Andere Packmittel" links={andereTypen.map((x) => ({ label: x.typ, href: kategoriePfad(x) }))} />
    </Rahmen>
  );
}
