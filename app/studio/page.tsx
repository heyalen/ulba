import { supabaseServer } from '../../lib/supabase/server';

type Zeile = { id: string; titel: string; status: string; aktualisiert_am: string; marken: { name: string } | null };
const STATUS: Record<string, string> = { entwurf: 'Entwurf', geteilt: 'Geteilt', archiviert: 'Archiviert' };

export default async function Vorschlaege() {
  const { data } = await supabaseServer()
    .from('vorschlaege')
    .select('id, titel, status, aktualisiert_am, marken ( name )')
    .neq('status', 'archiviert')
    .order('aktualisiert_am', { ascending: false });
  const liste = (data ?? []) as unknown as Zeile[];

  return (
    <>
      <div className="st-titelzeile">
        <h1>Vorschläge</h1>
        <button className="st-btn" type="button" disabled title="Kommt im nächsten Schritt">Neuer Vorschlag</button>
      </div>
      {liste.length === 0 ? (
        <div className="st-leer">
          <h2>Noch keine Vorschläge</h2>
          <p>Ein Vorschlag zeigt Teile aus deinem Katalog im Look einer Marke. Du teilst ihn als Link und siehst, was die Marke öffnet und anfragt.</p>
        </div>
      ) : (
        <div className="st-liste">
          {liste.map((v) => (
            <div className="st-zeile" key={v.id}>
              <b>{v.titel}{v.marken ? ` · ${v.marken.name}` : ''}</b>
              <span className="st-status">{STATUS[v.status] ?? v.status}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
