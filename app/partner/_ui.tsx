import type { ReactNode } from 'react';

export function Karte({ titel, children }: { titel: string; children: ReactNode }) {
  return <section className="pa-karte"><h2 className="pa-h2">{titel}</h2>{children}</section>;
}

export function Leer({ text }: { text: string }) {
  return <p className="pa-leer">{text}</p>;
}
