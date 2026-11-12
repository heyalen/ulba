'use client';
/* ulba · Das Raster. Zeilen = Teile (mit Verschluss), Spalten = Design-Richtungen,
   Zellen = Designs. Leere Zellen zeigen sofort eine Farbvorschau (ohne KI);
   «Alle rendern» füllt sie. Richtungen entstehen aus Beschreibung, Welt,
   Referenzbild, Marke oder Bibliothek und lassen sich per Chip verfeinern. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DesignWand } from '../../werkbank/designwand';
import type { WbWelt } from '../../werkbank/werkbank';
import { CHIPS, type Chip } from '../../../../lib/richtung';
import {
  zeileHinzufuegen, zeileCap, zeileEntfernen, spalteAusBibliothek, spalteEntfernen, spalteAusWelt, richtungBeschreiben, entwuerfeUebernehmen,
  richtungAusReferenz, richtungAusMarke, spalteVerfeinern, richtungUmbenennen, zellenRendern, zellenStand, zelleEntfernen, type Entwurf,
} from './raster-actions';

export type RTeil = { id: string; aktiv: boolean; name: string; rolle: string; typ: string | null; material: string | null; volumen: number | null; hals: string | null; verschluss: string | null; kollektion: string | null; artikelnummer: string | null; bild: string | null; caps: string[] };
export type RRichtung = { id: string; name: string; beschreibung: string; quelle: string; bild: string | null; bodyHex: string | null; capHex: string | null; akzentHex: string | null; finish: string | null };
export type RSpalte = { id: string; richtung: RRichtung };
export type RZeile = { id: string; teilId: string; capId: string | null };
export type RZelle = { id: string; teilId: string; richtungId: string; capId: string | null; status: string; log: string | null; bild: string | null };

const QUELLE: Record<string, string> = { beschreibung: 'Beschrieben', welt: 'Welt', referenz: 'Referenz', marke: 'Marke', verfeinert: 'Verfeinert', manuell: 'Eigene' };
const BEISPIELE = ['Korean Beauty, pastell und verspielt', 'Minimalistische Männerlinie, dunkel und matt', 'Bunt und laut für Gen Z', 'Clean Clinical, weiss und präzise', 'Quiet Luxury, warm und edel', 'Nachfüllbar und natürlich, Erdtöne'];
const spec = (t: RTeil) => [t.typ, t.volumen ? `${t.volumen} ml` : null, t.material].filter(Boolean).join(' · ');
const key = (teilId: string, richtungId: string) => `${teilId}|${richtungId}`;

/* Bild verkleinern (max 1200 px) und als JPEG-Base64 liefern */
async function bildVerkleinern(datei: File): Promise<string> {
  const url = URL.createObjectURL(datei);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
    const f = Math.min(1, 1200 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85).split(',')[1];
  } finally { URL.revokeObjectURL(url); }
}

function Tupfen({ r }: { r: RRichtung }) {
  return <span className="rz-tupfen">{[r.bodyHex, r.capHex, r.akzentHex].filter(Boolean).map((h, i) => <i key={i} style={{ background: h! }} />)}</span>;
}

function Fortschritt() {
  const [p, setP] = useState(3);
  useEffect(() => { const t0 = Date.now(); const iv = setInterval(() => setP(Math.min(96, 3 + 93 * (1 - Math.exp(-((Date.now() - t0) / 1000) / 32)))), 500); return () => clearInterval(iv); }, []);
  return <div className="rz-lauf"><span className="pn-lade-sp" /><div className="pn-balken"><i style={{ width: `${Math.round(p)}%` }} /></div></div>;
}

