'use client';
/* ulba · Start: ein leeres Fenster mit einer Frage. Ein Satz oder ein Anlass genügt, dann geht es visuell weiter. */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { lookbookStarten } from './projekte/actions';

const ANLASS = [['neuheit', 'Neuheit vorstellen'], ['marke', 'Für eine Marke'], ['trend', 'Trend-Idee']] as const;
const BEISPIEL = ['Neue Airless-Flasche in drei Looks', 'K-Beauty pastell für junge Hautpflege', 'Männerpflege minimal, matt schwarz', 'Refill-Linie in Naturtönen'];

export function StartFeld() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [fehler, setFehler] = useState(false);
  const [laeuft, start] = useTransition();
  const los = (anlass: 'neuheit' | 'marke' | 'trend', idee: string) => start(async () => {
    setFehler(false);
    const id = await lookbookStarten(anlass, idee);
    if (!id) { setFehler(true); return; }
    const q = anlass === 'neuheit' ? 'start=teile' : anlass === 'marke' ? 'start=marke' : `start=look${idee.trim() ? `&idee=${encodeURIComponent(idee.trim().slice(0, 300))}` : ''}`;
    router.push(`/studio/p/${id}?${q}`);
  });
  return (
    <div className="sf">
      <h1>Was möchtest du zeigen?</h1>
      <form className="sf-feld" onSubmit={(e) => { e.preventDefault(); if (text.trim().length >= 3) los('trend', text); }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={300} disabled={laeuft} autoFocus aria-label="Beschreib dein Lookbook"
          placeholder="Beschreib, was du zeigen willst …"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim().length >= 3) los('trend', text); } }} />
        <button type="submit" disabled={laeuft || text.trim().length < 3} aria-label="Lookbook starten">{laeuft ? '…' : '↑'}</button>
      </form>
      <div className="sf-chips">
        {ANLASS.map(([k, t]) => <button key={k} type="button" disabled={laeuft} onClick={() => los(k, '')}>{t}</button>)}
      </div>
      <div className="sf-beispiele">
        {BEISPIEL.map((b) => <button key={b} type="button" disabled={laeuft} onClick={() => setText(b)}>{b}</button>)}
      </div>
      {laeuft && <p className="sf-hinweis" role="status">Lookbook wird geöffnet …</p>}
      {fehler && <p className="sf-hinweis" role="alert">Das hat nicht geklappt. Bitte nochmal versuchen.</p>}
    </div>
  );
}
