import { ladeKontext, supabaseServer, supabaseAdmin } from '../../../lib/supabase/server';
import { AbsenderForm } from './absender';

const TYP: Record<string, string> = { lieferant: 'Hersteller', haendler: 'Händler', lohnhersteller: 'Lohnhersteller' };
const PLAN: Record<string, string> = { free: 'Free', pro: 'Pro', team: 'Team' };

export default async function Einstellungen() {
  const k = await ladeKontext();
  const f = k?.firma;
  if (!f) return null;
  const { data } = await supabaseServer().from('mitglieder').select('anzeigename, titel, telefon, foto_pfad').eq('firma_id', f.id).eq('user_id', k.userId).maybeSingle();
  const m = data as { anzeigename: string | null; titel: string | null; telefon: string | null; foto_pfad: string | null } | null;
  const foto = m?.foto_pfad ? (await supabaseAdmin().storage.from('logos').createSignedUrl(m.foto_pfad, 3600)).data?.signedUrl ?? null : null;
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
      <AbsenderForm p={{ anzeigename: m?.anzeigename ?? null, titel: m?.titel ?? null, telefon: m?.telefon ?? null, foto }} />
    </>
  );
}
