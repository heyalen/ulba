/* ulba · Vorschlag — das Raster: Zeilen = Teile, Spalten = Design-Richtungen,
   Zellen = Designs. Reiter: Designs · Teilen · Anfragen. */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { supabaseServer } from '../../../../lib/supabase/server';
import { linkErstellen, linkWiderrufen, archivieren } from '../../projekte/actions';
import { RasterDaten, ladeKatalog, type SpalteRoh } from './raster-daten';
import { TitelFeld, KopierFeld } from './felder';

export const maxDuration = 150;

const REITER = [['raster', 'Designs'], ['teilen', 'Link teilen'], ['anfragen', 'Anfragen']] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const feld = { minHeight: 44, padding: '0 12px', border: '1px solid #DAD7D0', borderRadius: 10, fontSize: 14 } as const;

export default async function Projekt({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  if (!UUID.test(params.id)) notFound();
  const sb = supabaseServer();
  const tab = REITER.some(([k]) => k === searchParams.tab) ? searchParams.tab! : 'raster';
  const pid = params.id;
  // Alles in EINER Runde: Vorschlag, Raster, Links, Anfragen — und der Katalog läuft schon parallel los
  const katalog = tab === 'raster' ? ladeKatalog() : null;
  const [{ data: v }, { data: cols }, { data: pos }, { data: d }, { data: empf }, { data: anf }, { data: ev }] = await Promise.all([
    sb.from('vorschlaege').select('id, titel, status, marken_url, marken ( name )').eq('id', pid).maybeSingle(),
    sb.from('vorschlag_richtungen').select('id, reihenfolge, richtung_id, wunsch_text, richtungen ( id, name, beschreibung, felder, quelle, bild_pfad )').eq('vorschlag_id', pid).not('richtung_id', 'is', null).order('reihenfolge'),
    sb.from('vorschlag_positionen').select('id, teil_id, cap_id, reihenfolge').eq('vorschlag_id', pid).order('reihenfolge'),
    sb.from('studio_renders').select('id, teil_id, cap_id, welt_id, status, log, bild_pfad').eq('projekt_id', pid).eq('welt_art', 'richtung').order('erstellt_am'),
    sb.from('empfaenger').select('id, name, email, token, widerrufen_am, erstellt_am').eq('vorschlag_id', pid).order('erstellt_am', { ascending: false }),
    sb.from('musteranfragen').select('id, email, status, nachricht, erstellt_am, teile:teil_id ( name ), empfaenger!inner ( vorschlag_id, name )').eq('empfaenger.vorschlag_id', pid).order('erstellt_am', { ascending: false }),
    tab === 'teilen' ? sb.from('ereignisse').select('empfaenger_id, art, empfaenger!inner ( vorschlag_id )').eq('empfaenger.vorschlag_id', pid) : Promise.resolve({ data: [] }),
  ]);
  if (!v) notFound();
  const p = v as unknown as { id: string; titel: string; status: string; marken_url: string | null; marken: { name: string } | null };
  const zellen = new Map<string, { id: string; teil_id: string; cap_id: string | null; welt_id: string; status: string; log: string | null; bild_pfad: string | null }>();
  for (const z of (d ?? []) as { id: string; teil_id: string; cap_id: string | null; welt_id: string; status: string; log: string | null; bild_pfad: string | null }[]) zellen.set(`${z.teil_id}|${z.welt_id}`, z);
  const fertig = Array.from(zellen.values()).filter((z) => z.status === 'fertig').length;
  const E = (empf ?? []) as { id: string; name: string | null; email: string | null; token: string; widerrufen_am: string | null }[];
  const A = (anf ?? []) as unknown as { id: string; email: string; status: string; nachricht: string | null; teile: { name: string } | null; empfaenger: { name: string | null } }[];
  const zaehl = (eid: string, art: string) => ((ev ?? []) as { empfaenger_id: string; art: string }[]).filter((x) => x.empfaenger_id === eid && x.art === art).length;
  const h = headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const P = (pos ?? []) as { id: string; teil_id: string; cap_id: string | null }[];
  const anzahl: Record<string, number> = { raster: fertig, teilen: E.filter((x) => !x.widerrufen_am).length, anfragen: A.length };

  return (
    <>
      <div className="pj-kopf">
        <div>
          <TitelFeld key={p.titel} id={p.id} titel={p.titel} />
          <p className="pj-meta">{P.length} {P.length === 1 ? 'Teil' : 'Teile'} · {(cols ?? []).length} {(cols ?? []).length === 1 ? 'Richtung' : 'Richtungen'} · {fertig} {fertig === 1 ? 'Design' : 'Designs'}</p>
        </div>
      </div>

      <nav className="pj-tabs" aria-label="Vorschlag">
        {REITER.map(([k, t]) => <Link key={k} href={k === 'raster' ? `/studio/p/${p.id}` : `/studio/p/${p.id}?tab=${k}`} aria-current={tab === k ? 'page' : undefined}>{t}{anzahl[k] ? <b>{anzahl[k]}</b> : null}</Link>)}
      </nav>

      {tab === 'raster' && katalog && <RasterDaten vid={p.id} katalog={katalog} links={anzahl.teilen} cols={(cols ?? []) as unknown as SpalteRoh[]} pos={P} zellen={Array.from(zellen.values())} />}

      {tab === 'teilen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 760 }}>
          <section className="st-box" style={{ maxWidth: 'none' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Link erstellen</h2>
            {fertig === 0 ? <p className="st-hilfe" style={{ margin: 0 }}>Sobald der Vorschlag ein fertiges Design hat, kannst du es hier als Link teilen.</p> : (
              <>
                <p className="st-hilfe" style={{ margin: 0 }}>Die Marke sieht alle {fertig} Designs und kann Muster anfragen — ohne Konto. Jede Person bekommt einen eigenen Link: so siehst du, wer geöffnet und angefragt hat. 90 Tage gültig, jederzeit widerrufbar.</p>
                <form action={linkErstellen} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  <input type="hidden" name="id" value={p.id} />
                  <input name="name" placeholder="Name der Person" aria-label="Name" style={feld} />
                  <input name="email" type="email" placeholder="E-Mail (optional)" aria-label="E-Mail" style={feld} />
                  <textarea name="nachricht" rows={2} placeholder="Persönliche Nachricht (erscheint oben im Vorschlag)" aria-label="Persönliche Nachricht" style={{ ...feld, gridColumn: '1 / -1', padding: 12, fontFamily: 'inherit' }} />
                  <button className="st-btn" type="submit" style={{ justifySelf: 'start' }}>Link erstellen</button>
                </form>
              </>
            )}
            {E.map((x) => (
              <div key={x.id} className="st-zeile" style={{ flexWrap: 'wrap', opacity: x.widerrufen_am ? 0.5 : 1 }}>
                <b style={{ fontWeight: 500 }}>{x.name || x.email || 'Empfänger'}</b>
                <span className="st-hilfe">{x.widerrufen_am ? 'widerrufen' : `${zaehl(x.id, 'geoeffnet')}× geöffnet · ${zaehl(x.id, 'muster_angefragt')} Muster angefragt`}</span>
                {!x.widerrufen_am && (
                  <>
                    <KopierFeld wert={`${origin}/v/${x.token}`} />
                    <a href={`/v/${x.token}`} target="_blank" rel="noopener" style={{ fontSize: 13 }}>Ansehen ↗</a>
                    <form action={linkWiderrufen}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="empfaenger" value={x.id} /><button type="submit" className="st-abmelden" style={{ minHeight: 32 }}>Widerrufen</button></form>
                  </>
                )}
              </div>
            ))}
            {E.length > 0 && <p className="st-hilfe" style={{ margin: 0 }}>Links sind live: neue Designs dieses Vorschlags erscheinen automatisch beim nächsten Öffnen.</p>}
          </section>
          <form action={archivieren}><input type="hidden" name="id" value={p.id} /><button type="submit" className="st-abmelden">Vorschlag archivieren</button></form>
        </div>
      )}

      {tab === 'anfragen' && (A.length === 0 ? (
        <div className="pj-leer"><h2>Noch keine Anfragen</h2><p>Fragt die Marke über deinen Link Muster an, erscheint das hier.</p></div>
      ) : (
        <div className="st-liste">
          {A.map((a) => (
            <div className="st-zeile" key={a.id} style={{ flexWrap: 'wrap' }}>
              <b>{a.teile?.name ?? 'Teil'}</b>
              <span className="st-hilfe">{a.empfaenger?.name ? `${a.empfaenger.name} · ` : ''}{a.email}</span>
              {a.nachricht && <span className="st-hilfe" style={{ flexBasis: '100%' }}>«{a.nachricht}»</span>}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

