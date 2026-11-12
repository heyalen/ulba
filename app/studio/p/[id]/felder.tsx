'use client';
/* ulba · Projektseite: Titel direkt bearbeiten, Marke lesen, Projekt aktiv setzen, Link kopieren. */
import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { umbenennen, markeLesen, projektWaehlen, type MarkeStatus } from '../../projekte/actions';

export function AktivSetzen({ id }: { id: string }) {
  useEffect(() => { projektWaehlen(id).catch(() => {}); }, [id]);
  return null;
}

export function TitelFeld({ id, titel }: { id: string; titel: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [wert, setWert] = useState(titel);
  return (
    <form ref={ref} action={umbenennen} className="pj-titel" onSubmit={(e) => { if (!wert.trim()) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <input name="titel" value={wert} onChange={(e) => setWert(e.target.value)} aria-label="Projektname" maxLength={120}
        onBlur={() => { if (wert.trim() && wert !== titel) ref.current?.requestSubmit(); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }} />
    </form>
  );
}

function MarkeKnopf({ hat }: { hat: boolean }) {
  const { pending } = useFormStatus();
  return <button className="st-btn st-btn--hell" type="submit" disabled={pending} style={{ minHeight: 40 }}>{pending ? 'Marke wird gelesen … (bis 1 Min.)' : hat ? 'Neu lesen' : 'Marke lesen'}</button>;
}

export function MarkeFeld({ id, url, marke }: { id: string; url: string | null; marke: string | null }) {
  const [st, aktion] = useFormState<MarkeStatus, FormData>(markeLesen, {});
  return (
    <form action={aktion} className="pj-marke">
      <input type="hidden" name="id" value={id} />
      <input name="url" defaultValue={url?.replace(/^https?:\/\//, '') ?? ''} placeholder="Website der Marke, z. B. aesop.com" aria-label="Website der Marke" />
      <MarkeKnopf hat={!!marke} />
      {marke && !st.fehler && <span className="st-hilfe">Linien von {marke} stehen im Design-Raum bereit.</span>}
      {st.fehler && <span className="st-fehler">{st.fehler}</span>}
    </form>
  );
}

export function KopierFeld({ wert }: { wert: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 8, flexBasis: '100%' }}>
      <input readOnly value={wert} aria-label="Link" onFocus={(e) => e.target.select()} style={{ flex: 1, minHeight: 40, padding: '0 10px', border: '1px solid #DAD7D0', borderRadius: 9, fontSize: 13, background: '#F7F6F3' }} />
      <button type="button" className="st-btn st-btn--hell" style={{ minHeight: 40 }} onClick={async () => { try { await navigator.clipboard.writeText(wert); setOk(true); setTimeout(() => setOk(false), 1800); } catch { /* nichts */ } }}>
        {ok ? 'Kopiert ✓' : 'Kopieren'}
      </button>
    </div>
  );
}
