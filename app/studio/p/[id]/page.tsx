/* ulba · Projekt — ein Kunde oder Anlass. Reiter: Designs · Teile · Teilen · Anfragen.
   Designs entstehen im Katalog und landen automatisch im offenen Projekt. */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { supabaseServer, bildLinks } from '../../../../lib/supabase/server';
import { designEntfernen, teilEntfernen, linkErstellen, linkWiderrufen, archivieren } from '../../projekte/actions';
import { AktivSetzen, TitelFeld, MarkeFeld, KopierFeld } from './felder';

export const maxDuration = 90;

type Design = { id: string; teil_id: string; welt_name: string | null; hex: string | null; status: string; bild_pfad: string | null; log: string | null };
const REITER = [['designs', 'Designs'], ['teile', 'Teile'], ['teilen', 'Teilen'], ['anfragen', 'Anfragen']] as const;
const feld = { minHeight: 44, padding: '0 12px', border: '1px solid #DAD7D0', borderRadius: 10, fontSize: 14 } as const;

export default async function Projekt({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  const sb = supabaseServer();
  const { data: v } = await sb.from('vorschlaege').select('id, titel, status, marken_url, marken ( name )').eq('id', params.id).maybeSingle();
  if (!v) notFound();
  const p = v as unknown as { id: string; titel: string; status: string; marken_url: string | null; marken: { name: string } | null };
  const tab = REITER.some(([k]) => k === searchParams.tab) ? searchParams.tab! : 'designs';

  const [{ data: d }, { data: pos }, { data: empf }, { data: anf }] = await Promise.all([
    sb.from('studio_renders').select('id, teil_id, welt_name, hex, status, bild_pfad, log').eq('projekt_id', p.id).order('erstellt_am', { ascending: false }),
    sb.from('vorschlag_positionen').select('teil_id').eq('vorschlag_id', p.id),
    sb.from('empfaenger').select('id, name, email, token, widerrufen_am, erstellt_am').eq('vorschlag_id', p.id).order('erstellt_am', { ascending: false }),
    sb.from('musteranfragen').select('id, email, status, nachricht, erstellt_am, teile:teil_id ( name ), empfaenger!inner ( vorschlag_id, name )').eq('empfaenger.vorschlag_id', p.id).order('erstellt_am', { ascending: false }),
  ]);
  const designs = (d ?? []) as Design[];
  const teilIds = Array.from(new Set([...((pos ?? []) as { teil_id: string }[]).map((x) => x.teil_id), ...designs.map((x) => x.teil_id)]));
  const { data: tz } = teilIds.length ? await sb.from('teile').select('id, name, typ, volumen_ml, material, bild_pfad').in('id', teilIds) : { data: [] };
  const teile = (tz ?? []) as { id: string; name: string; typ: string | null; volumen_ml: number | null; material: string | null; bild_pfad: string | null }[];
  const teilVon = new Map(teile.map((t) => [t.id, t]));
  const [renderBild, teilBild] = await Promise.all([bildLinks(designs.map((x) => x.bild_pfad), 'renders'), bildLinks(teile.map((t) => t.bild_pfad))]);
  const fertig = designs.filter((x) => x.status === 'fertig');
  const laeuft = designs.some((x) => x.status === 'laeuft');
  const E = (empf ?? []) as { id: string; name: string | null; email: string | null; token: string; widerrufen_am: string | null }[];
  const A = (anf ?? []) as unknown as { id: string; email: string; status: string; nachricht: string | null; teile: { name: string } | null; empfaenger: { name: string | null } }[];
  const { data: ev } = E.length ? await sb.from('ereignisse').select('empfaenger_id, art').in('empfaenger_id', E.map((x) => x.id)) : { data: [] };
  const zaehl = (eid: string, art: string) => ((ev ?? []) as { empfaenger_id: string; art: string }[]).filter((x) => x.empfaenger_id === eid && x.art === art).length;
  const h = headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const anzahl: Record<string, number> = { designs: fertig.length, teile: teilIds.length, teilen: E.filter((x) => !x.widerrufen_am).length, anfragen: A.length };

  // Designs nach Welt gruppieren
  const gruppen = new Map<string, Design[]>();
  for (const x of designs) { const k = x.welt_name || 'Ohne Welt'; gruppen.set(k, [...(gruppen.get(k) ?? []), x]); }

  return (
    <>
      <AktivSetzen id={p.id} />
      {laeuft && <meta httpEquiv="refresh" content="8" />}
      <div className="pj-kopf">
        <div>
          <TitelFeld id={p.id} titel={p.titel} />
          <p className="pj-meta">{fertig.length} {fertig.length === 1 ? 'Design' : 'Designs'} · {teilIds.length} {teilIds.length === 1 ? 'Teil' : 'Teile'}{p.marken ? ` · für ${p.marken.name}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="st-btn st-btn--hell" href="/studio">Im Katalog weiterarbeiten</Link>
          <Link className="st-btn" href={`/studio/p/${p.id}?tab=teilen`}>Teilen</Link>
        </div>
      </div>

      <nav className="pj-tabs" aria-label="Projekt">
        {REITER.map(([k, t]) => <Link key={k} href={k === 'designs' ? `/studio/p/${p.id}` : `/studio/p/${p.id}?tab=${k}`} aria-current={tab === k ? 'page' : undefined}>{t}{anzahl[k] ? <b>{anzahl[k]}</b> : null}</Link>)}
      </nav>

      {tab === 'designs' && (designs.length === 0 ? (
        <div className="pj-leer">
          <h2>So entsteht dein erstes Design</h2>
          <div className="pj-schritte">
            <div><b>1 · Teil wählen</b>Im Katalog ein Teil suchen und öffnen.</div>
            <div><b>2 · Verschluss</b>Oben im Panel den passenden Verschluss wählen.</div>
            <div><b>3 · Design</b>«In einem Design zeigen» und im Raum eine Welt setzen.</div>
          </div>
          <a className="st-btn" href="/studio">Zum Katalog</a>
        </div>
      ) : (
        Array.from(gruppen.entries()).map(([welt, liste]) => (
          <section key={welt}>
            <h2 className="pj-gruppe-titel">{welt} <span>· {liste.length}</span></h2>
            <div className="pj-raster">
              {liste.map((x) => {
                const bild = x.bild_pfad ? renderBild.get(x.bild_pfad) : undefined;
                return (
                  <figure key={x.id} className="pj-karte">
                    <div className="pj-bild">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {bild ? <img src={bild} alt="" /> : <span className="st-hilfe">{x.status === 'laeuft' ? 'Wird gerendert …' : `Fehler: ${x.log ?? ''}`}</span>}
                    </div>
                    <figcaption><b>{teilVon.get(x.teil_id)?.name ?? 'Teil'}</b><span>{x.hex && <i className="pj-tupf" style={{ background: x.hex }} />}{x.hex ? 'Farbvariante' : welt}</span></figcaption>
                    <form action={designEntfernen}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="design" value={x.id} /><button className="pj-x" type="submit" aria-label="Aus dem Projekt entfernen" title="Aus dem Projekt entfernen">×</button></form>
                  </figure>
                );
              })}
            </div>
          </section>
        ))
      ))}

      {tab === 'teile' && (teile.length === 0 ? (
        <div className="pj-leer"><h2>Noch keine Teile</h2><p>Leg im Katalog Teile mit «+» ins Projekt. Mehrere Teile kannst du gemeinsam in einer Welt rendern — als ganze Linie.</p><a className="st-btn" href="/studio">Zum Katalog</a></div>
      ) : (
        <div className="pj-raster">
          {teile.map((t) => {
            const bild = t.bild_pfad ? teilBild.get(t.bild_pfad) : undefined;
            const n = fertig.filter((x) => x.teil_id === t.id).length;
            return (
              <figure key={t.id} className="pj-karte">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="pj-bild">{bild && <img src={bild} alt="" />}</div>
                <figcaption><b>{t.name}</b><span>{[t.typ, t.volumen_ml ? `${t.volumen_ml} ml` : null].filter(Boolean).join(' · ')} · {n} {n === 1 ? 'Design' : 'Designs'}</span></figcaption>
                <form action={teilEntfernen}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="teil" value={t.id} /><button className="pj-x" type="submit" aria-label="Aus dem Projekt nehmen" title="Aus dem Projekt nehmen">×</button></form>
              </figure>
            );
          })}
        </div>
      ))}

      {tab === 'teilen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 760 }}>
          <section className="st-box" style={{ maxWidth: 'none' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Für welche Marke?</h2>
            <p className="st-hilfe" style={{ margin: 0 }}>Optional. ulba liest die Website und bringt die Produktlinien der Marke als eigene Welten in den Design-Raum.</p>
            <MarkeFeld id={p.id} url={p.marken_url} marke={p.marken?.name ?? null} />
          </section>
          <section className="st-box" style={{ maxWidth: 'none' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Link erstellen</h2>
            {fertig.length === 0 ? <p className="st-hilfe" style={{ margin: 0 }}>Sobald das Projekt ein fertiges Design hat, kannst du es hier als Link teilen.</p> : (
              <>
                <p className="st-hilfe" style={{ margin: 0 }}>Die Marke sieht alle {fertig.length} Designs und kann Muster anfragen — ohne Konto. Jede Person bekommt einen eigenen Link: so siehst du, wer geöffnet und angefragt hat. 90 Tage gültig, jederzeit widerrufbar.</p>
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
            {E.length > 0 && <p className="st-hilfe" style={{ margin: 0 }}>Links sind live: neue Designs dieses Projekts erscheinen automatisch beim nächsten Öffnen.</p>}
          </section>
          <form action={archivieren}><input type="hidden" name="id" value={p.id} /><button type="submit" className="st-abmelden">Projekt archivieren</button></form>
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

