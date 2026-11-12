'use client';
/* ulba · Der Design-Raum (aus dem alten ulba, v61).
   Zwei Achsen: ruhig ↔ laut (Temp_Laut) und klinisch-kühl ↔ warm-sinnlich
   (Farbtemp), beide 0–10. Punkt setzen → die nächstliegenden Welten erscheinen.
   Liegt der Punkt in einer Lücke, zeigen wir ehrlich die nächste Richtung.
   Darüber die Linien der Kundenmarken (aus «Marke lesen»). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WbWelt } from './werkbank';

interface RaumPunkt { x: number; y: number }
let MERKER: RaumPunkt | null = null;
const RAUM_WORTE: { re: RegExp; x?: number; y?: number }[] = [
  { re: /\b(ruhig|leise|still|dezent|zur[uü]ckhaltend|schlicht|minimal)/, x: 2 },
  { re: /\b(laut|bunt|knallig|auff[aä]llig|energ|pop|frech|mutig|kr[aä]ftig)/, x: 8 },
  { re: /\b(k[uü]hl|klinisch|frisch|blau|silber|steril|wissenschaft|apothek)/, y: 2 },
  { re: /\b(warm|sinnlich|gold|sonn|pfirsich|peach|natur|erdig|weich|cremig)/, y: 8 },
  { re: /\b(teuer|luxus|edel|premium|hochwertig)/, x: 3, y: 7 },
];
const lautWort = (x: number) => (x < 3.5 ? 'leise' : x < 6.5 ? 'ausgewogen' : 'laut');
const tempWort = (y: number) => (y < 3.5 ? 'kühl' : y < 6.5 ? 'neutral' : 'warm');
const klemm = (v: number) => Math.max(0, Math.min(10, v));

export function DesignWand({ welten, titel, onWahl, onClose }: {
  welten: WbWelt[]; titel?: string; onWahl: (w: WbWelt) => void; onClose: () => void;
}) {
  const [punkt, setPunkt] = useState<RaumPunkt | null>(MERKER);
  const [gesetzt, setGesetzt] = useState<RaumPunkt | null>(MERKER);
  const [ziehen, setZiehen] = useState(false);
  const [eingabe, setEingabe] = useState('');
  const [lauf, setLauf] = useState(0);
  const feldRef = useRef<HTMLDivElement>(null);

  const imRaum = useMemo(() => welten.filter((c) => c.art === 'welt' && c.laut != null && c.farbtemp != null), [welten]);
  const looks = useMemo(() => welten.filter((c) => c.art === 'look'), [welten]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const setze = useCallback((p: RaumPunkt) => {
    const q = { x: klemm(p.x), y: klemm(p.y) };
    setPunkt(q); setGesetzt(q); setLauf((n) => n + 1); MERKER = q;
  }, []);

  const ausZeiger = (e: { clientX: number; clientY: number }): RaumPunkt | null => {
    const r = feldRef.current?.getBoundingClientRect();
    if (!r) return null;
    return { x: klemm(((e.clientX - r.left) / r.width) * 10), y: klemm((1 - (e.clientY - r.top) / r.height) * 10) };
  };

  const liste = useMemo(() => {
    if (!gesetzt) return [] as { c: WbWelt; d: number }[];
    return imRaum.map((c) => ({ c, d: Math.hypot((c.laut as number) - gesetzt.x, (c.farbtemp as number) - gesetzt.y) }))
      .sort((a, b) => a.d - b.d)
      .filter((v, i, arr) => arr.findIndex((w) => w.c.name === v.c.name) === i)
      .slice(0, 5);
  }, [gesetzt, imRaum]);

  const naechste = liste[0];
  const luecke = !!naechste && naechste.d > 2.5;
  const lesart = punkt ? `${lautWort(punkt.x)} · ${tempWort(punkt.y)}` : '';
  const warum = (c: WbWelt) => [c.laut != null ? lautWort(c.laut) : '', c.farbtemp != null ? tempWort(c.farbtemp) : '',
    c.register ? c.register.replace(/-/g, ' ') : ''].filter(Boolean).join(' · ');

  const eingabeSetzen = () => {
    const t = eingabe.trim().toLowerCase();
    if (!t) return;
    const treffer = imRaum.find((c) => `${c.name} ${c.brand}`.toLowerCase().includes(t));
    if (treffer) { setze({ x: treffer.laut as number, y: treffer.farbtemp as number }); return; }
    let x: number | null = null, y: number | null = null;
    for (const w of RAUM_WORTE) if (w.re.test(t)) { if (w.x != null) x = w.x; if (w.y != null) y = w.y; }
    if (x != null || y != null) setze({ x: x ?? punkt?.x ?? 5, y: y ?? punkt?.y ?? 5 });
  };

  const taste = (e: React.KeyboardEvent) => {
    const p = punkt || { x: 5, y: 5 };
    const s = e.shiftKey ? 2 : 0.5;
    const z: Record<string, RaumPunkt> = {
      ArrowLeft: { x: p.x - s, y: p.y }, ArrowRight: { x: p.x + s, y: p.y },
      ArrowUp: { x: p.x, y: p.y + s }, ArrowDown: { x: p.x, y: p.y - s },
    };
    if (z[e.key]) { e.preventDefault(); setze(z[e.key]); }
    else if (e.key === 'Enter' && naechste) onWahl(naechste.c);
  };

  return (
    <div className="dw-ov" role="dialog" aria-label="Design wählen" onClick={onClose}>
      <div className="dw-box dr-box" onClick={(e) => e.stopPropagation()}>
        <div className="dw-kopf">
          <div>
            <h3 className="serif">{titel || 'In welchem Design?'}</h3>
            <span className="dw-sub">Setz einen Punkt im Raum — ulba zeigt dir die Welten, die dort liegen.</span>
          </div>
          <button className="pn-zu" onClick={onClose} aria-label="schließen">×</button>
        </div>

        <div className="dr-leiste">
          <form className="dr-eingabe" onSubmit={(e) => { e.preventDefault(); eingabeSetzen(); }}>
            <input value={eingabe} onChange={(e) => setEingabe(e.target.value)} placeholder="Beschreib es kurz, z. B. ruhig und warm …" aria-label="Richtung beschreiben" />
            {!!eingabe.trim() && <button type="submit">↵</button>}
          </form>
          {!!looks.length && (
            <div className="dr-ws" role="group" aria-label="Linien deiner Marken"><span className="dr-ws-lbl">MARKEN</span>
              {looks.map((l) => (
                <button key={l.id} className="dw-pill wb-look" onClick={() => onWahl(l)} title={l.wirkung || l.name}>
                  {l.bodyHex && <i style={{ background: l.bodyHex }} />}{l.brand ? `${l.brand} · ` : ''}{l.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="dr-body">
          <div className="dr-feld-rahmen">
            <span className="dr-achse dr-oben">warm · sinnlich</span>
            <span className="dr-achse dr-unten">klinisch · kühl</span>
            <span className="dr-achse dr-links">ruhig</span>
            <span className="dr-achse dr-rechts">laut</span>
            <div ref={feldRef} className={`dr-feld${ziehen ? ' zieht' : ''}${punkt ? '' : ' leer'}`}
              tabIndex={0} role="slider" aria-label="Position im Design-Raum" aria-valuetext={punkt ? lesart : 'kein Punkt gesetzt'}
              onKeyDown={taste}
              onPointerDown={(e) => { const p = ausZeiger(e); if (!p) return; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setZiehen(true); setPunkt(p); }}
              onPointerMove={(e) => { if (!ziehen) return; const p = ausZeiger(e); if (p) setPunkt(p); }}
              onPointerUp={(e) => { if (!ziehen) return; setZiehen(false); const p = ausZeiger(e); if (p) setze(p); }}
              onPointerCancel={() => setZiehen(false)}>
              <i className="dr-mitte-h" /><i className="dr-mitte-v" />
              {imRaum.map((c) => (
                <i key={c.id} className="wb-raumpunkt" style={{ left: `${(c.laut as number) * 10}%`, top: `${100 - (c.farbtemp as number) * 10}%`, background: c.bodyHex || '#C9C7C1' }} />
              ))}
              {punkt ? (
                <>
                  <i className="dr-faden-h" style={{ top: `${100 - punkt.y * 10}%` }} />
                  <i className="dr-faden-v" style={{ left: `${punkt.x * 10}%` }} />
                  <div className="dr-punkt" style={{ left: `${punkt.x * 10}%`, top: `${100 - punkt.y * 10}%` }}>
                    <span className="dr-halo" /><span className="dr-kern" />
                    <span className={`dr-lesart${punkt.x > 7 ? ' links' : ''}${punkt.y < 1.5 ? ' hoch' : ''}`}>{lesart}</span>
                  </div>
                </>
              ) : (
                <div className="dr-hinweis">Tipp oder zieh irgendwohin</div>
              )}
            </div>
          </div>

          <div className="dr-welten" aria-live="polite">
            {!imRaum.length && <div className="dw-leer">Die Design-Welten sind gerade nicht erreichbar.</div>}
            {!!imRaum.length && !gesetzt && (
              <div className="dr-start">
                <b>Wo steht deine Marke?</b>
                <span>Links ruhig, rechts laut. Oben warm und sinnlich, unten klinisch und kühl. Setz deinen Punkt — die passenden Welten erscheinen hier.</span>
              </div>
            )}
            {!!naechste && (
              <div key={lauf} className="dr-liste">
                <div className="dr-kopfzeile">
                  <span>{luecke ? 'Nächstliegende Richtung' : `Deine Richtung · ${(naechste.c.register || '').replace(/-/g, ' ')}`}</span>
                  {luecke && <em>An deinem Punkt gibt es noch keine Referenz.</em>}
                </div>
                {liste.map(({ c }, i) => (
                  <button key={c.id} className={`dr-k${i === 0 ? ' erste' : ''}`} style={{ animationDelay: `${i * 45}ms` }} onClick={() => onWahl(c)} title={c.wirkung || c.name}>
                    <div className="dr-k-bild">
                      {c.bild ? <img src={c.bild} alt={c.name} /> : <span className="dw-k-ph">◻</span>}
                      <span className="dw-k-farben">
                        {c.bodyHex && <i style={{ background: c.bodyHex }} />}
                        {c.capHex && <i style={{ background: c.capHex }} />}
                      </span>
                    </div>
                    <div className="dr-k-text">
                      <span className="dr-k-nm">{c.name}</span>
                      <span className="dr-k-warum">{warum(c)}</span>
                      {i === 0 && c.wirkung && <span className="dr-k-wirkung">{c.wirkung}</span>}
                      {i === 0 && <span className="dr-k-cta">In diesem Design rendern</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
