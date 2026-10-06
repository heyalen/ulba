import type { MetadataRoute } from 'next';
import { alleTeile, alleTypen, SITE_URL } from '../lib/teile';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let teile: Awaited<ReturnType<typeof alleTeile>> = [];
  let typen: Awaited<ReturnType<typeof alleTypen>> = [];
  try { teile = await alleTeile(); typen = await alleTypen(); } catch { /* Sitemap ohne Teile statt Build-Fehler */ }
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    ...typen.map((k) => ({
      url: `${SITE_URL}/packmittel/${k.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...teile.map((t) => ({
      url: `${SITE_URL}/teil/${t.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
