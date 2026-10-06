import type { MetadataRoute } from 'next';
import { alleTeile, alleKategorien, alleLieferanten, kategoriePfad, SITE_URL } from '../lib/teile';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [teile, kategorien, lieferanten] = await Promise.all([alleTeile(), alleKategorien(), alleLieferanten()]);
    return [
      { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
      ...kategorien.map((k) => ({ url: `${SITE_URL}${kategoriePfad(k)}`, changeFrequency: 'weekly' as const, priority: k.filter ? 0.8 : 0.9 })),
      ...lieferanten.map((l) => ({ url: `${SITE_URL}/lieferant/${l.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
      ...teile.map((t) => ({ url: `${SITE_URL}/teil/${t.slug}`, changeFrequency: 'weekly' as const, priority: t.nichtMehrImKatalog ? 0.3 : 0.7 })),
    ];
  } catch {
    return [{ url: SITE_URL, changeFrequency: 'daily', priority: 1 }];
  }
}
