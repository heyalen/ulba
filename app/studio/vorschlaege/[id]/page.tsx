/* ulba · Design-Maske: Marke → Teile → Looks → Rendern (→ Teilen). */
import { notFound } from 'next/navigation';
import { bildLinks, supabaseServer } from '../../../../lib/supabase/server';
import { Auffrischen } from '../../datenbank/auffrischen';
import { MarkeFormular } from '../marke-formular';
import { briefingSpeichern, capSetzen, lookUmschalten, rendernStarten, teilUmschalten, weltHinzufuegen } from '../actions';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

type Teil = { id: string; name: string; rolle: string; material: string | null; volumen_ml: number | null; bild_pfad: string | null };
type Look = { id: string; linie_name: string; quelle: string; design_komponenten: any };

const Schritt = ({ n, titel, children }: { n: number; titel: string; children: React.ReactNode }) => (
  <section style={{ border: '1px solid #E7E5E0', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: '#FFFFFF' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 24, height: 24, borderRadius: 12, background: '#1A1A1A', color: '#FFFFFF', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{titel}</h2>
    </div>
    {children}
  </section>
);
const farbe = (h: any) => (typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h) ? h : '#EDEDED');
const tupfen = (c: string): React.CSSProperties => ({ width: 16, height: 16, borderRadius: 8, background: c, border: '1px solid rgba(0,0,0,.15)', display: 'inline-block' });

export default async function DesignMaske({ params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: v } = await sb.from('vorschlaege').select('id, titel, status, marken_url, marke_id, briefing_text, marken ( name )').eq('id', params.id).maybeSingle();
  if (!v) notFound();
  const vor = v as any;
  const [{ data: teile }, { data: pos }, { data: ri }, { data: looks }, { data: welten }, { data: rend }, { data: tv }] = await Promise.all([
    sb.from('teile').select('id, name, rolle, material, volumen_ml, bild_pfad').eq('status', 'aktiv').neq('rolle', 'verschluss').order('name'),
    sb.from('vorschlag_positionen').select('id, teil_id, cap_id, reihenfolge').eq('vorschlag_id', vor.id).order('reihenfolge'),
    sb.from('vorschlag_richtungen').select('id, marken_look_id, reihenfolge').eq('vorschlag_id', vor.id).order('reihenfolge'),
    vor.marke_id ? sb.from('marken_looks').select('id, linie_name, quelle, design_komponenten').eq('marke_id', vor.marke_id).order('erstellt_am') : Promise.resolve({ data: [] as any[] }),
    sb.from('design_welten').select('id, name').order('name'),
    sb.from('renders').select('position_id, richtung_id, status, bild_pfad, log').eq('vorschlag_id', vor.id),
    sb.from('teil_verschluesse').select('teil_id, verschluss_id, teile:verschluss_id ( id, name )'),
  ]);
  const T = (teile ?? []) as Teil[];
  const P = (pos ?? []) as any[];
  const R = (ri ?? []) as any[];
  const L = (looks ?? []) as Look[];
  const gewaehlt = new Set(P.map((p) => p.teil_id));
  const lookAn = new Set(R.map((r) => r.marken_look_id));
  const caps = new Map<string, { id: string; name: string }[]>();
  ((tv ?? []) as any[]).forEach((x) => { if (x.teile) caps.set(x.teil_id, [...(caps.get(x.teil_id) ?? []), x.teile]); });
  const renders = new Map(((rend ?? []) as any[]).map((r) => [`${r.position_id}|${r.richtung_id}`, r]));
  const [teilBilder, renderBilder] = await Promise.all([bildLinks(T.map((t) => t.bild_pfad)), bildLinks(((rend ?? []) as any[]).map((r) => r.bild_pfad), 'renders')]);
  const teilVon = new Map(T.map((t) => [t.id, t]));
  const lookVon = new Map(L.map((l) => [l.id, l]));
  const laeuft = ((rend ?? []) as any[]).some((r) => r.status === 'laeuft');
  const offen = R.length * P.length - ((rend ?? []) as any[]).filter((r) => r.status === 'fertig').length;
  const kannRendern = P.length > 0 && R.length > 0 && !laeuft;

  return (
    <>
      <Auffrischen aktiv={laeuft} />
      <p style={{ marginBottom: 12 }}><a href="/studio" style={{ fontSize: 14 }}>← Vorschläge</a></p>
      <div className="st-titelzeile">
        <h1>{vor.titel}</h1>
        <span className="st-status">{vor.status === 'geteilt' ? 'Geteilt' : 'Entwurf'}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 340px', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Schritt n={1} titel="Für welche Marke?">
            <MarkeFormular id={vor.id} url={vor.marken_url} />
            {vor.marken?.name && <p className="st-hilfe">Erkannt: <b style={{ color: '#1A1A1A' }}>{vor.marken.name}</b> · {L.filter((l) => l.quelle === 'gelesen').length} Produktlinien</p>}
          </Schritt>

          <Schritt n={2} titel="Welche Teile?">
            {T.length === 0 ? <p className="st-hilfe">Noch keine aktiven Teile. Gib zuerst in der <a href="/studio/datenbank">Datenbank</a> Teile frei.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
                {T.map((t) => {
                  const an = gewaehlt.has(t.id);
                  return (
                    <form key={t.id} action={teilUmschalten}>
                      <input type="hidden" name="id" value={vor.id} /><input type="hidden" name="teil" value={t.id} />
                      <button type="submit" aria-pressed={an} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 8, minHeight: 52, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        background: '#FFFFFF', border: an ? '1.5px solid #1A1A1A' : '1px solid #E7E5E0' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {teilBilder.get(t.bild_pfad ?? '') ? <img src={teilBilder.get(t.bild_pfad ?? '')} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} /> : <span style={{ width: 40 }} />}
                        <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</span>
                          <span className="st-hilfe">{[t.material, t.volumen_ml ? `${t.volumen_ml} ml` : null].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{an ? '✓' : '+'}</span>
                      </button>
                    </form>
                  );
                })}
              </div>
            )}
          </Schritt>

          <Schritt n={3} titel="Welche Looks zeigen?">
            {!vor.marke_id ? <p className="st-hilfe">Erst die Marke lesen — dann erscheinen hier ihre Produktlinien.</p> : (
              <>
                <p className="st-hilfe">Angehakte Looks sieht die Marke und kann zwischen ihnen wechseln.</p>
                {L.map((l) => {
                  const an = lookAn.has(l.id);
                  const k = l.design_komponenten || {};
                  return (
                    <form key={l.id} action={lookUmschalten}>
                      <input type="hidden" name="id" value={vor.id} /><input type="hidden" name="look" value={l.id} />
                      <button type="submit" aria-pressed={an} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', minHeight: 52, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        background: an ? '#F3F2EE' : '#FFFFFF', border: an ? '1.5px solid #1A1A1A' : '1px solid #E7E5E0' }}>
                        <span style={{ display: 'flex', gap: 3 }}><span style={tupfen(farbe(k.Body_Hex))} /><span style={tupfen(farbe(k.Cap_Hex))} /></span>
                        <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{l.linie_name}</span>
                          <span className="st-hilfe">{l.quelle === 'gelesen' ? (k.beschreibung || 'Linie der Marke') : 'Neue Richtung aus Design-Welt'}</span>
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{an ? '✓' : '+'}</span>
                      </button>
                    </form>
                  );
                })}
                <form action={weltHinzufuegen} style={{ display: 'flex', gap: 8 }}>
                  <input type="hidden" name="id" value={vor.id} />
                  <select name="welt" aria-label="Design-Welt" defaultValue="" style={{ flex: 1, minHeight: 44, borderRadius: 10, border: '1px solid #DAD7D0', padding: '0 10px', fontSize: 14 }}>
                    <option value="" disabled>Neue Richtung aus Design-Welt …</option>
                    {((welten ?? []) as any[]).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  <button className="st-btn st-btn--hell" type="submit">Hinzufügen</button>
                </form>
              </>
            )}
          </Schritt>
        </div>

        <div style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, flex: 1 }}>Vorschau</h2>
            <span className="st-hilfe" style={{ border: '1px solid #DAD7D0', borderRadius: 999, padding: '4px 10px' }}>KI-Visualisierung</span>
            <form action={rendernStarten}>
              <input type="hidden" name="id" value={vor.id} />
              <button className="st-btn" type="submit" disabled={!kannRendern || offen <= 0}>
                {laeuft ? 'Rendert …' : offen > 0 ? `${offen} Render${offen === 1 ? '' : 's'} erstellen` : 'Alles gerendert'}
              </button>
            </form>
          </div>

          <form action={briefingSpeichern} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="hidden" name="id" value={vor.id} />
            <input name="briefing" defaultValue={vor.briefing_text ?? ''} placeholder="Anpassen, z. B. Verschluss schwarz statt gold, für Gen Z" aria-label="Look anpassen"
              style={{ flex: '1 1 320px', minHeight: 44, padding: '0 12px', fontSize: 14, border: '1px solid #DAD7D0', borderRadius: 10, background: '#FFFFFF' }} />
            <button className="st-btn st-btn--hell" type="submit">Anwenden</button>
          </form>

          {P.length === 0 || R.length === 0 ? (
            <div className="st-leer"><h2>Noch nichts zu zeigen</h2><p>Wähle links eine Marke, mindestens ein Teil und einen Look. Dann «Renders erstellen».</p></div>
          ) : P.map((p) => {
            const t = teilVon.get(p.teil_id);
            const moeglich = caps.get(p.teil_id) ?? [];
            return (
              <div key={p.id} className="st-box" style={{ maxWidth: 'none' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  <b style={{ flex: 1, fontSize: 15 }}>{t?.name ?? 'Teil'}</b>
                  {moeglich.length > 0 && (
                    <form action={capSetzen} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="hidden" name="id" value={vor.id} /><input type="hidden" name="pos" value={p.id} />
                      <label className="st-hilfe" htmlFor={`cap-${p.id}`}>Verschluss</label>
                      <select id={`cap-${p.id}`} name="cap" defaultValue={p.cap_id ?? ''} style={{ minHeight: 40, borderRadius: 9, border: '1px solid #DAD7D0', padding: '0 8px', fontSize: 13, maxWidth: 260 }}>
                        <option value="">Ohne separaten Verschluss</option>
                        {moeglich.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button className="st-btn st-btn--hell" type="submit" style={{ minHeight: 40, padding: '0 12px', fontSize: 13 }}>Übernehmen</button>
                    </form>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {R.map((r) => {
                    const x = renders.get(`${p.id}|${r.id}`);
                    const bild = x?.bild_pfad ? renderBilder.get(x.bild_pfad) : undefined;
                    return (
                      <figure key={r.id} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="st-foto" style={{ borderRadius: 12, border: '1px solid #E7E5E0' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {bild ? <img src={bild} alt="" /> : <span>{x?.status === 'laeuft' ? 'Wird gerendert …' : x?.status === 'fehler' ? `Fehler: ${x.log ?? ''}` : 'Noch nicht gerendert'}</span>}
                        </div>
                        <figcaption className="st-hilfe">{lookVon.get(r.marken_look_id)?.linie_name}</figcaption>
                      </figure>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
