'use client';
/* ulba · Studio-Werkbank (UX wie das alte ulba).
   Suche über die eigenen Teile → Teil öffnen → Verschluss oben wählen →
   «In einem Design zeigen» (Design-Raum) → Render. Danach Farbvarianten
   (horizontale Linie) oder mehrere Teile in einer Welt (vertikale Linie),
   mit einem Klick als Vorschlag teilen. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DesignWand } from './designwand';
import { rendernStarten, renderStand, teilDesigns, alsVorschlag, type RenderStand } from './actions';

export type WbTeil = {
  id: string; name: string; rolle: string; typ: string | null; material: string | null; volumen: number | null; hals: string | null;
  verschluss: string | null; kollektion: string | null; beschreibung: string | null; artikelnummer: string | null; mindestmenge: number | null;
  deko: string[]; einfaerbbar: boolean | null; bild: string | null; caps: string[];
};
export type WbWelt = {
  id: string; art: 'welt' | 'look'; name: string; brand: string; bild: string | null; register: string | null;
  laut: number | null; farbtemp: number | null; bodyHex: string | null; capHex: string | null; wirkung: string;
};

const FARBEN = ['#F3EDE4', '#E8C9B5', '#C98B6B', '#8A9A7B', '#3E5C4A', '#A9C1D9', '#2F4A6B', '#B7A6C9', '#D9A5A5', '#1E1E1E'];
const spec = (t: WbTeil) => [t.typ, t.volumen ? `${t.volumen} ml` : null, t.material, t.hals].filter(Boolean).join(' · ');
const istVerschluss = (t: WbTeil) => t.rolle === 'verschluss';
const capScale = (closure?: string | null) => {
  const s = (closure || '').toLowerCase();
  if (/pump|spray|pipette|airless|dropper/.test(s)) return 0.28;
  if (/screw|schraub|snap|kappe|cap/.test(s)) return 0.34;
  return 0.3;
};
const neueId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()));

/* Verschluss per CSS über dem Körper gestapelt, massstäblich zur Körperbreite. */
function StapelBild({ bodyUrl, capUrl, scale, alt, klasse }: { bodyUrl: string; capUrl: string; scale: number; alt: string; klasse: string }) {
  const [bodyW, setBodyW] = useState(0);
  const bodyRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setBodyW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [bodyUrl]);
  return (
    <div className={klasse}>
      <img className={`${klasse}-cap`} src={capUrl} alt="Verschluss" style={bodyW > 0 ? { width: Math.round(bodyW * scale), maxWidth: 'none', maxHeight: 'none' } : undefined} />
      <img ref={bodyRef} className={`${klasse}-body`} src={bodyUrl} alt={alt} onLoad={(e) => setBodyW(e.currentTarget.clientWidth)} />
    </div>
  );
}

/* Ehrliche Stufen-Anzeige: Balken läuft asymptotisch gegen 97 %. */
function RenderFortschritt({ split, name }: { split: boolean; name: string }) {
  const [p, setP] = useState(2);
  useEffect(() => {
    const t0 = Date.now();
    const iv = setInterval(() => setP(Math.min(97, 2 + 95 * (1 - Math.exp(-((Date.now() - t0) / 1000) / 28)))), 300);
    return () => clearInterval(iv);
  }, []);
  const stufe = p < 10 ? 'Plan wird erstellt' : p < 60 ? 'Körper wird gerendert' : split && p < 85 ? 'Verschluss wird gerendert' : 'Wird gespeichert';
  return (
    <div className="pn-lade pn-fortschritt">
      <span className="pn-lade-sp" />
      <span>{stufe} — {name}</span>
      <div className="pn-balken"><i style={{ width: `${Math.round(p)}%` }} /></div>
    </div>
  );
}

