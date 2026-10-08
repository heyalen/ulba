/* ulba · lib/slug.ts — reine Slug-Funktionen, nutzbar in Server UND Client
   (lib/teile.ts spricht mit Airtable und gehört nicht ins Browser-Bundle). */
export function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // é → e, à → a
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* Slug: lesbarer Name + Record-ID-Suffix → eindeutig und stabil bei Umbenennung. */
export function teilSlug(name: string, recId: string): string {
  return `${slugify(name) || 'teil'}-${recId.slice(3, 9).toLowerCase()}`;
}
