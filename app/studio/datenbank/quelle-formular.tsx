'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { quelleAnlegen, type QuelleStatus } from './actions';

function Senden() {
  const { pending } = useFormStatus();
  return <button className="st-btn" type="submit" disabled={pending}>{pending ? 'Wird gespeichert …' : 'Katalog hinzufügen'}</button>;
}

const tab = (aktiv: boolean): React.CSSProperties => ({
  minHeight: 44, padding: '0 16px', borderRadius: 10, fontSize: 14, cursor: 'pointer',
  background: aktiv ? '#F3F2EE' : '#FFFFFF', color: '#1A1A1A',
  border: aktiv ? '1.5px solid #1A1A1A' : '1px solid #DAD7D0',
});

export function QuelleFormular() {
  const [art, setArt] = useState<'link' | 'pdf'>('link');
  const [status, aktion] = useFormState<QuelleStatus, FormData>(quelleAnlegen, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (status.ok) formRef.current?.reset(); }, [status]);

  return (
    <form ref={formRef} className="st-box" action={aktion} style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={tab(art === 'link')} onClick={() => setArt('link')} aria-pressed={art === 'link'}>Website-Link</button>
        <button type="button" style={tab(art === 'pdf')} onClick={() => setArt('pdf')} aria-pressed={art === 'pdf'}>PDF-Katalog</button>
      </div>
      <input type="hidden" name="art" value={art} />
      {art === 'link' ? (
        <div className="st-feld">
          <label htmlFor="q-url">Adresse deines Online-Katalogs</label>
          <input id="q-url" name="url" inputMode="url" placeholder="z. B. firma.com/products" required />
          <span className="st-hilfe">Am besten die Übersichtsseite mit allen Produkten. ulba liest die Teile von dort selbst ein.</span>
        </div>
      ) : (
        <div className="st-feld">
          <label htmlFor="q-pdf">PDF-Katalog (bis 50 MB)</label>
          <input id="q-pdf" name="pdf" type="file" accept="application/pdf" required />
        </div>
      )}
      {status.fehler && <p className="st-fehler" role="alert">{status.fehler}</p>}
      {status.ok && <p className="st-hilfe" role="status">Gespeichert. Das Einlesen startet in Kürze — du siehst den Stand unten bei den Quellen.</p>}
      <Senden />
    </form>
  );
}
