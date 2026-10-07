'use client';
/* ulba · Bühne der Teil-Seite: Verschluss wählen → steht sofort auf dem Teil,
   wie im DetailPanel der App. Der Knopf öffnet ulba mit genau dieser Kombi. */
import { useState, type ReactNode } from 'react';
import Link from 'next/link';

export interface BuehnenCap { id: string; art: string }

export function Buehne({ teilId, name, caps, children }: { teilId: string; name: string; caps: BuehnenCap[]; children: ReactNode }) {
  const [wahl, setWahl] = useState(0);
  const cap = caps[wahl];
  return (
    <div className="ub-teil">
    <div>
      <div className="ub-buehne">
        {cap && <span className="ub-buehne-hinweis">mit {cap.art || 'Verschluss'}</span>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cap && <img className="ub-buehne-cap" src={`/api/bild?r=${cap.id}`} alt={`${cap.art || 'Verschluss'} für ${name}`} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ub-buehne-base" src={`/api/bild?r=${teilId}`} alt={name} />
      </div>
      {caps.length > 0 && (
        <>
          <div className="ub-caps" role="listbox" aria-label="Verschluss wählen">
            {caps.map((c, i) => (
              <button key={c.id} className={`ub-cap${i === wahl ? ' an' : ''}`} onClick={() => setWahl(i)}
                role="option" aria-selected={i === wahl} title={c.art || `Verschluss ${i + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/bild?r=${c.id}`} alt={c.art || `Verschluss ${i + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
          <span className="ub-lbl" style={{ marginTop: 6 }}>Verschluss wählen · {caps.length} passende</span>
        </>
      )}
    </div>
    <div>
      {children}
      <div className="ub-cta">
        <Link className="ub-btn" href={`/?teil=${teilId}${cap ? `&cap=${cap.id}` : ''}`}>In ulba öffnen →</Link>
        <small>Muster anfragen · im Design zeigen · merken</small>
      </div>
    </div>
    </div>
  );
}
