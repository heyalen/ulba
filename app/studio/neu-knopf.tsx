'use client';
/* ulba · «Neuer Vorschlag»: zeigt sofort, dass etwas passiert, und wechselt ohne Neuladen. */
import { useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { neuesProjektId } from './projekte/actions';

export function NeuKnopf({ className, children, onNav }: { className: string; children: ReactNode; onNav?: () => void }) {
  const router = useRouter();
  const [laeuft, start] = useTransition();
  return (
    <button type="button" className={className} disabled={laeuft} aria-busy={laeuft}
      onClick={() => start(async () => { const id = await neuesProjektId(); if (id) { onNav?.(); router.push(`/studio/p/${id}`); } })}>
      {laeuft ? 'Wird geöffnet …' : children}
    </button>
  );
}
