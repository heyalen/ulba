/* ulba · app/_katalog/ui.tsx — gemeinsame Bausteine der Katalog-Seiten
   (Server Components). Optik = App: Wortmarke, Karten .ek, Pillen. */
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Teil } from '@/lib/teile';
import { typKurz } from '@/lib/typen';

export const bildVon = (id: string) => `/api/bild?r=${id}`;

export function specText(t: Pick<Teil, 'type' | 'sizes' | 'material'>): string {
  return [typKurz(t.type), t.sizes[0], t.material.join('/')].filter(Boolean).join(' · ');
}

/* Rahmen einer Katalog-Seite INNERHALB der App: Navigation und Logo
   kommen aus der App-Shell (app/_ulba/app.tsx), hier nur Spur + Inhalt. */
export function Rahmen({ spur, children }: { spur: { label: string; href?: string }[]; children: ReactNode }) {
  return (
    <div className="ub ub-im-app">
      <nav className="ub-spur" aria-label="Brotkrumen">
        <span><Link href="/">ulba</Link></span>
        {spur.map((s, i) => (
          <span key={i}>
            <i>›&nbsp;</i>
            {s.href ? <Link href={s.href}>{s.label}</Link> : s.label}
          </span>
        ))}
      </nav>
      <main className="ub-seite">{children}</main>
    </div>
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
