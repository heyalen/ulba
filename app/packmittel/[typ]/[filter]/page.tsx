/* ulba · app/packmittel/[typ]/[filter]/page.tsx — Kombi-Seite, z. B. /packmittel/flasche/glas oder /packmittel/flasche/30ml. */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { alleKategorien, kategorie } from '../../../../lib/teile';
import { KategorieInhalt, kategorieMeta } from '../../../../lib/kategorie-seite';

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    return (await alleKategorien()).filter((k) => k.filter).map((k) => ({ typ: k.typSlug, filter: k.filter!.slug }));
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: { typ: string; filter: string } }): Promise<Metadata> {
  const k = await kategorie(params.typ, params.filter);
  return k ? kategorieMeta(k) : { title: 'Kategorie nicht gefunden | ulba' };
}

export default async function KombiSeite({ params }: { params: { typ: string; filter: string } }) {
  const k = await kategorie(params.typ, params.filter);
  if (!k) notFound();
  return <KategorieInhalt k={k} />;
}
