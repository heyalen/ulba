'use client';
/* ulba · Reiter im Lieferantenprofil (Alle / Airless / Flasche …) — wie .lp-reiter in der App. */
import { useState, type ReactNode } from 'react';

export function Reiter({ typen, kinder }: { typen: { typ: string; n: number }[]; kinder: Record<string, ReactNode> }) {
  const [an, setAn] = useState('Alle');
  return (
    <>
      <div className="ub-reiter" role="tablist">
        {typen.map((t) => (
          <button key={t.typ} role="tab" aria-selected={an === t.typ} className={an === t.typ ? 'an' : ''} onClick={() => setAn(t.typ)}>
            {t.typ}<i>{t.n}</i>
          </button>
        ))}
      </div>
      {kinder[an]}
    </>
  );
}
