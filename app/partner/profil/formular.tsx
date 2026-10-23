'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { profilAction } from '../actions';
import { LAENDER } from '@/lib/partnerKonst';

type Daten = {
  id: string; beschreibung: string; standort: string; land: string; website: string; email: string; zertifikat: string;
  eu: boolean; moq: number | null; lieferzeit: number | null; logoUrl: string | null; titelbildUrl: string | null; freigegeben: boolean;
};

function Speichern() {
  const { pending } = useFormStatus();
  return <button className="pa-btn" type="submit" disabled={pending}>{pending ? 'Speichert …' : 'Speichern'}</button>;
}

export function ProfilFormular({ l }: { l: Daten }) {
  const [state, action] = useFormState(profilAction, null);
  const ro = !l.freigegeben;
  return (
    <form action={action} className="pa-karte pa-form">
      <fieldset disabled={ro} className="pa-fs">
        <label className="pa-feld"><span>Über uns <small>2–4 Sätze</small></span>
          <textarea name="beschreibung" rows={4} maxLength={1200} defaultValue={l.beschreibung} placeholder="Wer ihr seid, was ihr fertigt, wofür ihr bekannt seid." /></label>
        <div className="pa-zwei">
          <label className="pa-feld"><span>Standort <small>Stadt/Region</small></span><input name="standort" defaultValue={l.standort} placeholder="z. B. Capergnanica (CR)" /></label>
          <label className="pa-feld"><span>Land</span>
            <select name="land" defaultValue={l.land}><option value="">— wählen —</option>{LAENDER.map((x) => <option key={x}>{x}</option>)}</select></label>
        </div>
        <div className="pa-zwei">
          <label className="pa-feld"><span>Website</span><input name="website" defaultValue={l.website} placeholder="www.firma.com" /></label>
          <label className="pa-feld"><span>Kontakt-E-Mail <small>für Musteranfragen</small></span><input name="email" type="email" defaultValue={l.email} /></label>
        </div>
        <div className="pa-zwei">
          <label className="pa-feld"><span>Mindestmenge <small>Stück</small></span><input name="moq" inputMode="numeric" defaultValue={l.moq ?? ''} placeholder="z. B. 5000" /></label>
          <label className="pa-feld"><span>Lieferzeit <small>Wochen</small></span><input name="lieferzeit" inputMode="numeric" defaultValue={l.lieferzeit ?? ''} placeholder="z. B. 8" /></label>
        </div>
        <div className="pa-zwei">
          <label className="pa-feld"><span>Nachhaltigkeits-Zertifikat</span><input name="zertifikat" defaultValue={l.zertifikat} placeholder="z. B. ISCC PLUS, FSC" /></label>
          <label className="pa-check"><input type="checkbox" name="eu" defaultChecked={l.eu} /> <span>EU-konform (Reach, Kosmetik-VO)</span></label>
        </div>
        <div className="pa-zwei">
          <label className="pa-feld"><span>Logo <small>Link zu PNG/SVG, quadratisch</small></span><input name="logoUrl" defaultValue="" placeholder={l.logoUrl ? 'Logo vorhanden — neuen Link einfügen zum Ersetzen' : 'https://…/logo.png'} /></label>
          <label className="pa-feld"><span>Titelbild <small>Link, ca. 1600×400</small></span><input name="titelbildUrl" defaultValue="" placeholder={l.titelbildUrl ? 'Titelbild vorhanden — neuen Link zum Ersetzen' : 'https://…/titel.jpg'} /></label>
        </div>
      </fieldset>
      {state?.fehler && <p className="pa-fehler">{state.fehler}</p>}
      {state?.ok && <p className="pa-ok">Gespeichert.</p>}
      {!ro && <Speichern />}
    </form>
  );
}
