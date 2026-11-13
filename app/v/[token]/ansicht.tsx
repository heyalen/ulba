'use client';
/* ulba · Empfängerseite als persönliches Lookbook: Absender, Richtungen als Schalter,
   grosses Bild, Vergleich zweier Richtungen, Fakten-Schublade, ♥, Muster, Anpassen-Wunsch,
   Weiterleiten mit eigenem Unterlink, PDF über den Druckdialog. */
import { useEffect, useRef, useState, useTransition } from 'react';
import type { Ansicht, Fakten } from './daten';
import { CHIPS } from '../../../lib/richtung';
import { anpassenWuenschen, ereignis, musterAnfragen, teamBeitreten, weiterleiten } from './actions';
import './v.css';

type T = Ansicht['teile'][number];
type Fenster = null | { art: 'ich' } | { art: 'fakten'; t: T } | { art: 'anpassen'; t: T; spalte: string } | { art: 'weiter' } | { art: 'muster' };
const schluessel = (teilId: string, spalte: string) => `${teilId}|${spalte}`;
/* Karte nimmt die Farbe des Looks an; Schrift je nach Helligkeit dunkel oder hell */
const hell = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150; };
const farben = (hex: string | null | undefined): React.CSSProperties => { const f = hex ?? '#E9E2D6'; return { '--farbe': f, '--auf': hell(f) ? '#0E0E0E' : '#F6F1EA' } as React.CSSProperties; };

function FaktenListe({ f }: { f: Fakten }) {
  const zeilen: [string, string | null][] = [
    ['Material', f.material], ['Volumen', f.volumen ? `${f.volumen} ml` : null], ['Hals', f.hals], ['Verschluss', f.verschluss],
    ['Dekoration', f.deko || null], ['Rezyklat (PCR)', f.pcr !== null ? `bis ${f.pcr} %` : null], ['Mindestmenge', f.moq ? `${f.moq.toLocaleString('de-CH')} Stk.` : null],
  ];
  const da = zeilen.filter(([, w]) => w);
  return da.length ? <dl className="lb-fakten">{da.map(([k, w]) => <div key={k}><dt>{k}</dt><dd>{w}</dd></div>)}</dl> : <p className="lb-leise">Noch keine technischen Angaben hinterlegt.</p>;
}

