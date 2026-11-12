'use client';
/* ulba · Sitz des Verschlusses anpassen (aus dem ersten ulba, v62–v77).
   Verschluss senkrecht ziehen, Ecke = Grösse. X ist nie frei: der Verschluss
   sitzt mittig auf der Körper-Silhouette. Gespeichert wird je Teil × Verschluss;
   fertige Designs werden ohne neuen KI-Render neu montiert. */
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { geometrieLaden, kalibrierungSpeichern, type KalGeo } from './raster-actions';

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

export function Kalibrierung({ vid, teilId, capId, bodyUrl, capUrl, titel, onZu, onGespeichert }: {
  vid: string; teilId: string; capId: string; bodyUrl: string; capUrl: string; titel: string; onZu: () => void; onGespeichert: (neu: number) => void;
}) {
  const [geo, setGeo] = useState<KalGeo | null>(null);
  const [geoFehler, setGeoFehler] = useState('');
  const [skala, setSkala] = useState(0.32);
  const [bottomY, setBottomY] = useState(0.16);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState('');
  const [box, setBox] = useState<{ w: number; h: number; l: number } | null>(null);
  const bodyRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ modus: 'move' | 'size'; x: number; y: number; skala: number; bottomY: number } | null>(null);

  useEffect(() => {
    let tot = false;
    geometrieLaden(teilId, capId).then((r) => {
      if (tot) return;
      if (r.fehler || !r.geo) { setGeoFehler(r.fehler || 'Geometrie nicht lesbar'); return; }
      setGeo(r.geo); setSkala(r.geo.gespeichert?.skala ?? r.geo.auto.skala); setBottomY((r.geo.gespeichert?.versatzY ?? r.geo.auto.versatzY) / 100);
    });
    return () => { tot = true; };
  }, [teilId, capId]);
  const messe = (el: HTMLImageElement) => { if (el.clientWidth > 0) setBox({ w: el.clientWidth, h: el.clientHeight, l: el.offsetLeft }); };
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => messe(el)); ro.observe(el); return () => ro.disconnect();
  }, [bodyUrl]);
  useEffect(() => { const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !laeuft) onZu(); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [onZu, laeuft]);

  const runter = (modus: 'move' | 'size') => (ev: RPointerEvent) => { ev.preventDefault(); ev.stopPropagation(); (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId); drag.current = { modus, x: ev.clientX, y: ev.clientY, skala, bottomY }; };
  const bewege = (ev: RPointerEvent) => {
    const d = drag.current, b = box; if (!d || !b || !geo) return;
    const dx = (ev.clientX - d.x) / b.w, dy = (ev.clientY - d.y) / b.h;
    if (d.modus === 'move') setBottomY(Math.min(geo.body.neckTopPct / 100 + 0.22, Math.max(-0.6, d.bottomY + dy)));
    else setSkala(Math.min(2, Math.max(0.05, d.skala + dx * 2)));
  };
  const capW = box ? skala * box.w : 0;
  const capH = capW * (geo ? geo.cap.cropRatio : 1);
  const kopf = box ? Math.max(Math.round(box.h * 0.38), Math.ceil(capH - bottomY * box.h) + 10) : 0;
  const mitteX = geo?.body.silhouetteBox ? (geo.body.silhouetteBox.x + geo.body.silhouetteBox.w / 2) / 100 : 0.5;
  const zuruecksetzen = () => { if (geo) { setSkala(geo.auto.skala); setBottomY(geo.auto.versatzY / 100); } };

  return (
    <div className="rg-ov" role="dialog" aria-label="Sitz des Verschlusses anpassen" onClick={() => !laeuft && onZu()}>
      <div className="kal-box" onClick={(e) => e.stopPropagation()} onPointerMove={bewege} onPointerUp={() => { drag.current = null; }}>
        <button className="pn-zu rg-zu" onClick={onZu} disabled={laeuft} aria-label="Schliessen">×</button>
        <h3 className="kal-titel">Sitz anpassen · {titel}</h3>
        <p className="kal-hilfe">Verschluss senkrecht ziehen, mit dem Punkt an der Ecke die Grösse ändern. Gilt ab jetzt für alle Designs mit diesem Teil und Verschluss — fertige Designs werden ohne neuen Render neu zusammengesetzt.{!geo && !geoFehler ? ' Form wird gemessen …' : ''}</p>
        {geoFehler && <p className="pn-fehler">{geoFehler}</p>}
        <div className="kal-flaeche">
          <div className="kal-rahmen" style={box ? { paddingTop: kopf } : undefined}>
            <img ref={bodyRef} className="kal-body" src={bodyUrl} alt="Körper" onLoad={(e) => messe(e.currentTarget)} />
            {box && geo && (
              <div className="kal-cap" style={{ width: capW, height: capH, left: box.l + mitteX * box.w - capW / 2, top: kopf + bottomY * box.h - capH }} onPointerDown={runter('move')}>
                <CapAusschnitt geo={geo} url={capUrl} breite={capW} />
                <i className="kal-griff" onPointerDown={runter('size')} />
              </div>
            )}
          </div>
        </div>
        {fehler && <p className="pn-fehler">{fehler}</p>}
        <div className="kal-aktionen">
          <button className="knopf zweit" onClick={zuruecksetzen} disabled={!geo || laeuft} style={{ marginRight: 'auto' }}>Automatisch</button>
          <button className="knopf zweit" onClick={onZu} disabled={laeuft}>Abbrechen</button>
          <button className="knopf haupt" disabled={laeuft || !geo} onClick={async () => {
            setLaeuft(true); setFehler('');
            const r = await kalibrierungSpeichern(vid, teilId, capId, Math.round(skala * 10000) / 10000, Math.round(bottomY * 10000) / 100);
            setLaeuft(false);
            if (r.fehler) setFehler(r.fehler); else onGespeichert(r.neu ?? 0);
          }}>{laeuft ? 'Speichert und setzt neu zusammen …' : 'Speichern'}</button>
        </div>
      </div>
    </div>
  );
}
