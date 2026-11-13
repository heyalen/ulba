'use client';
/* ulba · Sitz des Verschlusses anpassen (aus dem ersten ulba, v62–v77).
   Verschluss senkrecht ziehen, Ecke = Grösse. X ist nie frei: der Verschluss
   sitzt mittig auf der Körper-Silhouette. Gespeichert wird je Teil × Verschluss;
   fertige Designs werden ohne neuen KI-Render neu montiert. */
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { geometrieLaden, kalibrierungSpeichern, renderRoh, type KalGeo } from './raster-actions';

function CapAusschnitt({ geo, url, breite, style }: { geo: KalGeo; url: string; breite: number; style?: CSSProperties }) {
  const b = geo.cap.cropBox;
  const imgW = breite / (b.w / 100);
  const imgH = imgW * geo.cap.h / Math.max(1, geo.cap.w);
  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style, width: breite, height: breite * geo.cap.cropRatio }}>
      <img src={url} alt="Verschluss" draggable={false}
        style={{ position: 'absolute', width: imgW, height: imgH, maxWidth: 'none', maxHeight: 'none', left: -b.x / 100 * imgW, top: -b.y / 100 * imgH, mixBlendMode: 'multiply', pointerEvents: 'none', userSelect: 'none' }} />
    </div>
  );
}

/* Fläche mit Körper + Verschluss: senkrecht ziehen, Ecke = Grösse. Wird im Dialog und direkt auf der Seite benutzt. */
export function SitzFlaeche({ geo, bodyUrl, capUrl, skala, bottomY, onChange, maxH, aktiv = true }: {
  geo: KalGeo; bodyUrl: string; capUrl: string; skala: number; bottomY: number; onChange: (skala: number, bottomY: number) => void; maxH: string; aktiv?: boolean;
}) {
  const [box, setBox] = useState<{ w: number; h: number; l: number } | null>(null);
  const bodyRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ modus: 'move' | 'size'; x: number; y: number; skala: number; bottomY: number } | null>(null);
  const messe = (el: HTMLImageElement) => { if (el.clientWidth > 0) setBox({ w: el.clientWidth, h: el.clientHeight, l: el.offsetLeft }); };
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => messe(el)); ro.observe(el); return () => ro.disconnect();
  }, [bodyUrl]);
  const runter = (modus: 'move' | 'size') => (ev: RPointerEvent) => { if (!aktiv) return; ev.preventDefault(); ev.stopPropagation(); (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId); drag.current = { modus, x: ev.clientX, y: ev.clientY, skala, bottomY }; };
  const bewege = (ev: RPointerEvent) => {
    const d = drag.current, b = box; if (!d || !b) return;
    const dx = (ev.clientX - d.x) / b.w, dy = (ev.clientY - d.y) / b.h;
    if (d.modus === 'move') onChange(d.skala, Math.min(geo.body.neckTopPct / 100 + 0.22, Math.max(-0.6, d.bottomY + dy)));
    else onChange(Math.min(2, Math.max(0.05, d.skala + dx * 2)), d.bottomY);
  };
  const capW = box ? skala * box.w : 0;
  const capH = capW * geo.cap.cropRatio;
  const kopf = box ? Math.max(Math.round(box.h * 0.12), Math.ceil(capH - bottomY * box.h) + 8) : 0;
  const mitteX = geo.body.silhouetteBox ? (geo.body.silhouetteBox.x + geo.body.silhouetteBox.w / 2) / 100 : 0.5;
  return (
    <div className={`kal-rahmen${aktiv ? '' : ' still'}`} style={box ? { paddingTop: kopf } : undefined} onPointerMove={bewege} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <img ref={bodyRef} className="kal-body" src={bodyUrl} alt="Körper" draggable={false} style={{ maxHeight: maxH }} onLoad={(e) => messe(e.currentTarget)} />
      {box && (() => {
        // Teil des Verschlussbilds unterhalb des Kragens (Pipettenrohr, Steigrohr): sitzt im Behälter → durchs Glas sichtbar
        const b = geo.cap.cropBox, imgW = capW / (b.w / 100), imgH = imgW * geo.cap.h / Math.max(1, geo.cap.w);
        const rest = Math.max(0, (100 - b.y - b.h) / 100 * imgH);
        const oben = kopf + bottomY * box.h, platz = Math.max(0, kopf + box.h - oben);
        return rest > 2 && platz > 2 ? (
          <div className="kal-rohr" aria-hidden="true" style={{ left: box.l + mitteX * box.w - capW / 2, top: oben, width: capW, height: Math.min(rest, platz) }}>
            <img src={capUrl} alt="" draggable={false} style={{ position: 'absolute', width: imgW, height: imgH, maxWidth: 'none', maxHeight: 'none', left: -b.x / 100 * imgW, top: -(b.y + b.h) / 100 * imgH }} />
          </div>
        ) : null;
      })()}
      {box && (
        <div className="kal-cap" style={{ width: capW, height: capH, left: box.l + mitteX * box.w - capW / 2, top: kopf + bottomY * box.h - capH }} onPointerDown={runter('move')}>
          <CapAusschnitt geo={geo} url={capUrl} breite={capW} />
          {aktiv && <i className="kal-griff" onPointerDown={runter('size')} />}
        </div>
      )}
    </div>
  );
}

