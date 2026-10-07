/* ulba · app/(katalog)/ui.tsx — gemeinsame Bausteine der Katalog-Seiten
   (Server Components). Optik = App: Wortmarke, Karten .ek, Pillen. */
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Teil } from '@/lib/teile';

export const bildVon = (id: string) => `/api/bild?r=${id}`;

export function specText(t: Pick<Teil, 'type' | 'sizes' | 'material'>): string {
  return [t.type, t.sizes[0], t.material.join('/')].filter(Boolean).join(' · ');
}

export function Rahmen({ spur, children }: { spur: { label: string; href?: string }[]; children: ReactNode }) {
  return (
    <>
      <header className="ub-top">
        <div className="ub-top-in">
          <Link href="/" aria-label="ulba Startseite">
            <svg className="ub-logo" viewBox="0 0 200 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ulba">
              <text x="0" y="62" fontFamily="Archivo, system-ui, sans-serif" fontWeight="800" fontSize="80" letterSpacing="-4" fill="#1D1D1B">ulba</text>
            </svg>
          </Link>
          <nav className="ub-spur" aria-label="Brotkrumen">
            {spur.map((s, i) => (
              <span key={i}>
                {i > 0 && <i>›&nbsp;</i>}
                {s.href ? <Link href={s.href}>{s.label}</Link> : s.label}
              </span>
            ))}
          </nav>
          <Link href="/" className="ub-suche">Suchen ↗</Link>
        </div>
      </header>
      <main className="ub-seite">{children}</main>
    </>
  );
}

export function Raster({ teile }: { teile: Teil[] }) {
  return (
    <div className="ub-raster">
      {teile.map((t) => (
        <Link key={t.id} href={`/teil/${t.slug}`} className="ub-ek">
          <div className="ub-ek-bild">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bildVon(t.id)} alt={`${t.name}${t.supplier ? ` von ${t.supplier}` : ''}`} loading="lazy" />
          </div>
          <div className="ub-ek-info">
            <span className="ub-ek-nm">{t.name}</span>
            <span className="ub-ek-spec">
              {[specText(t), t.supplier].filter(Boolean).join(' · ')}
              {t.nichtMehrImKatalog ? ' · nicht mehr im Katalog' : ''}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function Pillen({ titel, links }: { titel: string; links: { label: string; href: string }[] }) {
  if (!links.length) return null;
  return (
    <section className="ub-sektion">
      <span className="ub-lbl">{titel}</span>
      <div className="ub-pillen">
        {links.map((l) => <Link key={l.href} href={l.href} className="ub-pille">{l.label}</Link>)}
      </div>
    </section>
  );
}
