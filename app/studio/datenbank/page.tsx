import { bildLinks, supabaseServer } from '../../../lib/supabase/server';
import { QuelleFormular } from './quelle-formular';
import { Auffrischen } from './auffrischen';
import { statusSetzen } from './teile-aktionen';

type Quelle = { id: string; art: string; katalog_url: string | null; pdf_pfad: string | null; status: string; log: string | null };
type Teil = { id: string; name: string; rolle: string; status: string; material: string | null; volumen_ml: number | null;
  bild_pfad: string | null; bild_roh_pfad: string | null; pipeline: string; pipeline_log: string | null };

const Q_STATUS: Record<string, string> = { neu: 'Wird eingerichtet', laeuft: 'Liest ein …', fertig: 'Eingelesen', fehler: 'Problem beim Einlesen' };
const ROLLE: Record<string, string> = { behaelter: 'Behälter', system: 'System', verschluss: 'Verschluss' };
const ANSICHTEN = [
  { key: 'pruefung', text: 'In Prüfung', status: 'in_pruefung' },
  { key: 'aktiv', text: 'Aktiv', status: 'aktiv' },
] as const;

export default async function Datenbank({ searchParams }: { searchParams: { ansicht?: string } }) {
  const sb = supabaseServer();
  const [{ data: q }, { data: t }] = await Promise.all([
    sb.from('quellen').select('id, art, katalog_url, pdf_pfad, status, log').order('erstellt_am', { ascending: false }),
    sb.from('teile').select('id, name, rolle, status, material, volumen_ml, bild_pfad, bild_roh_pfad, pipeline, pipeline_log')
      .in('status', ['in_pruefung', 'aktiv']).order('name'),
  ]);
  const quellen = (q ?? []) as Quelle[];
  const alle = (t ?? []) as Teil[];
  const nPruef = alle.filter((x) => x.status === 'in_pruefung').length;
  const ansicht = searchParams.ansicht === 'aktiv' || (!searchParams.ansicht && nPruef === 0) ? 'aktiv' : 'pruefung';
  const status = ansicht === 'aktiv' ? 'aktiv' : 'in_pruefung';
  const teile = alle.filter((x) => x.status === status);
  const links = await bildLinks(teile.map((x) => x.bild_pfad ?? x.bild_roh_pfad));
  const { data: tv } = await sb.from('teil_verschluesse').select('teil_id, verschluss_id');
  const anzahl = new Map<string, number>();
  ((tv ?? []) as { teil_id: string; verschluss_id: string }[]).forEach((p) => {
    anzahl.set(p.teil_id, (anzahl.get(p.teil_id) ?? 0) + 1);
    anzahl.set(p.verschluss_id, (anzahl.get(p.verschluss_id) ?? 0) + 1);
  });
  const laeuft = quellen.some((x) => x.status === 'laeuft') || alle.some((x) => x.pipeline === 'neu' || x.pipeline === 'freigestellt');

  return (
    <>
      <Auffrischen aktiv={laeuft} />
      <div className="st-titelzeile"><h1>Datenbank</h1></div>

      <section style={{ marginBottom: 32 }}>
        <QuelleFormular />
        {quellen.length > 0 && (
          <div className="st-liste" style={{ marginTop: 12, maxWidth: 640 }}>
            {quellen.map((x) => (
              <div className="st-zeile" key={x.id} style={{ flexWrap: 'wrap' }}>
                <b style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>
                  {x.art === 'pdf' ? (x.pdf_pfad?.split('/').pop()?.replace(/^\d+-/, '') ?? 'PDF') : x.katalog_url?.replace(/^https?:\/\//, '')}
                </b>
                <span className="st-status">{Q_STATUS[x.status] ?? x.status}</span>
                {x.log && <span className="st-hilfe" style={{ flexBasis: '100%' }}>{x.log.split('\n')[0].slice(17)}</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <nav className="st-reiter" aria-label="Teile filtern">
          {ANSICHTEN.map((a) => {
            const n = alle.filter((x) => x.status === a.status).length;
            return <a key={a.key} href={`/studio/datenbank?ansicht=${a.key}`} aria-current={ansicht === a.key ? 'page' : undefined}>{a.text} ({n})</a>;
          })}
          {ansicht === 'pruefung' && nPruef > 1 && (
            <form action={statusSetzen} style={{ marginLeft: 'auto' }}>
              <input type="hidden" name="status" value="aktiv" /><input type="hidden" name="alle" value="1" />
              <button className="st-btn" type="submit">Alle {nPruef} freigeben</button>
            </form>
          )}
        </nav>

        {teile.length === 0 ? (
          <div className="st-leer">
            {ansicht === 'pruefung'
              ? <><h2>Nichts zu prüfen</h2><p>Sobald ulba deinen Katalog eingelesen hat, erscheinen die erkannten Teile hier. Du prüfst sie, gibst sie frei, und sie sind bereit für Vorschläge.</p></>
              : <><h2>Noch keine aktiven Teile</h2><p>Füg oben deinen Katalog hinzu und gib die erkannten Teile unter «In Prüfung» frei.</p></>}
          </div>
        ) : (
          <div className="st-raster">
            {teile.map((x) => {
              const bild = links.get(x.bild_pfad ?? x.bild_roh_pfad ?? '');
              const inArbeit = x.pipeline === 'neu' || x.pipeline === 'freigestellt';
              return (
                <article className="st-karte-teil" key={x.id}>
                  <a href={`/studio/datenbank/${x.id}`}>
                    <div className="st-foto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {bild ? <img src={bild} alt="" loading="lazy" /> : <span>Kein Foto</span>}
                    </div>
                    <div className="st-karte-text">
                      <b>{x.name}</b>
                      <span className="st-hilfe">{[ROLLE[x.rolle], x.material, x.volumen_ml ? `${x.volumen_ml} ml` : null].filter(Boolean).join(' · ')}</span>
                      {(anzahl.get(x.id) ?? 0) > 0 && <span className="st-hilfe">{x.rolle === 'verschluss' ? `passt auf ${anzahl.get(x.id)} Behälter` : `${anzahl.get(x.id)} passende Verschlüsse`}</span>}
                      {inArbeit && <span className="st-hilfe">Foto und Daten werden aufbereitet …</span>}
                      {x.pipeline === 'fehler' && <span className="st-warnung">{x.pipeline_log ?? 'Konnte nicht aufbereitet werden'}</span>}
                    </div>
                  </a>
                  {x.status === 'in_pruefung' && (
                    <div className="st-karte-knoepfe">
                      <form action={statusSetzen}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="status" value="aktiv" /><button className="st-ok" type="submit">Freigeben</button></form>
                      <form action={statusSetzen}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="status" value="verworfen" /><button className="st-weg" type="submit">Verwerfen</button></form>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