/* Direkt auf der Seite: Verschluss sitzt mit gespeicherten Werten; ziehen und speichern ohne Dialog. */
export function SitzInline({ vid, teilId, capId, bodyUrl: studioBody, capUrl: studioCap, renderId, onGespeichert, onAbbrechen }: {
  vid: string; teilId: string; capId: string; bodyUrl: string; capUrl: string; renderId?: string; onGespeichert?: (neu: number) => void; onAbbrechen?: () => void;
}) {
  const [urls, setUrls] = useState<{ body: string; cap: string; render: boolean } | null>(renderId ? null : { body: studioBody, cap: studioCap, render: false });
  const [geo, setGeo] = useState<KalGeo | null>(null);
  const [fehler, setFehler] = useState(false);
  const [wert, setWert] = useState<{ skala: number; bottomY: number } | null>(null);
  const [basis, setBasis] = useState<{ skala: number; bottomY: number } | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let tot = false; setGeo(null); setFehler(false);
    // Im fertigen Design: auf dem gerenderten Körper anpassen (alte Designs ohne Rohbilder → Studiofoto)
    (renderId ? renderRoh(renderId) : Promise.resolve(null)).then((roh) => {
      if (tot) return;
      const u = roh ? { ...roh, render: true } : { body: studioBody, cap: studioCap, render: false };
      setUrls(u);
      return geometrieLaden(teilId, capId, u.render ? renderId : undefined);
    }).then((r) => {
      if (tot || !r) return;
      if (tot) return;
      if (!r.geo) { setFehler(true); return; }
      const w = { skala: r.geo.gespeichert?.skala ?? r.geo.auto.skala, bottomY: (r.geo.gespeichert?.versatzY ?? r.geo.auto.versatzY) / 100 };
      setGeo(r.geo); setWert(w); setBasis(w);
    });
    return () => { tot = true; };
  }, [teilId, capId, renderId, studioBody, studioCap]);
  const bodyUrl = urls?.body ?? studioBody, capUrl = urls?.cap ?? studioCap;
  if (fehler) return <span className="sx-foto"><img className="sx-foto-cap" src={capUrl} alt="" /><img src={bodyUrl} alt="" /></span>;
  if (!geo || !wert) return <span className="sx-foto laedt"><img src={bodyUrl} alt="" /></span>;
  const geaendert = !!basis && (Math.abs(wert.skala - basis.skala) > 0.0005 || Math.abs(wert.bottomY - basis.bottomY) > 0.0005);
  return (
    <div className="sx-sitz">
      <SitzFlaeche geo={geo} bodyUrl={bodyUrl} capUrl={capUrl} skala={wert.skala} bottomY={wert.bottomY} maxH="min(46vh,420px)"
        onChange={(skala, bottomY) => { setOk(false); setWert({ skala, bottomY }); }} />
      <div className="sx-sitz-leiste">
        {geaendert ? (
          <>
            <button className="sx-mini" disabled={laeuft} onClick={() => setWert(basis)}>Zurück</button>
            <button className="sx-mini an" disabled={laeuft} onClick={async () => {
              setLaeuft(true);
              const r = await kalibrierungSpeichern(vid, teilId, capId, Math.round(wert.skala * 10000) / 10000, Math.round(wert.bottomY * 10000) / 100, geo.body);
              setLaeuft(false);
              if (!r.fehler) { setBasis(wert); setOk(true); onGespeichert?.(r.neu ?? 0); }
            }}>{laeuft ? (renderId ? 'Setzt Designs neu zusammen …' : 'Speichert …') : 'Sitz speichern'}</button>
          </>
        ) : <span className="sx-sitz-tipp">{ok ? 'Gespeichert ✓' : 'Verschluss ziehen · Punkt an der Ecke = Grösse'}</span>}
        <button className="sx-mini" disabled={laeuft} onClick={() => { setOk(false); setWert({ skala: geo.auto.skala, bottomY: geo.auto.versatzY / 100 }); }}>Automatisch</button>
        {onAbbrechen && <button className="sx-mini" disabled={laeuft} onClick={onAbbrechen}>Fertig</button>}
      </div>
    </div>
  );
}

