'use client';
import { usePathname } from 'next/navigation';

const PUNKTE = [
  { href: '/partner', label: 'Übersicht' },
  { href: '/partner/profil', label: 'Firmenprofil' },
  { href: '/partner/teile', label: 'Meine Teile', zaehler: 'teile' },
  { href: '/partner/anfragen', label: 'Musteranfragen', zaehler: 'anfragen' },
  { href: '/partner/katalog', label: 'Katalog einreichen' },
] as const;

export function PartnerNav({ anfragen, teile }: { anfragen: number; teile: number }) {
  const pfad = usePathname() || '';
  return (
    <nav className="pa-nav" aria-label="Portal">
      {PUNKTE.map((p) => {
        const an = p.href === '/partner' ? pfad === '/partner' : pfad.startsWith(p.href);
        const n = 'zaehler' in p ? (p.zaehler === 'anfragen' ? anfragen : teile) : 0;
        return (
          <a key={p.href} href={p.href} className={`pa-nav-a${an ? ' an' : ''}`}>
            {p.label}{n > 0 && <span className="pa-zahl">{n}</span>}
          </a>
        );
      })}
    </nav>
  );
}
