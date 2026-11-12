'use client';
/* ulba · Seitenleiste: Katalog, Projekte, Verwaltung — wie bei Figma/Canva. */
import { usePathname } from 'next/navigation';
import type { ProjektKurz } from '../../lib/projekt';
import { neuesProjekt } from './projekte/actions';

const UNTEN = [
  { href: '/studio/anfragen', text: 'Anfragen' },
  { href: '/studio/datenbank', text: 'Datenbank' },
  { href: '/studio/einstellungen', text: 'Einstellungen' },
];

export function StudioNav({ projekte, aktivId }: { projekte: ProjektKurz[]; aktivId: string | null }) {
  const pfad = usePathname();
  const an = (h: string) => (pfad === h || (h !== '/studio' && pfad.startsWith(h)) ? 'page' : undefined);
  return (
    <nav className="st-nav" aria-label="Bereiche">
      <a href="/studio" aria-current={pfad === '/studio' ? 'page' : undefined} className="st-nav-katalog">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        Katalog
      </a>
      <div className="st-nav-gruppe">
        <span>Projekte</span>
        <form action={neuesProjekt}><button type="submit" aria-label="Neues Projekt" title="Neues Projekt">+</button></form>
      </div>
      {projekte.length === 0 && (
        <form action={neuesProjekt}><button type="submit" className="st-nav-neu">+ Erstes Projekt anlegen</button></form>
      )}
      <div className="st-nav-projekte">
        {projekte.map((p) => (
          <a key={p.id} href={`/studio/p/${p.id}`} aria-current={an(`/studio/p/${p.id}`)} title={p.titel}>
            <span className={`st-nav-punkt${p.id === aktivId ? ' an' : ''}`} aria-hidden />
            <span className="st-nav-name">{p.titel}</span>
          </a>
        ))}
      </div>
      <div className="st-nav-unten">
        {UNTEN.map((p) => <a key={p.href} href={p.href} aria-current={an(p.href)}>{p.text}</a>)}
      </div>
    </nav>
  );
}