export function Kalibrierung({ vid, teilId, capId, bodyUrl, capUrl, titel, onZu, onGespeichert }: {
  vid: string; teilId: string; capId: string; bodyUrl: string; capUrl: string; titel: string; onZu: () => void; onGespeichert: (neu: number) => void;
}) {
  const [geo, setGeo] = useState<KalGeo | null>(null);
  const [geoFehler, setGeoFehler] = useState('');
  const [skala, setSkala] = useState(0.32);
  const [bottomY, setBottomY] = useState(0.16);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState('');
  const zuruecksetzen = () => { if (geo) { setSkala(geo.auto.skala); setBottomY(geo.auto.versatzY / 100); } };

  return (
    <div className="rg-ov" role="dialog" aria-label="Sitz des Verschlusses anpassen" onClick={() => !laeuft && onZu()}>
      <div className="kal-box" onClick={(e) => e.stopPropagation()}>
        <button className="pn-zu rg-zu" onClick={onZu} disabled={laeuft} aria-label="Schliessen">×</button>
        <h3 className="kal-titel">Sitz anpassen · {titel}</h3>
        <p className="kal-hilfe">Verschluss senkrecht ziehen, mit dem Punkt an der Ecke die Grösse ändern. Gilt ab jetzt für alle Designs mit diesem Teil und Verschluss — fertige Designs werden ohne neuen Render neu zusammengesetzt.{!geo && !geoFehler ? ' Form wird gemessen …' : ''}</p>
        {geoFehler && <p className="pn-fehler">{geoFehler}</p>}
        <div className="kal-flaeche">
          {geo && <SitzFlaeche geo={geo} bodyUrl={bodyUrl} capUrl={capUrl} skala={skala} bottomY={bottomY} maxH="44vh" onChange={(sk, by) => { setSkala(sk); setBottomY(by); }} />}
        </div>
        {fehler && <p className="pn-fehler">{fehler}</p>}
        <div className="kal-aktionen">
          <button className="knopf zweit" onClick={zuruecksetzen} disabled={!geo || laeuft} style={{ marginRight: 'auto' }}>Automatisch</button>
          <button className="knopf zweit" onClick={onZu} disabled={laeuft}>Abbrechen</button>
          <button className="knopf haupt" disabled={laeuft || !geo} onClick={async () => {
            setLaeuft(true); setFehler('');
            const r = await kalibrierungSpeichern(vid, teilId, capId, Math.round(skala * 10000) / 10000, Math.round(bottomY * 10000) / 100, geo!.body);
            setLaeuft(false);
            if (r.fehler) setFehler(r.fehler); else onGespeichert(r.neu ?? 0);
          }}>{laeuft ? 'Speichert und setzt neu zusammen …' : 'Speichern'}</button>
        </div>
      </div>
    </div>
  );
}
