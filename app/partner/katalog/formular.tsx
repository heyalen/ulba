'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { katalogAction } from '../actions';

function Senden() {
  const { pending } = useFormStatus();
  return <button className="pa-btn" type="submit" disabled={pending}>{pending ? 'Sendet …' : 'Einreichen'}</button>;
}

export function KatalogFormular() {
  const [state, action] = useFormState(katalogAction, null);
  if (state?.ok) {
    return <div className="pa-karte"><p className="pa-ok">Danke — wir haben deinen Katalog erhalten und melden uns, sobald die Teile auf ulba sind.</p></div>;
  }
  return (
    <form action={action} className="pa-karte pa-form">
      <label className="pa-feld"><span>Katalog-Link</span><input name="link" type="url" placeholder="https://www.firma.com/produkte" /></label>
      <label className="pa-feld"><span>Hinweise <small>optional</small></span><textarea name="notiz" rows={3} maxLength={500} placeholder="z. B. nur die Airless-Linie, oder: Datenblätter stehen unter Downloads." /></label>
      {state?.fehler && <p className="pa-fehler">{state.fehler}</p>}
      <Senden />
    </form>
  );
}
