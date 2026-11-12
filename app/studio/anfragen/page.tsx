import { supabaseServer } from '../../../lib/supabase/server';

type Anfrage = { id: string; email: string; status: string; erstellt_am: string; teile: { name: string } | null };
const STATUS: Record<string, string> = { neu: 'Neu', in_bearbeitung: 'In Bearbeitung', versendet: 'Versendet', abgelehnt: 'Abgelehnt' };

export default async function Anfragen() {
  const { data } = await supabaseServer()
    .from('musteranfragen')
    .select('id, email, status, erstellt_am, teile ( name )')
    .order('erstellt_am', { ascending: false });
  const liste = (data ?? []) as unknown as Anfrage[];
  return (
    <>
      <div className="st-titelzeile"><h1>Anfragen</h1></div>
      {liste.length === 0 ? (
        <div className="st-leer">
          <h2>Noch keine Musteranfragen</h2>
          <p>Fragt eine Marke über einen deiner Projekt-Links Muster an, erscheint das hier. Du bekommst zusätzlich eine E-Mail.</p>
        </div>
      ) : (
        <div className="st-liste">
          {liste.map((a) => (
            <div className="st-zeile" key={a.id}>
              <b>{a.teile?.name ?? 'Teil'} · {a.email}</b>
              <span className="st-status">{STATUS[a.status] ?? a.status}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
