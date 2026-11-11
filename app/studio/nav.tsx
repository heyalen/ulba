'use client';
import { usePathname } from 'next/navigation';

const PUNKTE = [
  { href: '/studio', text: 'Vorschläge' },
  { href: '/studio/datenbank', text: 'Datenbank' },
  { href: '/studio/anfragen', text: 'Anfragen' },
  { href: '/studio/marken', text: 'Marken' },
  { href: '/studio/einstellungen', text: 'Einstellungen' },
];

export function StudioNav() {
  const pfad = usePathname();
  return (
    <nav className="st-nav" aria-label="Bereiche">
      {PUNKTE.map((p) => (
        <a key={p.href} href={p.href} aria-current={pfad === p.href ? 'page' : undefined}>{p.text}</a>
      ))}
    </nav>
  );
}
