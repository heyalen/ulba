'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { markeSetzen, type MarkeStatus } from './actions';

function Knopf({ hat }: { hat: boolean }) {
  const { pending } = useFormStatus();
  return <button className="st-btn st-btn--hell" type="submit" disabled={pending}>{pending ? 'Liest Marke … (bis 1 Min.)' : hat ? 'Neu lesen' : 'Marke lesen'}</button>;
}

export function MarkeFormular({ id, url }: { id: string; url: string | null }) {
  const [status, aktion] = useFormState<MarkeStatus, FormData>(markeSetzen, {});
  return (
    <form action={aktion} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input type="hidden" name="id" value={id} />
      <label htmlFor="marke-url" style={{ fontSize: 13, color: '#4A4A4A' }}>Website oder Shop der Marke</label>
      <input id="marke-url" name="url" defaultValue={url?.replace(/^https?:\/\//, '') ?? ''} placeholder="marke.ch" inputMode="url"
        style={{ minHeight: 46, padding: '0 12px', fontSize: 15, border: '1px solid #DAD7D0', borderRadius: 10 }} />
      {status.fehler && <p className="st-fehler" role="alert">{status.fehler}</p>}
      <Knopf hat={!!url} />
    </form>
  );
}