/* Renders abfragen, solange etwas läuft. */
function useRenders() {
  const [stand, setStand] = useState<Record<string, RenderStand>>({});
  const laufend = useMemo(() => Object.values(stand).filter((r) => r.status === 'laeuft').map((r) => r.id), [stand]);
  const merken = useCallback((rs: RenderStand[]) => setStand((s) => { const n = { ...s }; rs.forEach((r) => { n[r.id] = r; }); return n; }), []);
  useEffect(() => {
    if (!laufend.length) return;
    const t = setTimeout(async () => { try { merken(await renderStand(laufend)); } catch { /* nächster Versuch */ } }, 4000);
    return () => clearTimeout(t);
  }, [laufend, merken]);
  return { stand, merken };
}

function DetailPanel({ teil, alle, welten, capWahl, onCap, inLinie, onLinie, onClose, renders }: {
  teil: WbTeil; alle: Map<string, WbTeil>; welten: WbWelt[]; capWahl: number; onCap: (i: number) => void;
  inLinie: boolean; onLinie: () => void; onClose: () => void; renders: ReturnType<typeof useRenders>;
}) {
  const caps = teil.caps.map((id) => alle.get(id)).filter((c): c is WbTeil => !!c);
  const capIdx = Math.min(capWahl, Math.max(0, caps.length - 1));
  const cap = caps[capIdx] || null;
  const [wandOffen, setWandOffen] = useState(false);
  const [aktivId, setAktivId] = useState<string | null>(null);
  const [fehler, setFehler] = useState('');
  const [frueher, setFrueher] = useState<RenderStand[]>([]);
  const [farben, setFarben] = useState<string[]>([]);
  const [varIds, setVarIds] = useState<string[]>([]);
  const [teilenLaeuft, setTeilenLaeuft] = useState(false);

  useEffect(() => { setAktivId(null); setFehler(''); setFarben([]); setVarIds([]); }, [teil.id]);
  useEffect(() => { let tot = false; teilDesigns(teil.id).then((d) => { if (!tot) setFrueher(d); }).catch(() => {}); return () => { tot = true; }; }, [teil.id]);

  const aktiv = aktivId ? renders.stand[aktivId] || frueher.find((f) => f.id === aktivId) || null : null;
  const laeuft = aktiv?.status === 'laeuft';
  const zeigt = !!aktiv?.bild && aktiv.status === 'fertig';
  useEffect(() => { if (aktiv?.status === 'fertig') teilDesigns(teil.id).then(setFrueher).catch(() => {}); }, [aktiv?.status, teil.id]);
  useEffect(() => { if (aktiv?.status === 'fehler') setFehler(aktiv.log || 'Das Rendern hat nicht geklappt. Versuch es noch einmal.'); }, [aktiv?.status, aktiv?.log]);

  const rendern = async (w: WbWelt) => {
    setWandOffen(false); setFehler(''); setFarben([]); setVarIds([]);
    const r = await rendernStarten([{ teilId: teil.id, capId: cap?.id ?? null, weltArt: w.art, weltId: w.id, weltName: w.name }]);
    if (r.fehler || !r.ids) { setFehler(r.fehler || 'Das Rendern konnte nicht gestartet werden.'); return; }
    renders.merken([{ id: r.ids[0], teilId: teil.id, capId: cap?.id ?? null, weltArt: w.art, weltId: w.id, weltName: w.name, hex: null, gruppe: null, status: 'laeuft', log: null, bild: null }]);
    setAktivId(r.ids[0]);
  };

  const variantenRendern = async () => {
    if (!aktiv || !farben.length) return;
    const gruppe = `fv_${aktiv.id}`;
    const r = await rendernStarten(farben.map((hex) => ({ teilId: teil.id, capId: aktiv.capId, weltArt: aktiv.weltArt, weltId: aktiv.weltId, weltName: aktiv.weltName, hex })), gruppe);
    if (r.fehler || !r.ids) { setFehler(r.fehler || 'Die Varianten konnten nicht gestartet werden.'); return; }
    renders.merken(r.ids.map((id, i) => ({ id, teilId: teil.id, capId: aktiv.capId, weltArt: aktiv.weltArt, weltId: aktiv.weltId, weltName: aktiv.weltName, hex: farben[i], gruppe, status: 'laeuft', log: null, bild: null })));
    setVarIds(r.ids); setFarben([]);
  };
  const varianten = varIds.map((id) => renders.stand[id]).filter(Boolean);

  const teilen = async () => {
    if (!aktiv) return;
    setTeilenLaeuft(true);
    await alsVorschlag([aktiv.id, ...varianten.filter((v) => v.status === 'fertig').map((v) => v.id)], `${teil.name} · ${aktiv.weltName}`);
    setTeilenLaeuft(false);
  };

  const zeilen = ([
    ['Typ', teil.typ], ['Material', teil.material], ['Volumen', teil.volumen ? `${teil.volumen} ml` : null], ['Halsmaß', teil.hals],
    ['Verschluss', teil.verschluss], ['Veredelung', teil.deko.join(', ')], ['Einfärbbar', teil.einfaerbbar == null ? null : teil.einfaerbbar ? 'Ja' : 'Nein'],
    ['Kollektion', teil.kollektion], ['Artikelnummer', teil.artikelnummer], ['Mindestmenge', teil.mindestmenge ? `${teil.mindestmenge.toLocaleString('de-CH')} Stk.` : null],
  ] as [string, string | null][]).filter((z): z is [string, string] => !!z[1]);

  return (
    <aside className="panel wb-panel">
      <div className="pn-leiste">
        <div className="pn-werkzeuge">
          {!istVerschluss(teil) && (
            <button className={`wz${inLinie ? ' an' : ''}`} onClick={onLinie} aria-pressed={inLinie}>
              <span aria-hidden>{inLinie ? '✓' : '+'}</span><span>{inLinie ? 'In der Linie' : 'Zur Linie'}</span>
            </button>
          )}
          <button className="wz wz-rund" onClick={onClose} aria-label="Schließen">×</button>
        </div>
      </div>
      <div className="pn-inhalt">
        <div className="pn-kopf">
          <h2>{teil.name}</h2>
          <p className="pn-spec">{spec(teil)}</p>
        </div>

        {caps.length > 0 && (
          <div className="pn-caps">
            <div className="pn-caps-kopf"><span>Verschluss</span><span className="leise">{cap?.name || `${caps.length} Optionen`}</span></div>
            <div className="pn-caps-reihe" role="radiogroup" aria-label="Verschluss">
              {caps.map((c, i) => (
                <button key={c.id} type="button" role="radio" aria-checked={capIdx === i} className={`pn-cap${capIdx === i ? ' an' : ''}`}
                  title={c.name} aria-label={c.name} onClick={() => onCap(i)}>
                  {c.bild ? <img src={c.bild} alt="" /> : <span className="wb-cap-txt">{c.name.slice(0, 10)}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`pn-buehne${zeigt ? ' mit-render' : ''}`}>
          {zeigt
            ? <img className="pn-montiert" src={aktiv!.bild!} alt={`${teil.name} im Design ${aktiv!.weltName}`} />
            : teil.bild
              ? (cap?.bild && !laeuft
                ? <StapelBild klasse="pn-stapel" bodyUrl={teil.bild} capUrl={cap.bild} scale={capScale(cap.verschluss || cap.name)} alt={`${teil.name} mit ${cap.name}`} />
                : <img src={teil.bild} alt={teil.name} />)
              : <span className="pn-leer" aria-hidden />}
          {zeigt && <span className="pn-look-marke">{aktiv!.hex && <i style={{ background: aktiv!.hex }} />}{aktiv!.weltName}</span>}
          {laeuft && <RenderFortschritt split={!!cap?.bild} name={aktiv!.weltName || 'diesem Design'} />}
        </div>

        <div className="pn-look">
          <button className={`knopf ${zeigt || laeuft ? 'zweit' : 'haupt'} pn-look-knopf`} onClick={() => setWandOffen(true)} disabled={laeuft || !teil.bild}>
            {zeigt ? 'Anderes Design' : 'In einem Design zeigen'}
          </button>
          {!teil.bild && <p className="pn-fehler">Dieses Teil hat noch kein Studiofoto.</p>}
          {fehler && <p className="pn-fehler">{fehler}</p>}
        </div>

        {zeigt && (
          <div className="pn-renders wb-varianten">
            <div className="pn-caps-kopf"><span>Farbvarianten</span><span className="leise">gleiches Teil, gleiche Welt</span></div>
            <div className="wb-farben" role="group" aria-label="Farben wählen">
              {FARBEN.map((h) => (
                <button key={h} type="button" className={`wb-farbe${farben.includes(h) ? ' an' : ''}`} style={{ background: h }} aria-label={h} aria-pressed={farben.includes(h)}
                  onClick={() => setFarben((f) => (f.includes(h) ? f.filter((x) => x !== h) : f.length >= 4 ? f : [...f, h]))} />
              ))}
              <button className="knopf zweit wb-klein" disabled={!farben.length} onClick={variantenRendern}>
                {farben.length ? `${farben.length} ${farben.length === 1 ? 'Variante' : 'Varianten'} rendern` : 'Bis zu 4 Farben wählen'}
              </button>
            </div>
            {varianten.length > 0 && (
              <div className="pn-renders-reihe">
                {varianten.map((v) => (
                  <button key={v.id} type="button" title={v.hex || ''} onClick={() => v.status === 'fertig' && setAktivId(v.id)}>
                    <span className="pn-r-bild">{v.bild ? <img src={v.bild} alt={v.weltName} /> : <span className="wb-r-lade">{v.status === 'fehler' ? '!' : ''}</span>}</span>
                    <span className="pn-r-name">{v.hex && <i className="wb-dot" style={{ background: v.hex }} />}{v.status === 'laeuft' ? 'läuft …' : v.status === 'fehler' ? 'Fehler' : v.hex}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {frueher.length > 0 && (
          <div className="pn-renders">
            <div className="pn-caps-kopf"><span>Frühere Designs dieses Teils</span><span className="leise">{frueher.length}</span></div>
            <div className="pn-renders-reihe">
              {frueher.map((e) => (
                <button key={e.id} type="button" title={e.weltName} onClick={() => { setAktivId(e.id); setFehler(''); }}>
                  <span className="pn-r-bild">{e.bild && <img src={e.bild} alt={e.weltName} loading="lazy" />}</span>
                  <span className="pn-r-name">{e.hex && <i className="wb-dot" style={{ background: e.hex }} />}{e.weltName || '—'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {teil.beschreibung && <p className="wb-beschreibung">{teil.beschreibung}</p>}
        {zeilen.length > 0 && <dl className="pn-fakten">{zeilen.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
      </div>
      <div className="pn-aktion">
        <button className={`knopf ${zeigt ? 'haupt' : 'zweit'}`} disabled={!zeigt || teilenLaeuft} onClick={teilen}>
          {teilenLaeuft ? 'Vorschlag wird erstellt …' : 'Als Vorschlag teilen'}
        </button>
      </div>
      {wandOffen && <DesignWand welten={welten} onWahl={rendern} onClose={() => setWandOffen(false)} />}
    </aside>
  );
}

/* Vertikale Linie: mehrere Teile, eine Welt. */
function LinieErgebnis({ ids, renders, alle, onClose }: { ids: string[]; renders: ReturnType<typeof useRenders>; alle: Map<string, WbTeil>; onClose: () => void }) {
  const liste = ids.map((id) => renders.stand[id]).filter(Boolean);
  const welt = liste[0]?.weltName || '';
  const fertig = liste.filter((r) => r.status === 'fertig');
  const [laeuft, setLaeuft] = useState(false);
  return (
    <div className="dw-ov" role="dialog" aria-label="Linie" onClick={onClose}>
      <div className="dw-box wb-linie-box" onClick={(e) => e.stopPropagation()}>
        <div className="dw-kopf">
          <div><h3 className="serif">Linie · {welt}</h3><span className="dw-sub">{fertig.length} von {liste.length} fertig — eine Welt über alle Teile.</span></div>
          <button className="pn-zu" onClick={onClose} aria-label="schließen">×</button>
        </div>
        <div className="dw-body">
          <div className="wb-linie-raster">
            {liste.map((r) => (
              <figure key={r.id} className="wb-linie-k">
                <div className="wb-linie-bild">{r.bild ? <img src={r.bild} alt="" /> : r.status === 'fehler' ? <span className="pn-fehler">{r.log || 'Fehler'}</span> : <span className="pn-lade-sp" />}</div>
                <figcaption>{alle.get(r.teilId)?.name || ''}</figcaption>
              </figure>
            ))}
          </div>
        </div>
        <div className="pn-aktion">
          <button className="knopf haupt" disabled={!fertig.length || laeuft} onClick={async () => { setLaeuft(true); await alsVorschlag(fertig.map((r) => r.id), `Linie · ${welt}`); setLaeuft(false); }}>
            {laeuft ? 'Vorschlag wird erstellt …' : 'Als Vorschlag teilen'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Werkbank({ teile, welten }: { teile: WbTeil[]; welten: WbWelt[] }) {
  const alle = useMemo(() => new Map(teile.map((t) => [t.id, t])), [teile]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string>('alle');
  const [selId, setSelId] = useState<string | null>(null);
  const [capWahl, setCapWahl] = useState<Record<string, number>>({});
  const [linie, setLinie] = useState<string[]>([]);
  const [linieWand, setLinieWand] = useState(false);
  const [linieIds, setLinieIds] = useState<string[] | null>(null);
  const [linieFehler, setLinieFehler] = useState('');
  const renders = useRenders();

  const typen = useMemo(() => Array.from(new Set(teile.filter((t) => !istVerschluss(t)).map((t) => t.typ).filter((x): x is string => !!x))).sort(), [teile]);
  const treffer = useMemo(() => {
    const worte = q.toLowerCase().split(/\s+/).filter(Boolean);
    return teile.filter((t) => {
      if (filter === 'verschluesse' ? !istVerschluss(t) : istVerschluss(t)) return false;
      if (filter !== 'alle' && filter !== 'verschluesse' && t.typ !== filter) return false;
      if (!worte.length) return true;
      const text = [t.name, t.typ, t.material, t.kollektion, t.artikelnummer, t.verschluss, t.hals, t.beschreibung, t.volumen ? `${t.volumen}ml ${t.volumen} ml` : '', t.deko.join(' ')].join(' ').toLowerCase();
      return worte.every((w) => text.includes(w));
    });
  }, [teile, q, filter]);
  const sel = selId ? alle.get(selId) || null : null;

  const linieUmschalten = (id: string) => setLinie((l) => (l.includes(id) ? l.filter((x) => x !== id) : l.length >= 8 ? l : [...l, id]));
  const linieRendern = async (w: WbWelt) => {
    setLinieWand(false); setLinieFehler('');
    const gruppe = `vl_${neueId()}`;
    const auftraege = linie.map((id) => {
      const t = alle.get(id)!;
      const capId = t.caps[Math.min(capWahl[id] ?? 0, Math.max(0, t.caps.length - 1))] ?? null;
      return { teilId: id, capId, weltArt: w.art, weltId: w.id, weltName: w.name };
    });
    const r = await rendernStarten(auftraege, gruppe);
    if (r.fehler || !r.ids) { setLinieFehler(r.fehler || 'Die Linie konnte nicht gestartet werden.'); return; }
    renders.merken(r.ids.map((id, i) => ({ id, teilId: auftraege[i].teilId, capId: auftraege[i].capId, weltArt: w.art, weltId: w.id, weltName: w.name, hex: null, gruppe, status: 'laeuft', log: null, bild: null })));
    setLinieIds(r.ids);
  };

  return (
    <div className={`wb${sel ? ' mit-panel' : ''}`}>
      <section className="wb-suche">
        <div className="wb-suchzeile">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suche in deinen Teilen — Name, Typ, Material, Volumen …" aria-label="Teile suchen" autoFocus />
        </div>
        <div className="wb-filter" role="group" aria-label="Filter">
          {[['alle', 'Alle'], ...typen.map((t) => [t, t]), ['verschluesse', 'Verschlüsse']].map(([k, txt]) => (
            <button key={k} className={`dw-pill${filter === k ? ' an' : ''}`} onClick={() => setFilter(k)} aria-pressed={filter === k}>{txt}</button>
          ))}
          <span className="wb-zahl">{treffer.length} {treffer.length === 1 ? 'Teil' : 'Teile'}</span>
        </div>
        {teile.length === 0 ? (
          <div className="wb-leer"><b>Noch keine aktiven Teile</b><span>Lies deinen Katalog in der <a href="/studio/datenbank">Datenbank</a> ein und gib die Teile frei.</span></div>
        ) : treffer.length === 0 ? (
          <div className="wb-leer"><b>Nichts gefunden</b><span>Versuch ein anderes Wort oder einen anderen Filter.</span></div>
        ) : (
          <div className="wb-raster">
            {treffer.map((t) => {
              const inL = linie.includes(t.id);
              return (
                <div key={t.id} className={`ek${selId === t.id ? ' an' : ''}`}>
                  {!istVerschluss(t) && (
                    <button className={`favherz${inL ? ' an' : ''}`} onClick={() => linieUmschalten(t.id)} aria-label={inL ? 'Aus der Linie entfernen' : 'Zur Linie hinzufügen'} title={inL ? 'In der Linie' : 'Zur Linie'}>{inL ? '✓' : '+'}</button>
                  )}
                  <button className="ek-klick" onClick={() => setSelId(t.id)}>
                    <div className="ek-bild">{t.bild ? <img src={t.bild} alt={t.name} loading="lazy" /> : <span className="ek-ph">◇</span>}</div>
                    <div className="ek-info">
                      <span className="ek-nm">{t.name}</span>
                      <span className="ek-spec">{spec(t)}</span>
                      {t.caps.length > 0 && <span className="ek-ab">{t.caps.length} {t.caps.length === 1 ? 'Verschluss' : 'Verschlüsse'}</span>}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {sel && (
        <DetailPanel key={sel.id} teil={sel} alle={alle} welten={welten} capWahl={capWahl[sel.id] ?? 0}
          onCap={(i) => setCapWahl((c) => ({ ...c, [sel.id]: i }))} inLinie={linie.includes(sel.id)} onLinie={() => linieUmschalten(sel.id)}
          onClose={() => setSelId(null)} renders={renders} />
      )}

      {linie.length > 0 && (
        <div className="wb-linie" role="region" aria-label="Linie">
          <span className="wb-linie-lbl">Linie</span>
          <div className="wb-linie-teile">
            {linie.map((id) => { const t = alle.get(id); return t ? (
              <button key={id} className="wb-linie-t" onClick={() => linieUmschalten(id)} title={`${t.name} entfernen`}>{t.bild ? <img src={t.bild} alt={t.name} /> : t.name.slice(0, 2)}<i>×</i></button>
            ) : null; })}
          </div>
          {linieFehler && <span className="pn-fehler">{linieFehler}</span>}
          <button className="knopf haupt" onClick={() => setLinieWand(true)} disabled={linie.length < 2}>{linie.length < 2 ? 'Mindestens 2 Teile' : `${linie.length} Teile in einer Welt rendern`}</button>
          <button className="wb-linie-leeren" onClick={() => setLinie([])}>Leeren</button>
        </div>
      )}
      {linieWand && <DesignWand welten={welten} titel="In welcher Welt soll die Linie stehen?" onWahl={linieRendern} onClose={() => setLinieWand(false)} />}
      {linieIds && <LinieErgebnis ids={linieIds} renders={renders} alle={alle} onClose={() => setLinieIds(null)} />}
    </div>
  );
}
