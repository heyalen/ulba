'use client';
/* ulba · Start: ein leeres Fenster mit einer Frage. Der Satz darf alles enthalten: was die Marke braucht,
   für wen es ist, wie es wirken soll. ulba sortiert das auf dem nächsten Bildschirm. */
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const BEISPIEL = ['30 ml Glasflasche mit Pipette', '50 ml Airless für aesop.com', 'Tiegel 50 ml, K-Beauty pastell', 'Refill-Flasche in Naturtönen'];

export function StartFeld() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [laeuft, start] = useTransition();
  const los = (t: string) => { if (t.trim().length >= 2) start(() => router.push(`/studio/neu?q=${encodeURIComponent(t.trim().slice(0, 300))}`)); };
  return (
    <div className="sf">
      <h1>Was hat die Marke angefragt?</h1>
      <p className="sf-unter">Schreib es so, wie es bei dir ankam: Teil, Grösse, Marke oder Stil. ulba sucht die passenden Teile aus deinem Katalog.</p>
      <form className="sf-feld" onSubmit={(e) => { e.preventDefault(); los(text); }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={300} disabled={laeuft} autoFocus aria-label="Anfrage beschreiben"
          placeholder="z. B. 30 ml Glasflasche mit Pipette für eine neue Serum-Linie"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); los(text); } }} />
        <button type="submit" disabled={laeuft || text.trim().length < 2} aria-label="Passende Teile suchen">{laeuft ? '…' : '↑'}</button>
      </form>
      <div className="sf-beispiele">
        {BEISPIEL.map((b) => <button key={b} type="button" disabled={laeuft} onClick={() => los(b)}>{b}</button>)}
      </div>
      <Link href="/studio/neu" className="sf-ohne">Ohne Anfrage starten: Teile selbst aus dem Katalog wählen</Link>
    </div>
  );
}
