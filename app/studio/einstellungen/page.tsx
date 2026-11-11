import { ladeKontext } from '../../../lib/supabase/server';

const TYP: Record<string, string> = { lieferant: 'Hersteller', haendler: 'Händler', lohnhersteller: 'Lohnhersteller' };
const PLAN: Record<string, string> = { free: 'Free', pro: 'Pro', team: 'Team' };

export default async function Einstellungen() {
  const k = await ladeKontext();
  const f = k?.firma;
  if (!f) return null;
  return (
    <>
      <div className="st-titelzeile"><h1>Einstellungen</h1></div>
      <div className="st-box">
        <div><span className="st-hilfe">Firma</span><p><b>{f.name}</b></p></div>
        <div><span className="st-hilfe">Art</span><p>{TYP[f.typ] ?? f.typ}</p></div>
        <div><span className="st-hilfe">Website</span><p>{f.domain ?? '–'}</p></div>
        <div><span className="st-hilfe">Plan</span><p>{PLAN[f.plan] ?? f.plan}</p></div>
        <div><span className="st-hilfe">Dein Konto</span><p>{k.email} · {k.rolle === 'inhaber' ? 'Inhaber' : 'Mitglied'}</p></div>
      </div>
    </>
  );
}
