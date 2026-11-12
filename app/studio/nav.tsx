'use client';
/* ulba · Seitenleiste im Stil des ersten ulba: Logo, «Neuer Vorschlag»,
   Vorschläge mit Unterzeile, unten Verwaltung und Konto. Mobil: Schublade. */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ProjektKurz } from '../../lib/projekt';
import { neuesProjekt } from './projekte/actions';

const UNTEN = [
  { href: '/studio/richtungen', text: 'Richtungen' },
  { href: '/studio/anfragen', text: 'Anfragen' },
  { href: '/studio/datenbank', text: 'Datenbank' },
  { href: '/studio/einstellungen', text: 'Einstellungen' },
];

export function StudioNav({ projekte, aktivId, firma }: { projekte: ProjektKurz[]; aktivId: string | null; firma: string }) {
  const pfad = usePathname();
  const [offen, setOffen] = useState(false);
  const zu = () => setOffen(false);
  const an = (h: string) => (pfad === h || (h !== '/studio' && pfad.startsWith(h)));
  const hier = pfad === '/studio' ? 'Vorschläge' : projekte.find((p) => pfad.startsWith(`/studio/p/${p.id}`))?.titel ?? UNTEN.find((u) => pfad.startsWith(u.href))?.text ?? 'Studio';
  return (
    <aside className={`st-nav${offen ? ' offen' : ''}`} aria-label="Navigation">
      <button type="button" className="st-nav-mobil" onClick={() => setOffen(true)} aria-expanded={offen} aria-label="Menü öffnen">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        <span>{hier}</span>
      </button>
      <div className="st-nav-inhalt">
        <button type="button" className="st-nav-zu" onClick={zu} aria-label="Menü schliessen">×</button>
        <Link href="/studio" onClick={zu} className="st-logo" aria-label="ulba – alle Vorschläge">ulba</Link>
        <form action={neuesProjekt}><button type="submit" className="st-nav-neu"><span aria-hidden>+</span>Neuer Vorschlag</button></form>
        <Link href="/studio" onClick={zu} className={`st-nav-item${pfad === '/studio' ? ' an' : ''}`}>Alle Vorschläge</Link>
        <div className="st-nav-lbl">Zuletzt</div>
        <div className="st-nav-liste">
          {projekte.length === 0 && <div className="st-nav-leer">Noch kein Vorschlag</div>}
          {projekte.slice(0, 15).map((p) => (
            <Link key={p.id} href={`/studio/p/${p.id}`} onClick={zu} className={`st-nav-proj${an(`/studio/p/${p.id}`) ? ' an' : ''}`} title={p.titel}>
              <span className="st-np-t">{p.titel}</span>
              <span className="st-np-s">{p.teile} {p.teile === 1 ? 'Teil' : 'Teile'}{p.marke ? ` · ${p.marke}` : ''}{p.id === aktivId ? ' · offen' : ''}</span>
            </Link>
          ))}
        </div>
        <div className="st-nav-unten">
          {UNTEN.map((u) => <Link key={u.href} href={u.href} onClick={zu} className={`st-nav-item${an(u.href) ? ' an' : ''}`}>{u.text}</Link>)}
          <div className="st-nav-konto">
            <span title={firma}>{firma}</span>
            <form action="/auth/abmelden" method="post"><button type="submit">Abmelden</button></form>
          </div>
          <div className="st-nav-recht"><a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a> · <a href="/agb">AGB</a></div>
        </div>
      </div>
    </aside>
  );
}
