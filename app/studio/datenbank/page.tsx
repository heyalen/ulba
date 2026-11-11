import { supabaseServer } from '../../../lib/supabase/server';
import { QuelleFormular } from './quelle-formular';

type Quelle = { id: string; art: string; katalog_url: string | null; pdf_pfad: string | null; status: string; letzter_lauf_am: string | null };
type Teil = { id: string; name: string; rolle: string; status: string; material: string | null; volumen_ml: number | null; mindestmenge: number | null };

const Q_STATUS: Record<string, string> = { neu: 'Wird eingerichtet', laeuft: 'Liest ein …', fertig: 'Eingelesen', fehler: 'Fehler — wir schauen es an' };
const T_STATUS: Record<string, string> = { in_pruefung: 'In Prüfung', aktiv: 'Aktiv', verworfen: 'Verworfen', nicht_mehr_im_katalog: 'Nicht mehr im Katalog' };
const ROLLE: Record<string, string> = { behaelter: 'Behälter', system: 'System', verschluss: 'Verschluss' };

export default async function Datenbank() {
  const sb = supabaseServer();
  const [{ data: q }, { data: t }] = await Promise.all([
    sb.from('quellen').select('id, art, katalog_url, pdf_pfad, status, letzter_lauf_am').order('erstellt_am', { ascending: false }),
    sb.from('teile').select('id, name, rolle, status, material, volumen_ml, mindestmenge').neq('status', 'verworfen').order('name'),
  ]);
  const quellen = (q ?? []) as Quelle[];
  const teile = (t ?? []) as Teil[];

  return (
    <>
      <div className="st-titelzeile"><h1>Datenbank</h1></div>

      <section style={{ marginBottom: 28 }}>
        <QuelleFormular />
        {quellen.length > 0 && (
          <div className="st-liste" style={{ marginTop: 12, maxWidth: 640 }}>
            {quellen.map((x) => (
              <div className="st-zeile" key={x.id}>
                <b style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>
                  {x.art === 'pdf' ? (x.pdf_pfad?.split('/').pop()?.replace(/^\d+-/, '') ?? 'PDF') : x.katalog_url?.replace(/^https?:\/\//, '')}
                </b>
                <span className="st-status">{Q_STATUS[x.status] ?? x.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Deine Teile {teile.length > 0 && <span style={{ color: '#6B6B6B', fontWeight: 400 }}>({teile.length})</span>}</h2>
        {teile.length === 0 ? (
          <div className="st-leer">
            <h2>Noch keine Teile</h2>
            <p>Füg oben deinen Katalog hinzu. ulba liest die Teile ein, du prüfst sie, dann sind sie hier und bereit für Vorschläge.</p>
          </div>
        ) : (
          <div className="st-liste">
            {teile.map((x) => (
              <div className="st-zeile" key={x.id}>
                <b>{x.name}</b>
                <span className="st-hilfe">{[ROLLE[x.rolle], x.material, x.volumen_ml ? `${x.volumen_ml} ml` : null, x.mindestmenge ? `ab ${x.mindestmenge.toLocaleString('de-CH')} Stk.` : null].filter(Boolean).join(' · ')}</span>
                <span className="st-status">{T_STATUS[x.status] ?? x.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
