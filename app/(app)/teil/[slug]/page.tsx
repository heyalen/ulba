/* ══════════════════════════════════════════════════════════════════════
   ulba · /teil/[slug] — DIE Seite eines Packmittels (ISR 1 h).
   Ein Teil, eine Ansicht, eine Adresse: Google-Besucher und App-Nutzer
   sehen dieselbe Teil-Seite (TeilSeite aus der App: Bühne, Verschluss,
   Design-Raum, Muster, Merken). Darunter, vom Server gerendert, was Google
   braucht: Datenblatt, Beschreibung, Kategorien, ähnliche Teile, JSON-LD.
   ══════════════════════════════════════════════════════════════════════ */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { teilBySlug, alleTeile, aehnlicheTeile, alleKategorien, alleLieferanten, kategorieTitel, kategoriePfad, SITE_URL, type Teil } from '@/lib/teile';
import { Raster, Pillen, specText } from '@/app/_katalog/ui';
import { TeilSeite, type Result } from '@/app/_ulba/app';
import { typKurz, typPlural } from '@/lib/typen';

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
    title: `${t.name}${t.type ? ` · ${typKurz(t.type)}` : ''}${t.supplier ? ` – ${t.supplier}` : ''} | ulba`,
    description: desc,
    alternates: { canonical: `${SITE_URL}/teil/${t.slug}` },
    openGraph: { title: t.name, description: desc, images: t.bild ? [t.bild] : [], type: 'website' },
  };
}

/* Server-Teil → das Format, das die App überall benutzt (Bilder über die
   stabile Route, nie als ablaufende Airtable-URL). */
function alsResult(t: Teil): Result {
  return {
    id: t.id, name: t.name, score: 0, reasoning: '',
    type: t.type, material: t.material, form: t.form, closure: t.closure,
    description: t.beschreibung, imageUrl: t.bild ? `/api/bild?r=${t.id}` : null,
    capabilities: t.faehigkeiten, availableSizes: t.sizes, availableMaterials: t.materialsAvailable,
    capCount: t.caps.length,
    caps: t.caps.filter((c) => c.bild).map((c) => ({ id: c.id, name: c.art || c.name, imageUrl: `/api/bild?r=${c.id}` })),
    supplier: t.supplier,
  };
}

export default async function TeilRoute({ params }: { params: { slug: string } }) {
  const t = await teilBySlug(params.slug);
  if (!t) notFound();
  const [aehnlich, kategorien, lieferanten] = await Promise.all([aehnlicheTeile(t), alleKategorien(), alleLieferanten()]);
  const passend = kategorien.filter((k) => k.teile.some((x) => x.id === t.id));
  const lief = lieferanten.find((l) => l.slug === t.supplierSlug);

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: t.name, description: t.beschreibung || undefined, image: t.bild || undefined,
    category: t.type ? typPlural(t.type) : undefined, material: t.material.join(', ') || undefined,
    brand: t.supplier ? { '@type': 'Brand', name: t.supplier } : undefined,
    url: `${SITE_URL}/teil/${t.slug}`,
  };

  const fakten: [string, string][] = ([
    ['Typ', typKurz(t.type)], ['Material', t.material.join(', ')], ['Form', t.form.join(', ')],
    ['Verschlussart', t.closure], ['Halsmaß', t.hals.join(', ')], ['Größen', t.sizes.join(', ')],
    ['Materialvarianten', t.materialsAvailable.join(', ')], ['Veredelung', t.faehigkeiten.join(', ')],
  ] as [string, string][]).filter(([, v]) => v);

  return (
    <TeilSeite teil={alsResult(t)} slug={t.slug}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="ub ub-im-app tp-mehr">
        {t.nichtMehrImKatalog && (
          <div className="ub-hinweis">Nicht mehr im Katalog des Lieferanten — ähnliche, verfügbare Teile findest du unten.</div>
        )}

        <section className="tp-datenblatt">
          <div>
            <span className="ub-lbl">Datenblatt</span>
            {fakten.length > 0 && (
              <div className="ub-fakten">
                {fakten.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
              </div>
            )}
            {t.beschreibung && <p className="ub-text">{t.beschreibung}</p>}
          </div>
          {lief && (
            <div>
              <span className="ub-lbl">Lieferant</span>
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
            </div>
          )}
        </section>

        <Pillen titel="In diesen Kategorien" links={passend.map((k) => ({ label: kategorieTitel(k), href: kategoriePfad(k) }))} />

        {aehnlich.length > 0 && (
          <section className="ub-sektion">
            <span className="ub-lbl">Ähnliche Teile</span>
            <Raster teile={aehnlich} />
          </section>
        )}
      </div>
    </TeilSeite>
  );
}
