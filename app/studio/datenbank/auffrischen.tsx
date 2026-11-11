'use client';
/* Lädt die Seite alle 6 Sekunden neu, solange ein Katalog eingelesen wird. */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function Auffrischen({ aktiv }: { aktiv: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!aktiv) return;
    const t = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(t);
  }, [aktiv, router]);
  return null;
}