export function VorschlagAnsicht({ token: linkToken, a }: { token: string; a: Ansicht }) {
  // Team-Link: nach einmaliger Angabe von Name + E-Mail läuft alles über den eigenen Unterlink
  const [ich, setIch] = useState<{ token: string; email: string } | null>(null);
  useEffect(() => { try { const r = localStorage.getItem(`ulba_ich_${linkToken}`); if (r) setIch(JSON.parse(r)); } catch { /* egal */ } }, [linkToken]);
  const token = ich?.token ?? linkToken;
  const danach = useRef<(() => void) | null>(null);
  const alsIch = (fn: () => void) => { if (a.team && !ich) { danach.current = fn; setFenster({ art: 'ich' }); } else fn(); };
  // Kartenleiste links: aktiver Abschnitt + Fortschritt (Punkt)
  const [sek, setSek] = useState({ i: 0, p: 0 });
  useEffect(() => {
    let raf = 0;
    const mess = () => {
      raf = 0;
      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-sek]'));
      const mitte = window.innerHeight * 0.45;
      let i = 0;
      els.forEach((el, k) => { if (el.getBoundingClientRect().top <= mitte) i = k; });
      const r = els[i]?.getBoundingClientRect();
      const p = r ? Math.min(1, Math.max(0, (mitte - r.top) / Math.max(1, r.height))) : 0;
      setSek((alt) => (alt.i === i && Math.abs(alt.p - p) < 0.01 ? alt : { i, p }));
    };
    const an = () => { if (!raf) raf = requestAnimationFrame(mess); };
    mess(); window.addEventListener('scroll', an, { passive: true }); window.addEventListener('resize', an);
    return () => { window.removeEventListener('scroll', an); window.removeEventListener('resize', an); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const springe = (k: number) => document.querySelectorAll<HTMLElement>('[data-sek]')[k]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const [akt, setAkt] = useState(a.richtungen[0]?.id ?? '');
  // Jede Karte zeigt ihren eigenen Look: oben gewählt, sonst der erste, der für dieses Teil gerendert ist
  const [karte, setKarte] = useState<Record<string, string>>({});
  const lookVon = (t: T) => karte[t.posId] && t.renders[karte[t.posId]] ? karte[t.posId] : t.renders[akt] ? akt : a.richtungen.find((r) => t.renders[r.id])?.id ?? akt;
  const [vergleich, setVergleich] = useState<string | null>(null);
  const [herz, setHerz] = useState<Record<string, boolean>>({});
  const [liste, setListe] = useState<Record<string, boolean>>({});
  const [gesendet, setGesendet] = useState<Record<string, boolean>>({});
  const [fenster, setFenster] = useState<Fenster>(null);
  const [fertig, setFertig] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [neuLink, setNeuLink] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState(false);
  const [laeuft, start] = useTransition();

  const rName = (id: string) => a.richtungen.find((r) => r.id === id)?.name ?? '';
  const aktR = a.richtungen.find((r) => r.id === akt);
  const gewaehlt = Object.keys(liste).filter((k) => liste[k] && !gesendet[k]);
  const teilVon = (id: string) => a.teile.find((t) => t.teilId === id);

  useEffect(() => {
    const esc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') zu(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  function zu() { setFenster(null); setFertig(null); setFehler(null); setChips([]); setNeuLink(null); setKopiert(false); }
  function waehle(id: string) {
    if (id === akt) return;
    if (id === vergleich) setVergleich(akt);
    setAkt(id); setKarte({}); ereignis(token, 'richtung_gewaehlt', null, id);
  }
  function vergleichen(id: string | null) { setVergleich(id); if (id) ereignis(token, 'verglichen', null, id); }
  function ichSenden(f: FormData) {
    setFehler(null);
    start(async () => {
      const r = await teamBeitreten(linkToken, String(f.get('name') ?? ''), String(f.get('email') ?? ''));
      if (!r.ok || !r.token) { setFehler(r.fehler ?? 'Fehler'); return; }
      const neu = { token: r.token, email: r.email ?? '' };
      setIch(neu); try { localStorage.setItem(`ulba_ich_${linkToken}`, JSON.stringify(neu)); } catch { /* egal */ }
      setFenster(null); setFehler(null);
      const fn = danach.current; danach.current = null;
      // die gemerkte Aktion läuft nach dem Neu-Rendern mit dem eigenen Token
      if (fn) setTimeout(fn, 0);
    });
  }
  function herzen(t: T, spalte: string) {
    const k = schluessel(t.teilId, spalte), an = !herz[k];
    setHerz((h) => ({ ...h, [k]: an }));
    if (an) ereignis(token, 'gefaellt', t.teilId, spalte);
  }
  function drucken() { ereignis(token, 'pdf_export', null); setTimeout(() => window.print(), 50); }

  function musterSenden(f: FormData) {
    setFehler(null);
    start(async () => {
      const designs = gewaehlt.map((k) => { const [teilId, spalteId] = k.split('|'); return { teilId, spalteId: spalteId || null }; });
      const r = await musterAnfragen(token, designs, String(f.get('email') ?? ''), String(f.get('nachricht') ?? ''));
      if (!r.ok) { setFehler(r.fehler ?? 'Fehler'); return; }
      setGesendet((g) => ({ ...g, ...Object.fromEntries(gewaehlt.map((k) => [k, true])) }));
      setListe({}); setFertig(`${a.lieferant} meldet sich per E-Mail bei Ihnen.`);
    });
  }
  function wunschSenden(f: FormData) {
    if (fenster?.art !== 'anpassen') return;
    const { t, spalte } = fenster;
    setFehler(null);
    start(async () => {
      const r = await anpassenWuenschen(token, t.teilId, spalte, chips, String(f.get('notiz') ?? ''));
      if (!r.ok) { setFehler(r.fehler ?? 'Fehler'); return; }
      setFertig(`${a.lieferant} bekommt Ihren Wunsch als neue Variante und meldet sich, sobald sie fertig ist.`);
    });
  }
  function weiterSenden(f: FormData) {
    setFehler(null);
    start(async () => {
      const r = await weiterleiten(token, String(f.get('name') ?? ''), String(f.get('email') ?? ''));
      if (!r.ok || !r.token) { setFehler(r.fehler ?? 'Fehler'); return; }
      setNeuLink(`${window.location.origin}/v/${r.token}`);
    });
  }
  async function kopieren(text: string) { try { await navigator.clipboard.writeText(text); setKopiert(true); } catch { setKopiert(false); } }


  return (
    <div className="lb">
     <div className="lb-geruest">
      <nav className="lb-rail lb-nodruck" aria-label="Inhalt">
        {[
          { nr: '00', txt: a.lieferant, stil: { '--farbe': '#FFFFFF', '--auf': '#0E0E0E' } as React.CSSProperties, logo: true },
          ...a.teile.map((t, k) => ({ nr: String(k + 1).padStart(2, '0'), txt: t.name, stil: farben(a.richtungen.find((r) => r.id === lookVon(t))?.hex), logo: false })),
          ...(a.absender?.email ? [{ nr: String(a.teile.length + 1).padStart(2, '0'), txt: 'Kontakt', stil: { '--farbe': '#0E0E0E', '--auf': '#F4EDE4' } as React.CSSProperties, logo: false }] : []),
        ].map((it, k) => (
          <button key={k} className={`lb-rail-k${sek.i === k ? ' an' : ''}`} style={it.stil} onClick={() => springe(k)} aria-current={sek.i === k ? 'true' : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {it.logo && a.logo ? <img src={a.logo} alt="" className="lb-rail-logo" /> : <span className="lb-rail-nr">{it.nr}</span>}
            <span className="lb-rail-txt">{it.txt}</span>
            {sek.i === k && <i className="lb-rail-punkt" style={{ top: `calc(18px + ${Math.round(sek.p * 1000) / 10}% * 0.78)` }} aria-hidden="true" />}
          </button>
        ))}
      </nav>
      <div className="lb-spalte">
      <header className="lb-kopf">
        <div className="lb-innen lb-kopf-zeile">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {a.logo ? <img className="lb-logo" src={a.logo} alt={a.lieferant} /> : <span className="lb-logo lb-logo--text" aria-hidden="true">{a.lieferant.charAt(0)}</span>}
          <span className="lb-firma">{a.lieferant}</span>
          <span className="lb-luft" />
          <button className="lb-btn lb-btn--hell lb-nodruck" onClick={() => setFenster({ art: 'weiter' })}>Weiterleiten</button>
          <button className="lb-btn lb-btn--hell lb-nodruck" onClick={drucken}>PDF</button>
        </div>
      </header>

      <main className="lb-innen lb-haupt">
        <section className="lb-box lb-intro" data-sek="">
          <span className="lb-klammer">({a.empfaengerName ? `Lookbook für ${a.empfaengerName}` : 'Lookbook'})</span>
          <h1>{a.marke ? `Ideen für ${a.marke}` : a.titel}</h1>
          {a.absender && (
            <div className="lb-absender">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {a.absender.foto ? <img className="lb-foto" src={a.absender.foto} alt="" /> : <span className="lb-foto lb-foto--text" aria-hidden="true">{a.absender.name.charAt(0).toUpperCase()}</span>}
              <div>
                <b>{a.absender.name}</b>
                <span className="lb-leise">{[a.absender.titel, a.lieferant].filter(Boolean).join(' · ')}</span>
                <span className="lb-kontakt">
                  {a.absender.email && <a href={`mailto:${a.absender.email}`}>{a.absender.email}</a>}
                  {a.absender.telefon && <a href={`tel:${a.absender.telefon.replace(/[^\d+]/g, '')}`}>{a.absender.telefon}</a>}
                </span>
              </div>
            </div>
          )}
          {a.nachricht && <p className="lb-nachricht">{a.nachricht}</p>}
          {a.weitergeleitetVon && <p className="lb-leise">Weitergeleitet von {a.weitergeleitetVon}.</p>}
          {a.einleitung && <p className="lb-nachricht">{a.einleitung}</p>}
          <p className="lb-leise lb-zahl">{a.teile.length} Teil{a.teile.length === 1 ? '' : 'e'} · {a.richtungen.length} Richtung{a.richtungen.length === 1 ? '' : 'en'} · alle Teile sind bei {a.lieferant} lieferbar</p>
        </section>

        {a.richtungen.length > 0 && (
          <section className="lb-schalter lb-nodruck" aria-label="Richtungen">
            <div role="tablist" className="lb-pillen">
              {a.richtungen.map((r) => (
                <button key={r.id} role="tab" aria-selected={r.id === akt} className={`lb-pille${r.id === akt ? ' an' : ''}${r.id === vergleich ? ' vgl' : ''}`} onClick={() => waehle(r.id)}>
                  <i style={{ background: r.hex ?? '#E8E4DC' }} />{r.name}
                </button>
              ))}
            </div>
            {a.richtungen.length > 1 && (
              <div className="lb-vergleich">
                <span className="lb-leise">Vergleichen mit</span>
                {a.richtungen.filter((r) => r.id !== akt).map((r) => (
                  <button key={r.id} className={`lb-chip${r.id === vergleich ? ' an' : ''}`} aria-pressed={r.id === vergleich} onClick={() => vergleichen(r.id === vergleich ? null : r.id)}>{r.name}</button>
                ))}
              </div>
            )}
            {aktR?.beschreibung && !vergleich && <p className="lb-leise lb-beschr">{aktR.beschreibung}</p>}
          </section>
        )}

        <section className="lb-teile" aria-label="Designs">
          {a.teile.map((t, i) => {
            const tl = lookVon(t), tR = a.richtungen.find((r) => r.id === tl);
            const sp = vergleich ? [tl, vergleich === tl ? akt : vergleich] : [tl];
            const k = schluessel(t.teilId, tl), auf = !!liste[k], weg = !!gesendet[k];
            const eigene = a.richtungen.filter((r) => t.renders[r.id]);
            return (
              <article key={t.posId} className="lb-box lb-teil" style={farben(tR?.hex)} data-sek="">
                <div className={`lb-bilder${sp.length > 1 ? ' zwei' : ''}`}>
                  {sp.map((s) => {
                    const bild = t.renders[s], hk = schluessel(t.teilId, s);
                    return (
                      <figure key={s} className="lb-buehne">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {bild ? <img src={bild} alt={`${t.name} in der Richtung ${rName(s)}`} /> : <span className="lb-leise">Für diese Richtung noch kein Design</span>}
                        {bild && <button className={`lb-herz lb-nodruck${herz[hk] ? ' an' : ''}`} aria-pressed={!!herz[hk]} aria-label={herz[hk] ? 'Gefällt mir entfernen' : 'Gefällt mir'} onClick={() => alsIch(() => herzen(t, s))}>{herz[hk] ? '♥' : '♡'}</button>}
                        <figcaption>{sp.length > 1 && <b>{rName(s)}</b>}<span>Basiert auf echtem Studiofoto</span></figcaption>
                      </figure>
                    );
                  })}
                </div>
                <div className="lb-teil-text">
                  <div>
                    <span className="lb-nr" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    {eigene.length > 1 && !vergleich ? (
                      <div className="lb-kartenlooks lb-nodruck" role="radiogroup" aria-label={`Look für ${t.name}`}>
                        {eigene.map((r) => <button key={r.id} role="radio" aria-checked={r.id === tl} className={`lb-chip${r.id === tl ? ' an' : ''}`} onClick={() => { setKarte((m) => ({ ...m, [t.posId]: r.id })); ereignis(token, 'richtung_gewaehlt', t.teilId, r.id); }}>{r.name}</button>)}
                      </div>
                    ) : <span className="lb-klammer">({rName(tl)}{vergleich ? ` / ${rName(sp[1])}` : ''})</span>}
                    <h2>{t.name}</h2>
                    <p className="lb-leise">{[t.fakten.volumen ? `${t.fakten.volumen} ml` : null, t.fakten.material, t.fakten.verschluss].filter(Boolean).join(' · ')}</p>
                    {t.satz && <p className="lb-satz">{t.satz}</p>}
                  </div>
                  <div className="lb-aktionen lb-nodruck">
                    <button className="lb-btn lb-btn--hell" onClick={() => setFenster({ art: 'fakten', t })}>Fakten</button>
                    {t.renders[tl] && <button className="lb-btn lb-btn--hell" onClick={() => alsIch(() => setFenster({ art: 'anpassen', t, spalte: tl }))}>Anpassen wünschen</button>}
                    {weg ? <span className="lb-ok">✓ Muster angefragt</span> : t.renders[tl] && (
                      <button className={`lb-btn${auf ? ' lb-btn--hell an' : ''}`} aria-pressed={auf} onClick={() => setListe((l) => ({ ...l, [k]: !auf }))}>{auf ? 'Auf der Musterliste ✓' : 'Muster anfragen'}</button>
                    )}
                  </div>
                  <div className="lb-nurdruck"><FaktenListe f={t.fakten} /></div>
                </div>
              </article>
            );
          })}
        </section>

        {a.absender?.email && (
          <section className="lb-box lb-schluss lb-nodruck" data-sek="">
            <span className="lb-klammer">(Kontakt)</span>
            <h2>Sprechen wir darüber.</h2>
            <p>{a.absender.name}{a.absender.titel ? `, ${a.absender.titel}` : ''} · {a.lieferant}</p>
            <div className="lb-aktionen">
              <a className="lb-btn" href={`mailto:${a.absender.email}?subject=${encodeURIComponent(a.marke ? `Ideen für ${a.marke}` : a.titel)}`}>E-Mail an {a.absender.name.split(' ')[0]}</a>
              {a.absender.telefon && <a className="lb-btn lb-btn--hell" href={`tel:${a.absender.telefon.replace(/[^\d+]/g, '')}`}>{a.absender.telefon}</a>}
            </div>
          </section>
        )}

        <p className="lb-fuss">
          Die Bilder sind Visualisierungen auf Basis echter Studiofotos der lieferbaren Teile, kein finales Design.
          Datenschutz: {a.lieferant} sieht, wann Sie dieses Lookbook öffnen, welche Richtung Sie wählen, was Ihnen gefällt und was Sie anfragen. Keine Werbe-Tracker. · made with ulba
        </p>
      </main>
      </div>
     </div>

      {gewaehlt.length > 0 && !fenster && (
        <div className="lb-leiste lb-nodruck">
          <div className="lb-innen lb-leiste-zeile">
            <span><b>{gewaehlt.length} Muster</b> auf Ihrer Liste</span>
            <button className="lb-btn" onClick={() => alsIch(() => setFenster({ art: 'muster' }))}>Kostenlose Muster anfragen</button>
          </div>
        </div>
      )}

      {fenster?.art === 'fakten' && (
        <div className="lb-schleier lb-nodruck" onClick={zu}>
          <aside className="lb-schublade" role="dialog" aria-modal="true" aria-labelledby="f-titel" onClick={(ev) => ev.stopPropagation()}>
            <div className="lb-schublade-kopf"><h2 id="f-titel">{fenster.t.name}</h2><button className="lb-x" onClick={zu} aria-label="Schliessen">×</button></div>
            {fenster.t.fakten.foto && (
              <figure className="lb-original">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fenster.t.fakten.foto} alt={`${fenster.t.name}, Studiofoto`} />
                <figcaption className="lb-leise">Das echte Teil · Studiofoto</figcaption>
              </figure>
            )}
            <FaktenListe f={fenster.t.fakten} />
            {fenster.t.fakten.datenblatt && <a className="lb-btn lb-btn--hell" href={fenster.t.fakten.datenblatt} target="_blank" rel="noopener noreferrer">Datenblatt / Produktseite ↗</a>}
            {a.absender?.email && <a className="lb-link" href={`mailto:${a.absender.email}?subject=${encodeURIComponent(`Frage zu ${fenster.t.name}`)}`}>Frage an {a.absender.name}</a>}
          </aside>
        </div>
      )}

      {fenster && fenster.art !== 'fakten' && (
        <div className="lb-schleier lb-schleier--mitte lb-nodruck" onClick={zu}>
          <div className="lb-dialog" role="dialog" aria-modal="true" aria-labelledby="d-titel" onClick={(ev) => ev.stopPropagation()}>
            {fertig ? (
              <>
                <h2 id="d-titel">Danke!</h2>
                <p className="lb-leise">{fertig}</p>
                <button className="lb-btn" onClick={zu}>Fertig</button>
              </>
            ) : fenster.art === 'ich' ? (
              <form action={ichSenden} className="lb-form">
                <h2 id="d-titel">Wer sind Sie?</h2>
                <p className="lb-leise">Einmal angeben, dann weiss {a.lieferant}, wem welches Design gefällt. Gilt nur für dieses Lookboog.</p>
                <label htmlFor="i-name">Name</label>
                <input id="i-name" name="name" required maxLength={120} autoComplete="name" />
                <label htmlFor="i-mail">E-Mail</label>
                <input id="i-mail" name="email" type="email" required autoComplete="email" />
                {fehler && <p role="alert" className="lb-fehler">{fehler}</p>}
                <button type="submit" className="lb-btn" disabled={laeuft}>{laeuft ? 'Einen Moment …' : 'Weiter'}</button>
                <button type="button" className="lb-link" onClick={() => { danach.current = null; zu(); }}>Abbrechen</button>
              </form>
            ) : fenster.art === 'muster' ? (
              <form action={musterSenden} className="lb-form">
                <h2 id="d-titel">Muster anfragen</h2>
                <ul className="lb-auswahl">{gewaehlt.map((k) => { const [tid, sid] = k.split('|'); return <li key={k}>{teilVon(tid)?.name} <span className="lb-leise">· {rName(sid)}</span></li>; })}</ul>
                <label htmlFor="m-mail">Ihre E-Mail</label>
                <input id="m-mail" name="email" type="email" autoComplete="email" required defaultValue={ich?.email || a.empfaengerEmail || ''} />
                <label htmlFor="m-text">Nachricht <span className="lb-leise">(optional)</span></label>
                <textarea id="m-text" name="nachricht" rows={2} placeholder="z. B. geplante Menge, Termin" />
                {fehler && <p role="alert" className="lb-fehler">{fehler}</p>}
                <button type="submit" className="lb-btn" disabled={laeuft}>{laeuft ? 'Wird gesendet …' : 'Anfrage senden'}</button>
                <button type="button" className="lb-link" onClick={zu}>Abbrechen</button>
              </form>
            ) : fenster.art === 'anpassen' ? (
              <form action={wunschSenden} className="lb-form">
                <h2 id="d-titel">Was sollen wir ändern?</h2>
                <p className="lb-leise">{fenster.t.name} · {rName(fenster.spalte)}</p>
                <div className="lb-chips" role="group" aria-label="Änderungen">
                  {CHIPS.map(([key, txt]) => {
                    const an = chips.includes(key);
                    return <button key={key} type="button" className={`lb-chip${an ? ' an' : ''}`} aria-pressed={an} onClick={() => setChips((c) => (an ? c.filter((x) => x !== key) : [...c, key]))}>{txt}</button>;
                  })}
                </div>
                <label htmlFor="w-notiz">Oder in eigenen Worten <span className="lb-leise">(optional)</span></label>
                <textarea id="w-notiz" name="notiz" rows={2} maxLength={300} placeholder="z. B. Verschluss in Gold, Schrift kleiner" />
                {fehler && <p role="alert" className="lb-fehler">{fehler}</p>}
                <button type="submit" className="lb-btn" disabled={laeuft}>{laeuft ? 'Wird gesendet …' : 'Wunsch senden'}</button>
                <button type="button" className="lb-link" onClick={zu}>Abbrechen</button>
              </form>
            ) : neuLink ? (
              <div className="lb-form">
                <h2 id="d-titel">Link ist bereit</h2>
                <p className="lb-leise">Dieser Link gehört nur Ihrer Kollegin. {a.lieferant} sieht, dass Sie ihn weitergeleitet haben.</p>
                <input readOnly value={neuLink} aria-label="Neuer Link" onFocus={(ev) => ev.target.select()} />
                <button className="lb-btn" onClick={() => kopieren(neuLink)}>{kopiert ? 'Kopiert ✓' : 'Link kopieren'}</button>
                <a className="lb-btn lb-btn--hell" href={`mailto:?subject=${encodeURIComponent(a.marke ? `Ideen für ${a.marke}` : a.titel)}&body=${encodeURIComponent(`Schau dir das mal an:\n${neuLink}`)}`}>Per E-Mail senden</a>
                <button type="button" className="lb-link" onClick={zu}>Fertig</button>
              </div>
            ) : (
              <form action={weiterSenden} className="lb-form">
                <h2 id="d-titel">An eine Kollegin weiterleiten</h2>
                <p className="lb-leise">Sie bekommt einen eigenen Link. Ihr Link bleibt Ihrer.</p>
                <label htmlFor="k-name">Name</label>
                <input id="k-name" name="name" required maxLength={120} autoComplete="off" />
                <label htmlFor="k-mail">E-Mail <span className="lb-leise">(optional)</span></label>
                <input id="k-mail" name="email" type="email" autoComplete="off" />
                {fehler && <p role="alert" className="lb-fehler">{fehler}</p>}
                <button type="submit" className="lb-btn" disabled={laeuft}>{laeuft ? 'Wird erstellt …' : 'Link erstellen'}</button>
                <button type="button" className="lb-link" onClick={zu}>Abbrechen</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
