'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { firmaAnlegen, type StartStatus } from './actions';

function Weiter() {
  const { pending } = useFormStatus();
  return <button className="st-btn st-btn--voll" type="submit" disabled={pending}>{pending ? 'Wird angelegt …' : 'Weiter'}</button>;
}

export function StartFormular({ email }: { email: string }) {
  const [status, aktion] = useFormState<StartStatus, FormData>(firmaAnlegen, {});
  return (
    <form className="st-karte" action={aktion}>
      <h1>Deine Firma</h1>
      <p className="st-sub">Angemeldet als {email}. Noch ein Schritt, dann kannst du loslegen.</p>
      {status.fehler && <p className="st-fehler" role="alert">{status.fehler}</p>}
      <div className="st-feld">
        <label htmlFor="name">Firmenname</label>
        <input id="name" name="name" required maxLength={120} autoComplete="organization" />
      </div>
      <div className="st-feld">
        <label htmlFor="typ">Was macht deine Firma?</label>
        <select id="typ" name="typ" defaultValue="lieferant">
          <option value="lieferant">Wir stellen Verpackungen her</option>
          <option value="haendler">Wir handeln mit Verpackungen</option>
          <option value="lohnhersteller">Wir sind Lohnhersteller</option>
        </select>
      </div>
      <div className="st-feld">
        <label htmlFor="website">Website <span style={{ fontWeight: 400, color: '#6B6B6B' }}>(optional)</span></label>
        <input id="website" name="website" inputMode="url" placeholder="firma.com" />
        <span className="st-hilfe">Daraus lesen wir später Logo und Katalog.</span>
      </div>
      <Weiter />
    </form>
  );
}
