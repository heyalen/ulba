/* ulba · app/packmittel/[typ]/page.tsx — Kategorieseite pro Packmittel-Typ (z. B. /packmittel/tiegel). */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { alleKategorien, kategorie } from '@/lib/teile';
import { KategorieInhalt, kategorieMeta } from '@/app/_katalog/kategorie';

export const revalidate = 3600;

export async function generateStaticParams() {
  try { return (await alleKategorien()).filter((k) => !k.filter).map((k) => ({ typ: k.typSlug })); } catch { return []; }
}

export async function generateMetadata({ params }: { params: { typ: string } }): Promise<Metadata> {
  const k = await kategorie(params.typ);
  return k ? kategorieMeta(k) : { title: 'Kategorie nicht gefunden | ulba' };
}

export default async function TypSeite({ params }: { params: { typ: string } }) {
  const k = await kategorie(params.typ);
  if (!k) notFound();
  return <KategorieInhalt k={k} />;
}
