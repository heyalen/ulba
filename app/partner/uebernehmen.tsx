'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { uebernehmenAction } from './actions';
import { LAENDER } from '@/lib/partnerKonst';

type Firma = { id: string; name: string; land: string; website: string; belegt: boolean };

function Knopf({ text }: { text: string }) {
  const { pending } = useFormStatus();
  return <button className="pa-btn" type="submit" disabled={pending}>{pending ? 'Einen Moment …' : text}</button>;
}

export function Uebernehmen({ auswahl }: { auswahl: Firma[] }) {
  const [state, action] = useFormState(uebernehmenAction, null);
  const [wahl, setWahl] = useState('');
  const [suche, setSuche] = useState('');
  if (state?.ok) {
    if (typeof window !== 'undefined') window.location.href = '/partner';
    return <p className="pa-text">Fertig — einen Moment …</p>;
  }
  const treffer = auswahl.filter((f) => !suche || f.name.toLowerCase().includes(suche.toLowerCase())).slice(0, 12);
  const gewaehlt = auswahl.find((f) => f.id === wahl);
  return (
    <form action={action} className="pa-karte pa-form">
      <input type="hidden" name="lieferantId" value={wahl} />
      <label className="pa-feld">
        <span>Firma suchen</span>
        <input value={suche} onChange={(e) => { setSuche(e.target.value); setWahl(''); }} placeholder="z. B. Lumson" autoFocus />
      </label>
      {suche && (
        <div className="pa-vorschlaege" role="listbox">
          {treffer.map((f) => (
            <button type="button" key={f.id} role="option" aria-selected={wahl === f.id} disabled={f.belegt}
              className={`pa-vorschlag${wahl === f.id ? ' an' : ''}`} onClick={() => setWahl(f.id)}>
              <b>{f.name}</b><span>{[f.land, f.website.replace(/^https?:\/\/(www\.)?/, '')].filter(Boolean).join(' · ')}{f.belegt ? ' · bereits verwaltet' : ''}</span>
            </button>
          ))}
          <button type="button" role="option" aria-selected={wahl === 'neu'} className={`pa-vorschlag${wahl === 'neu' ? ' an' : ''}`} onClick={() => setWahl('neu')}>
            <b>«{suche}» ist noch nicht auf ulba</b><span>Firma neu anlegen</span>
          </button>
        </div>
      )}
      {wahl === 'neu' && (
        <div className="pa-neu">
          <label className="pa-feld"><span>Firmenname</span><input name="name" defaultValue={suche} required /></label>
          <label className="pa-feld"><span>Website</span><input name="website" placeholder="www.firma.com" /></label>
          <label className="pa-feld"><span>Land</span>
            <select name="land" defaultValue=""><option value="">— wählen —</option>{LAENDER.map((l) => <option key={l}>{l}</option>)}</select>
          </label>
        </div>
      )}
      {gewaehlt && <p className="pa-text">Du übernimmst <b>{gewaehlt.name}</b>{gewaehlt.website ? ` (${gewaehlt.website.replace(/^https?:\/\/(www\.)?/, '')})` : ''}.</p>}
      {state?.fehler && <p className="pa-fehler">{state.fehler}</p>}
      {wahl && <Knopf text={wahl === 'neu' ? 'Firma anlegen' : 'Profil übernehmen'} />}
    </form>
  );
}
