/* ══════════════════════════════════════════════════════════════════════
   ulba · lib/seo-ui.tsx — gemeinsame Bausteine der indexierbaren Seiten
   (Teil, Kategorie, Kombi, Lieferant). Server Components, kein Client-JS.
   ══════════════════════════════════════════════════════════════════════ */
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Teil } from './teile';

export const farbe = { tinte: '#1D1D1B', grau: '#5B5B58', hell: '#9A9A96', linie: '#ECECEE', nische: '#F7F7F8' };
const schrift = "'Archivo', system-ui, sans-serif";

export function Seite({ children, pfad }: { children: ReactNode; pfad: { label: string; href?: string }[] }) {
  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 20px 80px', fontFamily: schrift, color: farbe.tinte }}>
      <nav aria-label="Brotkrumen" style={{ fontSize: 14, color: farbe.hell, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <Link href="/" style={{ color: farbe.hell, textDecoration: 'none' }}>ulba</Link>
        {pfad.map((p, i) => (
          <span key={i}>
            <span style={{ margin: '0 6px' }}>›</span>
            {p.href ? <Link href={p.href} style={{ color: farbe.hell, textDecoration: 'none' }}>{p.label}</Link> : <span>{p.label}</span>}
          </span>
        ))}
      </nav>
      {children}
    </main>
  );
}

export function Raster({ teile }: { teile: Teil[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 20 }}>
      {teile.map((t) => (
        <Link key={t.id} href={`/teil/${t.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          {t.bild
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={`/api/bild?r=${t.id}`} alt={`${t.name}${t.supplier ? ` von ${t.supplier}` : ''}`} loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: farbe.nische, borderRadius: 12 }} />
            : <div style={{ width: '100%', aspectRatio: '1', background: farbe.nische, borderRadius: 12 }} />}
          <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600 }}>{t.name}</div>
          <div style={{ color: farbe.hell, fontSize: 13 }}>
            {[t.type, t.material.join('/'), t.supplier].filter(Boolean).join(' · ')}
            {t.nichtMehrImKatalog ? ' · nicht mehr im Katalog' : ''}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function Chips({ titel, links }: { titel: string; links: { label: string; href: string }[] }) {
  if (!links.length) return null;
  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>{titel}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={{ padding: '7px 14px', border: `1px solid ${farbe.linie}`, borderRadius: 999, fontSize: 14, color: farbe.tinte, textDecoration: 'none' }}>
            {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