/* ── Teil hinzufügen (Schublade rechts) ── */
function TeilSchublade({ teile, imRaster, onWahl, onClose }: { teile: RTeil[]; imRaster: Set<string>; onWahl: (t: RTeil) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [typ, setTyp] = useState('alle');
  const behaelter = useMemo(() => teile.filter((t) => t.aktiv && t.rolle !== 'verschluss'), [teile]);
  const typen = useMemo(() => Array.from(new Set(behaelter.map((t) => t.typ).filter((x): x is string => !!x))).sort(), [behaelter]);
  const liste = useMemo(() => {
    const w = q.toLowerCase().split(/\s+/).filter(Boolean);
    return behaelter.filter((t) => (typ === 'alle' || t.typ === typ) && w.every((x) => [t.name, t.typ, t.material, t.kollektion, t.artikelnummer, t.hals, t.volumen ? `${t.volumen}ml ${t.volumen} ml` : ''].join(' ').toLowerCase().includes(x)));
  }, [behaelter, q, typ]);
  useEffect(() => { const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [onClose]);
  return (
    <div className="rz-ov" onClick={onClose}>
      <aside className="rz-schublade" onClick={(e) => e.stopPropagation()} aria-label="Teile hinzufügen">
        <div className="rz-sch-kopf"><h3>Teile hinzufügen</h3><button className="pn-zu" onClick={onClose} aria-label="Schliessen">×</button></div>
        <input className="rz-suche" type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen — Name, Typ, Material, Volumen …" aria-label="Teile suchen" />
        <div className="wb-filter">{[['alle', 'Alle'], ...typen.map((x) => [x, x])].map(([k, txt]) => <button key={k} className={`dw-pill${typ === k ? ' an' : ''}`} onClick={() => setTyp(k)}>{txt}</button>)}</div>
        <div className="rz-sch-raster">
          {liste.map((t) => {
            const da = imRaster.has(t.id);
            return (
              <button key={t.id} className={`rz-teilkarte${da ? ' da' : ''}`} onClick={() => !da && onWahl(t)} disabled={da}>
                <span className="rz-tk-bild">{t.bild ? <img src={t.bild} alt="" loading="lazy" /> : null}{da && <em>✓ im Vorschlag</em>}</span>
                <span className="rz-tk-nm">{t.name}</span><span className="rz-tk-spec">{spec(t)}</span>
              </button>
            );
          })}
          {!liste.length && <p className="st-hilfe">Nichts gefunden. In der <a href="/studio/datenbank">Datenbank</a> findest du alle Teile.</p>}
        </div>
      </aside>
    </div>
  );
}

/* ── Richtung hinzufügen: fünf Wege, ein Ergebnis ── */
function RichtungDialog({ vid, bibliothek, onWelten, onClose, onFertig }: { vid: string; bibliothek: RRichtung[]; onWelten: () => void; onClose: () => void; onFertig: () => void }) {
  const [weg, setWeg] = useState<'beschreiben' | 'referenz' | 'marke' | 'gespeichert'>('beschreiben');
  const [text, setText] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState('');
  const [entwuerfe, setEntwuerfe] = useState<Entwurf[] | null>(null);
  const [wahl, setWahl] = useState<Set<number>>(new Set([0, 1, 2]));
  const [url, setUrl] = useState('');
  const dateiRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !laeuft) onClose(); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [onClose, laeuft]);
  const los = async (f: () => Promise<{ fehler?: string } | void>) => { setFehler(''); setLaeuft(true); try { const r = await f(); if (r && r.fehler) setFehler(r.fehler); } catch { setFehler('Das hat nicht geklappt. Versuch es noch einmal.'); } setLaeuft(false); };
  const hex = (e: Entwurf, k: string) => { const v = e.felder[k]; return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null; };

  return (
    <div className="dw-ov" onClick={() => !laeuft && onClose()}>
      <div className="dw-box rz-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Richtung hinzufügen">
        <div className="dw-kopf">
          <div><h3 className="serif">Neue Design-Richtung</h3><span className="dw-sub">Wie soll die Verpackung aussehen? Wähl einen Weg — das Ergebnis ist immer eine Richtung, die du verfeinern kannst.</span></div>
          <button className="pn-zu" onClick={onClose} disabled={laeuft} aria-label="Schliessen">×</button>
        </div>
        <div className="rz-wege" role="tablist">
          {([['beschreiben', 'Beschreiben', 'Idee in Worten'], ['welten', 'Welten', 'Design-Raum'], ['referenz', 'Referenzbild', 'Moodboard, Foto'], ['marke', 'Marke', 'Look einer Website'], ['gespeichert', 'Gespeichert', `${bibliothek.length} Richtungen`]] as const).map(([k, t, sub]) => (
            <button key={k} role="tab" aria-selected={weg === k} className={`rz-weg${weg === k ? ' an' : ''}`} disabled={laeuft} onClick={() => (k === 'welten' ? onWelten() : setWeg(k))}><b>{t}</b><span>{sub}</span></button>
          ))}
        </div>
        <div className="rz-weg-inhalt">
          {weg === 'beschreiben' && (!entwuerfe ? (
            <>
              <textarea className="rz-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} disabled={laeuft} autoFocus
                placeholder="z. B. Eine koreanische Beauty-Linie für junge Frauen: pastell, glossy, verspielt, kleines Icon statt Logo" />
              <div className="rz-beispiele">{BEISPIELE.map((b) => <button key={b} className="dw-pill" disabled={laeuft} onClick={() => setText(b)}>{b}</button>)}</div>
              <button className="knopf haupt" disabled={laeuft || text.trim().length < 3} onClick={() => los(async () => { const r = await richtungBeschreiben(text); if (r.entwuerfe) { setEntwuerfe(r.entwuerfe); setWahl(new Set(r.entwuerfe.map((_, i) => i))); } return r; })}>
                {laeuft ? 'ulba entwirft 3 Spielarten …' : '3 Spielarten entwerfen'}
              </button>
            </>
          ) : (
            <>
              <p className="st-hilfe" style={{ margin: 0 }}>Wähl, welche Spielarten als Spalten ins Raster kommen.</p>
              <div className="rz-entwuerfe">
                {entwuerfe.map((e, i) => (
                  <button key={i} className={`rz-entwurf${wahl.has(i) ? ' an' : ''}`} onClick={() => setWahl((w) => { const n = new Set(w); if (n.has(i)) n.delete(i); else n.add(i); return n; })} aria-pressed={wahl.has(i)}>
                    <span className="rz-tupfen">{['Body_Hex', 'Cap_Hex', 'Akzent_Hex'].map((k) => hex(e, k)).filter(Boolean).map((h, j) => <i key={j} style={{ background: h! }} />)}</span>
                    <b>{e.name}</b><span>{e.beschreibung}</span><em>{wahl.has(i) ? '✓' : ''}</em>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="knopf haupt" disabled={laeuft || !wahl.size} onClick={() => los(async () => { await entwuerfeUebernehmen(vid, entwuerfe.filter((_, i) => wahl.has(i))); onFertig(); })}>{laeuft ? 'Wird übernommen …' : `${wahl.size} ${wahl.size === 1 ? 'Richtung' : 'Richtungen'} übernehmen`}</button>
                <button className="knopf zweit" disabled={laeuft} onClick={() => setEntwuerfe(null)}>Neu beschreiben</button>
              </div>
            </>
          ))}
          {weg === 'referenz' && (
            <>
              <p className="st-hilfe" style={{ margin: 0 }}>Lade ein Bild hoch, das den Look zeigt — Moodboard, Wettbewerber, Pinterest-Screenshot oder eine Skizze vom Kunden. ulba überträgt die Designsprache auf deine Teile.</p>
              <input ref={dateiRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) los(async () => { const b64 = await bildVerkleinern(f); const r = await richtungAusReferenz(vid, b64, text); if (!r.fehler) onFertig(); return r; }); e.target.value = ''; }} />
              <input className="rz-suche" value={text} onChange={(e) => setText(e.target.value)} placeholder="Optional: worauf achten? z. B. «nur die Farben, nicht die Form»" disabled={laeuft} />
              <button className="knopf haupt" disabled={laeuft} onClick={() => dateiRef.current?.click()}>{laeuft ? 'ulba liest das Bild …' : 'Bild auswählen'}</button>
            </>
          )}
          {weg === 'marke' && (
            <form onSubmit={(e) => { e.preventDefault(); los(async () => { const r = await richtungAusMarke(vid, url); if (!r.fehler) onFertig(); return r; }); }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className="st-hilfe" style={{ margin: 0 }}>Für «so sähe es bei euch heute aus». ulba liest die Website und legt bis zu 3 Produktlinien der Marke als Richtungen an.</p>
              <input className="rz-suche" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="z. B. aesop.com" disabled={laeuft} autoFocus />
              <button className="knopf haupt" type="submit" disabled={laeuft || !url.trim()}>{laeuft ? 'Website wird gelesen … (bis 1 Min.)' : 'Marke lesen'}</button>
            </form>
          )}
          {weg === 'gespeichert' && (bibliothek.length === 0 ? <p className="st-hilfe">Noch keine gespeicherten Richtungen. Jede Richtung, die du anlegst, landet automatisch hier.</p> : (
            <div className="rz-entwuerfe">
              {bibliothek.map((r) => (
                <button key={r.id} className="rz-entwurf" disabled={laeuft} onClick={() => los(async () => { await spalteAusBibliothek(vid, r.id); onFertig(); })}>
                  <Tupfen r={r} /><b>{r.name}</b><span>{QUELLE[r.quelle] ?? r.quelle}{r.beschreibung ? ` · ${r.beschreibung}` : ''}</span>
                </button>
              ))}
            </div>
          ))}
          {fehler && <p className="pn-fehler">{fehler}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Spaltenkopf: Name, Farben, Verfeinern ── */
function SpaltenKopf({ vid, s, onVerfeinert, onWeg }: { vid: string; s: RSpalte; onVerfeinert: (spalteId: string, richtungId: string) => void; onWeg: () => void }) {
  const [menue, setMenue] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const farbRef = useRef<HTMLInputElement>(null);
  const r = s.richtung;
  const fein = async (c: Chip | { hex: string }) => { setMenue(false); setLaeuft(true); const x = await spalteVerfeinern(vid, s.id, c); setLaeuft(false); if (x.richtungId) onVerfeinert(s.id, x.richtungId); };
  return (
    <div className={`rz-kopf${laeuft ? ' laeuft' : ''}`}>
      <div className="rz-kopf-bild" style={{ background: r.bodyHex || '#EEE' }}>{r.bild && <img src={r.bild} alt="" />}</div>
      <div className="rz-kopf-text">
        <input className="rz-kopf-name" defaultValue={r.name} aria-label="Name der Richtung" onBlur={(e) => { if (e.target.value.trim() && e.target.value !== r.name) richtungUmbenennen(vid, r.id, e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        <span className="rz-kopf-meta">
          <button className="rz-farbe-knopf" onClick={() => farbRef.current?.click()} title="Hauptfarbe ändern" aria-label="Hauptfarbe ändern"><Tupfen r={r} /></button>
          <input ref={farbRef} type="color" hidden defaultValue={r.bodyHex || '#E8E4DC'} onChange={(e) => fein({ hex: e.target.value })} />
          {QUELLE[r.quelle] ?? r.quelle}
        </span>
      </div>
      <button className="rz-kopf-weg" onClick={onWeg} aria-label="Richtung entfernen" title="Richtung entfernen">×</button>
      <button className="rz-menue-knopf" onClick={() => setMenue((m) => !m)} aria-expanded={menue} aria-label="Richtung verfeinern">{laeuft ? 'wird verfeinert …' : 'Verfeinern ▾'}</button>
      {menue && (
        <div className="rz-menue" role="menu">
          <div className="rz-chips">{CHIPS.map(([k, t]) => <button key={k} className="dw-pill" onClick={() => fein(k)}>{t}</button>)}</div>
          <p className="st-hilfe" style={{ margin: '6px 2px 8px', fontSize: 12 }}>Erzeugt eine neue Version und rendert die Spalte neu. Die alte bleibt gespeichert.</p>
          <button className="rz-menue-weg" onClick={() => { setMenue(false); onWeg(); }}>Spalte entfernen</button>
        </div>
      )}
    </div>
  );
}

export function Raster({ vid, teile, spalten, zeilen, zellen: startZellen, welten, bibliothek }: {
  vid: string; teile: RTeil[]; spalten: RSpalte[]; zeilen: RZeile[]; zellen: RZelle[]; welten: WbWelt[]; bibliothek: RRichtung[];
}) {
  const router = useRouter();
  const teilVon = useMemo(() => new Map(teile.map((t) => [t.id, t])), [teile]);
  const [zellen, setZellen] = useState<Map<string, RZelle>>(new Map());
  useEffect(() => { setZellen(new Map(startZellen.map((z) => [key(z.teilId, z.richtungId), z]))); }, [startZellen]);
  const [teilOffen, setTeilOffen] = useState(false);
  const [richtungOffen, setRichtungOffen] = useState(false);
  const [wandOffen, setWandOffen] = useState(false);
  const [capOffen, setCapOffen] = useState<string | null>(null);
  const [gross, setGross] = useState<string | null>(null);
  const [fehler, setFehler] = useState('');
  const [startet, setStartet] = useState(false);

  const laufend = useMemo(() => Array.from(zellen.values()).filter((z) => z.status === 'laeuft').map((z) => z.id), [zellen]);
  const merken = useCallback((rs: RZelle[]) => setZellen((m) => { const n = new Map(m); rs.forEach((z) => n.set(key(z.teilId, z.richtungId), z)); return n; }), []);
  useEffect(() => {
    if (!laufend.length) return;
    const t = setTimeout(async () => { try { const st = await zellenStand(laufend); merken(st); if (st.every((z) => z.status !== 'laeuft')) router.refresh(); } catch { /* nächster Versuch */ } }, 4000);
    return () => clearTimeout(t);
  }, [laufend, merken, router]);

  const zelleVon = (z: RZeile, s: RSpalte) => zellen.get(key(z.teilId, s.richtung.id));
  const aktuell = (zz: RZelle | undefined, z: RZeile) => !!zz && zz.status !== 'fehler' && (zz.capId ?? null) === (z.capId ?? null);
  const offen = zeilen.flatMap((z) => spalten.filter((s) => !aktuell(zelleVon(z, s), z)).map((s) => ({ z, s })));

  const rendern = async (liste: { z: RZeile; s: RSpalte }[]) => {
    if (!liste.length) return;
    setFehler(''); setStartet(true);
    const r = await zellenRendern(vid, liste.map(({ z, s }) => ({ teilId: z.teilId, capId: z.capId, richtungId: s.richtung.id, name: s.richtung.name })));
    setStartet(false);
    if (r.fehler || !r.ids) { setFehler(r.fehler || 'Das Rendern konnte nicht gestartet werden.'); return; }
    merken(r.ids.map((id, i) => ({ id, teilId: liste[i].z.teilId, richtungId: liste[i].s.richtung.id, capId: liste[i].z.capId, status: 'laeuft', log: null, bild: null })));
  };

  const fertigListe = zeilen.flatMap((z) => spalten.map((s) => ({ z, s, c: zelleVon(z, s) }))).filter((x) => x.c?.status === 'fertig' && x.c.bild);
  const grossIdx = gross ? fertigListe.findIndex((x) => x.c!.id === gross) : -1;
  const grossX = grossIdx >= 0 ? fertigListe[grossIdx] : null;
  useEffect(() => {
    if (!grossX) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setGross(null); if (e.key === 'ArrowRight') setGross(fertigListe[(grossIdx + 1) % fertigListe.length].c!.id); if (e.key === 'ArrowLeft') setGross(fertigListe[(grossIdx - 1 + fertigListe.length) % fertigListe.length].c!.id); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });

  const leer = !zeilen.length && !spalten.length;
  return (
    <div className="wb rz">
      <div className="rz-leiste">
        <button className="knopf zweit" onClick={() => setTeilOffen(true)}>+ Teil</button>
        <button className="knopf zweit" onClick={() => setRichtungOffen(true)}>+ Richtung</button>
        <span className="rz-leiste-info">{laufend.length ? `${laufend.length} ${laufend.length === 1 ? 'Design wird' : 'Designs werden'} gerendert …` : offen.length && zeilen.length && spalten.length ? `${offen.length} ${offen.length === 1 ? 'Feld' : 'Felder'} noch als Vorschau` : ''}</span>
        {fehler && <span className="pn-fehler">{fehler}</span>}
        <button className="knopf haupt" disabled={!offen.length || startet || !zeilen.length || !spalten.length} onClick={() => rendern(offen)}>
          {startet ? 'Startet …' : offen.length ? `Alle rendern · ${offen.length}` : 'Alles gerendert'}
        </button>
      </div>

      {leer ? (
        <div className="rz-start">
          <h2>Was willst du zeigen?</h2>
          <p>Ein Vorschlag ist ein Raster: links deine Teile, oben die Design-Richtungen. Jedes Feld wird ein Design.</p>
          <div className="rz-start-wege">
            <button onClick={() => setTeilOffen(true)}><b>1 · Teile wählen</b><span>Ein neues Packmittel, eine ganze Linie oder ein einzelnes Teil.</span></button>
            <button onClick={() => setRichtungOffen(true)}><b>2 · Richtung festlegen</b><span>Beschreiben, Welt wählen, Referenzbild oder Marke — z. B. «K-Beauty pastell».</span></button>
          </div>
        </div>
      ) : (
        <div className="rz-scroll">
          <div className="rz-grid" style={{ gridTemplateColumns: `230px repeat(${spalten.length}, 220px) 150px` }}>
            <div className="rz-ecke" />
            {spalten.map((s) => (
              <SpaltenKopf key={s.id} vid={vid} s={s}
                onVerfeinert={(_sid, rid) => { const sp = { ...s, richtung: { ...s.richtung, id: rid } }; rendern(zeilen.map((z) => ({ z, s: sp }))); router.refresh(); }}
                onWeg={async () => { await spalteEntfernen(vid, s.id); router.refresh(); }} />
            ))}
            <button className="rz-plus-spalte" onClick={() => setRichtungOffen(true)}>+ Richtung</button>

            {zeilen.map((z) => {
              const t = teilVon.get(z.teilId);
              const caps = (t?.caps ?? []).map((id) => teilVon.get(id)).filter((c): c is RTeil => !!c);
              const cap = z.capId ? teilVon.get(z.capId) : null;
              return (
                <div key={z.id} className="rz-reihe" style={{ display: 'contents' }}>
                  <div className="rz-zeilenkopf">
                    <div className="rz-zk-oben">
                      <div className="rz-zk-bild">{t?.bild && <img src={t.bild} alt="" />}</div>
                      <div className="rz-zk-text"><b>{t?.name ?? 'Teil'}</b><span>{t ? spec(t) : ''}</span></div>
                      <button className="rz-zk-weg" onClick={async () => { await zeileEntfernen(vid, z.id); router.refresh(); }} aria-label="Teil entfernen" title="Teil entfernen">×</button>
                    </div>
                    {caps.length > 0 ? (
                      <button className="rz-cap-knopf" onClick={() => setCapOffen(capOffen === z.id ? null : z.id)} aria-expanded={capOffen === z.id}>
                        <span className="rz-cap-bild">{cap?.bild ? <img src={cap.bild} alt="" /> : <i>–</i>}</span>
                        <span className="rz-cap-text"><small>Verschluss · {caps.length} passend</small><span>{cap ? cap.name : 'ohne Verschluss'}</span></span>
                        <span aria-hidden className="rz-cap-pfeil">▾</span>
                      </button>
                    ) : <span className="rz-cap-keine">Kein passender Verschluss hinterlegt</span>}
                    {capOffen === z.id && (
                      <div className="rz-cap-menue" role="dialog" aria-label="Verschluss wählen">
                        <div className="rz-cap-menue-kopf"><b>Verschluss für {t?.name}</b><button className="pn-zu" onClick={() => setCapOffen(null)} aria-label="Schliessen">×</button></div>
                        <div className="rz-cap-raster" role="radiogroup">
                          {caps.map((c) => (
                            <button key={c.id} role="radio" aria-checked={z.capId === c.id} className={`rz-cap-karte${z.capId === c.id ? ' an' : ''}`}
                              onClick={async () => { setCapOffen(null); await zeileCap(vid, z.id, c.id); router.refresh(); }}>
                              <span className="rz-ck-bild">{c.bild ? <img src={c.bild} alt="" /> : null}</span>
                              <b>{c.name}</b><span>{[c.verschluss || c.typ, c.material].filter(Boolean).join(' · ')}</span>
                            </button>
                          ))}
                          <button role="radio" aria-checked={!z.capId} className={`rz-cap-karte ohne${!z.capId ? ' an' : ''}`} onClick={async () => { setCapOffen(null); await zeileCap(vid, z.id, null); router.refresh(); }}>
                            <span className="rz-ck-bild"><i>ohne</i></span><b>Ohne Verschluss</b><span>nur der Behälter</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {spalten.map((s) => {
                    const c = zelleVon(z, s);
                    const veraltet = !!c && c.status === 'fertig' && (c.capId ?? null) !== (z.capId ?? null);
                    if (c?.status === 'fertig' && c.bild) return (
                      <button key={s.id} className="rz-zelle fertig" onClick={() => setGross(c.id)} aria-label={`${t?.name} in ${s.richtung.name} gross ansehen`}>
                        <img src={c.bild} alt="" />{veraltet && <em className="rz-hinweis">Verschluss geändert</em>}
                      </button>
                    );
                    return (
                      <div key={s.id} className={`rz-zelle vorschau${c?.status === 'laeuft' ? ' laeuft' : ''}`}>
                        {t?.bild && (
                          <span className="rz-vorschau">
                            {cap?.bild && <img className="rz-v-cap" src={cap.bild} alt="" />}
                            <span className="rz-v-body"><img src={t.bild} alt="" />{s.richtung.bodyHex && <i style={{ background: s.richtung.bodyHex }} />}</span>
                          </span>
                        )}
                        {c?.status === 'laeuft' ? <Fortschritt /> : (
                          <>
                            {c?.status === 'fehler' && <em className="rz-hinweis fehler" title={c.log ?? ''}>Fehler</em>}
                            <button className="rz-zelle-knopf" onClick={() => rendern([{ z, s }])} disabled={startet}>{c?.status === 'fehler' ? 'Nochmal' : 'Rendern'}</button>
                          </>
                        )}
                      </div>
                    );
                  })}
                  <div className="rz-leer-zelle" />
                </div>
              );
            })}
            <button className="rz-plus-zeile" onClick={() => setTeilOffen(true)}>+ Teil</button>
          </div>
        </div>
      )}

      {grossX && (
        <div className="dw-ov rz-gross" onClick={() => setGross(null)}>
          <div className="rz-gross-box" onClick={(e) => e.stopPropagation()}>
            <img src={grossX.c!.bild!} alt="" />
            <div className="rz-gross-leiste">
              <div><b>{teilVon.get(grossX.z.teilId)?.name}</b><span>{grossX.s.richtung.name}</span></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="knopf zweit wb-klein" onClick={() => { const x = grossX; setGross(null); rendern([{ z: x.z, s: x.s }]); }}>Neu rendern</button>
                <button className="knopf zweit wb-klein" onClick={async () => { const id = grossX.c!.id; setGross(null); await zelleEntfernen(vid, id); router.refresh(); }}>Entfernen</button>
                <a className="knopf zweit wb-klein wb-a" href={grossX.c!.bild!} download target="_blank" rel="noopener">Herunterladen</a>
              </div>
            </div>
            {fertigListe.length > 1 && (
              <>
                <button className="rz-pfeil links" onClick={() => setGross(fertigListe[(grossIdx - 1 + fertigListe.length) % fertigListe.length].c!.id)} aria-label="Vorheriges">‹</button>
                <button className="rz-pfeil rechts" onClick={() => setGross(fertigListe[(grossIdx + 1) % fertigListe.length].c!.id)} aria-label="Nächstes">›</button>
              </>
            )}
            <button className="pn-zu rz-gross-zu" onClick={() => setGross(null)} aria-label="Schliessen">×</button>
          </div>
        </div>
      )}

      {teilOffen && <TeilSchublade teile={teile} imRaster={new Set(zeilen.map((z) => z.teilId))} onClose={() => setTeilOffen(false)}
        onWahl={async (t) => { const mitBild = t.caps.find((id) => teilVon.get(id)?.bild); await zeileHinzufuegen(vid, t.id, mitBild ?? t.caps[0] ?? null); router.refresh(); }} />}
      {richtungOffen && <RichtungDialog vid={vid} bibliothek={bibliothek} onClose={() => setRichtungOffen(false)}
        onWelten={() => { setRichtungOffen(false); setWandOffen(true); }} onFertig={() => { setRichtungOffen(false); router.refresh(); }} />}
      {wandOffen && <DesignWand welten={welten} titel="Welche Welt soll eine Spalte werden?" onClose={() => setWandOffen(false)}
        onWahl={async (w) => { setWandOffen(false); await spalteAusWelt(vid, w.id); router.refresh(); }} />}
    </div>
  );
}
