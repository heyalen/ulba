'use client';
/* ulba · app/_ulba/linie.tsx — Linien (v82, 28.10.2026).
   Eine Linie = Geschwister, die man als EINE Marke erkennt.
   · Horizontal (LinieWeiterfuehren): gleiches Teil, gleiche Welt, nur die
     Akzentfarbe wechselt — fertiger Render wird per Edit umgefaerbt.
   · Vertikal (VertikaleLinie): mehrere Teile aus «Meine Linien», eine Welt.
     Jedes Teil wird normal gerendert, danach zieht der Range-Lock alle auf
     die gemessene Akzentfarbe des ersten Teils (Angleichen nur bei Abweichung).
   Server: /api/render mit { variante } bzw. { farbe } (render.ts v82). */

import { useState, useEffect, type ReactNode } from 'react';
import { kontoFetch } from '@/lib/konto';

const RENDER_API = 'https://ulba-vision-renderer.vercel.app/api/render';
const REC_ID = /^rec[A-Za-z0-9]{14}$/;
const AT_URL = /airtableusercontent\.com|dl\.airtable\.com/;
const stabil = (id: string) => `/api/bild?r=${id}`;

export type LinienKachel = {
  key: string;
  titel: string;          // Farbe bzw. Teilname
  hex?: string | null;
  url: string | null;
  cacheId: string | null;
  status: 'laeuft' | 'fertig' | 'fehler';
  fehler?: string;
  notiz?: string;         // z. B. «schon im Ton — unverändert»
};

const anzeigeUrl = (renderingUrl: string, cacheId: string | null) =>
  cacheId && REC_ID.test(cacheId) && AT_URL.test(renderingUrl) ? stabil(cacheId) : renderingUrl;

async function postJson(body: unknown): Promise<any> {
  const r = await kontoFetch(RENDER_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d?.error) throw new Error(d?.error || `Fehler ${r.status}`);
  return d;
}

/* 409 = Quelle wird noch gespeichert: kurz warten, einmal neu. */
async function mitGeduld<T>(f: () => Promise<T>): Promise<T> {
  try { return await f(); }
  catch (e) {
    if (e instanceof Error && /noch gespeichert/.test(e.message)) { await new Promise(r => setTimeout(r, 4000)); return f(); }
    throw e;
  }
}

/* ── Range-Board: die Geschwister nebeneinander + die «weil»-Zeile ── */
export function RangeBoard({ kacheln, konstant, variabel, onBild }: {
  kacheln: LinienKachel[]; konstant: string; variabel: string;
  onBild?: (k: LinienKachel) => void;
}) {
  return (
    <div className="rb">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="rb-raster" style={{ gridTemplateColumns: `repeat(${Math.min(kacheln.length, 4)}, minmax(0, 1fr))` }}>
        {kacheln.map(k => (
          <button key={k.key} type="button" className="rb-k" disabled={k.status !== 'fertig' || !onBild} onClick={() => onBild?.(k)}>
            <span className="rb-bild">
              {k.status === 'fertig' && k.url && <img src={k.url} alt={k.titel} />}
              {k.status === 'laeuft' && <span className="rb-laeuft" />}
              {k.status === 'fehler' && <span className="rb-fehler">{k.fehler || 'Fehlgeschlagen'}</span>}
            </span>
            <span className="rb-name">{k.hex && <i style={{ background: k.hex }} />}{k.titel}</span>
            {k.notiz && <span className="rb-notiz">{k.notiz}</span>}
          </button>
        ))}
      </div>
      <p className="rb-weil"><b>Gleich:</b> {konstant}<br /><b>Anders:</b> {variabel}</p>
    </div>
  );
}

/* ── Horizontal: im Detail-Panel unter einem fertigen Render ── */
export function LinieWeiterfuehren({ quelle, weltName, onBild, onRest, onNeu }: {
  quelle: { cacheId: string; url: string };
  weltName: string;
  onBild: (url: string, cacheId: string | null) => void;
  onRest?: (n: number) => void;
  onNeu?: (k: { url: string; cacheId: string | null; hex: string }) => void; // v83: neue Variante → Projekt
}) {
  const [offen, setOffen] = useState(false);
  const [farben, setFarben] = useState<string[]>([]);
  const [eigen, setEigen] = useState('#FF7F6E');
  const [kacheln, setKacheln] = useState<LinienKachel[]>([]);
  const [laeuft, setLaeuft] = useState(false);

  const umschalten = (hex: string) => setFarben(f => f.includes(hex) ? f.filter(x => x !== hex) : f.length >= 4 ? f : [...f, hex]);

  const erzeugen = async () => {
    if (!farben.length || laeuft) return;
    setLaeuft(true);
    const start: LinienKachel[] = [
      { key: 'quelle', titel: 'Original', url: quelle.url, cacheId: quelle.cacheId, status: 'fertig' },
      ...farben.map(hex => ({ key: hex, titel: hex, hex, url: null, cacheId: null, status: 'laeuft' as const })),
    ];
    setKacheln(start);
    const setze = (key: string, p: Partial<LinienKachel>) => setKacheln(ks => ks.map(k => k.key === key ? { ...k, ...p } : k));
    // Nacheinander: Kontingent zaehlt ehrlich mit, eine Wand stoppt den Rest.
    for (const hex of farben) {
      try {
        const d = await mitGeduld(() => postJson({ variante: { quelleCacheId: quelle.cacheId, zielHex: hex, art: 'variante', quelleUrl: /^https:/.test(quelle.url) ? quelle.url : undefined } }));
        const vUrl = anzeigeUrl(d.renderingUrl, d.cacheId);
        setze(hex, { status: 'fertig', url: vUrl, cacheId: d.cacheId || null, notiz: d.unveraendert ? 'schon in diesem Ton' : undefined });
        if (!d.unveraendert) onNeu?.({ url: vUrl, cacheId: d.cacheId || null, hex });
        if (typeof d.rendersRest === 'number') onRest?.(d.rendersRest);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Fehlgeschlagen';
        setze(hex, { status: 'fehler', fehler: msg });
        if (/Kontingent|aufgebraucht/.test(msg)) {
          setKacheln(ks => ks.map(k => k.status === 'laeuft' ? { ...k, status: 'fehler', fehler: 'Kein Render mehr übrig' } : k));
          break;
        }
      }
    }
    setLaeuft(false);
  };

  if (!offen) {
    return (
      <button type="button" className="li-start" onClick={() => setOffen(true)}>
        <span className="li-punkte" aria-hidden><i /><i /><i /></span>
        <span><b>Farbvarianten</b><small>Gleiches Design, andere Akzentfarbe — z. B. für mehrere Sorten</small></span>
      </button>
    );
  }
  return (
    <div className="li">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="li-kopf"><b>Farbvarianten</b><span>Form, Verschluss und Design bleiben gleich — nur die Akzentfarbe wechselt. Bis zu 4 Farben, jede zählt als ein Render.</span><button type="button" className="li-zu" onClick={() => setOffen(false)} disabled={laeuft} aria-label="Schliessen">×</button></div>
      {/* v82.1 — ein Farbfeld statt Vorschlags-Chips (Alen: «verwirrend»). */}
      <div className="li-farben">
        <label className="li-wahl">
          <input type="color" value={eigen} onChange={e => setEigen(e.target.value.toUpperCase())} disabled={laeuft} />
          <span>{eigen.toUpperCase()}</span>
        </label>
        <button type="button" className="knopf zweit li-dazu" onClick={() => umschalten(eigen.toUpperCase())} disabled={laeuft || farben.length >= 4 || farben.includes(eigen.toUpperCase())}>Farbe hinzufügen</button>
      </div>
      {farben.length > 0 && (
        <div className="li-farben">
          {farben.map(h => (
            <button key={h} type="button" className="li-f an" onClick={() => umschalten(h)} disabled={laeuft} title="Entfernen"><i style={{ background: h }} />{h} ×</button>
          ))}
        </div>
      )}
      <button type="button" className="knopf haupt li-los" onClick={erzeugen} disabled={!farben.length || laeuft}>
        {laeuft ? 'Linie entsteht …' : `${farben.length || ''} ${farben.length === 1 ? 'Variante' : 'Varianten'} erzeugen`.trim()}
      </button>
      {kacheln.length > 0 && (
        <RangeBoard kacheln={kacheln}
          konstant={`Teil, Verschluss, Form und Design (${weltName})`}
          variabel="Akzentfarbe"
          onBild={k => k.url && onBild(k.url, k.cacheId)} />
      )}
    </div>
  );
}

/* ── Vertikal: mehrere Teile, eine Welt (aus «Meine Linien») ── */
export type LinienTeil = { id: string; name: string; imageUrl?: string | null };

export function VertikaleLinie({ teile, projektName, waehleWelt, onClose, onDesign }: {
  teile: LinienTeil[];
  projektName: string;
  /* Rendert die Design-Wand; ruft onWahl mit der gewaehlten Welt. */
  waehleWelt: (onWahl: (w: { id: string; name: string }) => void, onAbbruch: () => void) => ReactNode;
  onClose: () => void;
  /* v83: jedes fertige Teil der Linie landet im Projekt (eine Gruppe). */
  onDesign?: (d: { id: string; url: string; systemId: string; teilName: string; weltName: string; hex?: string | null; gruppe: string }) => void;
}) {
  const [gruppe] = useState(() => 'ln_' + Date.now().toString(36));
  const [gemeldet, setGemeldet] = useState(false);
  const [welt, setWelt] = useState<{ id: string; name: string } | null>(null);
  const [kacheln, setKacheln] = useState<LinienKachel[]>([]);
  const [lockHex, setLockHex] = useState<string | null>(null);
  const [phase, setPhase] = useState<'wahl' | 'rendern' | 'angleichen' | 'fertig'>('wahl');
  const auswahl = teile.slice(0, 6);

  const setze = (key: string, p: Partial<LinienKachel>) => setKacheln(ks => ks.map(k => k.key === key ? { ...k, ...p } : k));

  const starten = async (w: { id: string; name: string }) => {
    setWelt(w); setPhase('rendern');
    setKacheln(auswahl.map(t => ({ key: t.id, titel: t.name, url: null, cacheId: null, status: 'laeuft' })));

    // 1. Jedes Teil normal in der Welt rendern (parallel; Cache greift).
    const roh = await Promise.all(auswahl.map(async t => {
      try {
        const d = await postJson({ systemId: t.id, query: t.name, tier: 'lite', forceCodeId: w.id, sucheQuery: null });
        const cid = typeof d.cacheId === 'string' && REC_ID.test(d.cacheId) ? d.cacheId : null;
        const url = anzeigeUrl(d.renderingUrl, cid);
        setze(t.id, { status: 'fertig', url, cacheId: cid });
        return { t, cid, falUrl: /^https:/.test(d.renderingUrl) ? d.renderingUrl as string : undefined };
      } catch (e) {
        setze(t.id, { status: 'fehler', fehler: e instanceof Error ? e.message : 'Fehlgeschlagen' });
        return null;
      }
    }));
    const ok = roh.filter((x): x is { t: LinienTeil; cid: string; falUrl: string | undefined } => !!x && !!x.cid);
    if (ok.length < 2) { setPhase('fertig'); return; }

    // 2. Range-Lock: Akzentfarbe des ersten Teils messen, Rest angleichen.
    setPhase('angleichen');
    let hex: string | null = null;
    try { hex = (await mitGeduld(() => postJson({ farbe: { cacheId: ok[0].cid } }))).hex || null; } catch { hex = null; }
    setLockHex(hex);
    if (!hex) { setPhase('fertig'); return; }
    setze(ok[0].t.id, { hex, notiz: 'gibt die Farbe vor' });
    for (const x of ok.slice(1)) {
      setze(x.t.id, { status: 'laeuft' });
      try {
        const d = await mitGeduld(() => postJson({ variante: { quelleCacheId: x.cid, zielHex: hex, art: 'angleichen', quelleUrl: x.falUrl } }));
        setze(x.t.id, { status: 'fertig', url: anzeigeUrl(d.renderingUrl, d.cacheId), cacheId: d.cacheId || x.cid, hex, notiz: d.unveraendert ? 'passte schon' : 'Farbe abgestimmt' });
      } catch (e) {
        // Angleichen gescheitert: der normale Render bleibt stehen.
        setze(x.t.id, { status: 'fertig', notiz: `nicht angeglichen — ${e instanceof Error ? e.message : 'Fehler'}` });
      }
    }
    setPhase('fertig');
  };

  // Am Ende einmal alle fertigen Teile ins Projekt (auch ohne Angleichen).
  useEffect(() => {
    if (phase !== 'fertig' || gemeldet || !welt) return;
    setGemeldet(true);
    for (const k of kacheln) {
      if (k.status === 'fertig' && k.url) onDesign?.({ id: k.cacheId || k.url, url: k.url, systemId: k.key, teilName: k.titel, weltName: welt.name, hex: k.hex || lockHex, gruppe });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === 'wahl') return <>{waehleWelt(starten, onClose)}</>;

  return (
    <div className="vl-ebene" onClick={onClose}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="vl-karte" onClick={e => e.stopPropagation()}>
        <div className="vl-kopf">
          <div><h3 className="serif">{projektName}</h3><p>Linie · {auswahl.length} Teile in {welt?.name}{teile.length > 6 ? ` (die ersten 6 von ${teile.length})` : ''}</p></div>
          <button type="button" className="vl-zu" onClick={onClose} aria-label="Schliessen">×</button>
        </div>
        <p className="vl-status">
          {phase === 'rendern' && 'Alle Teile werden im Design gezeigt …'}
          {phase === 'angleichen' && 'Farben werden aufeinander abgestimmt …'}
          {phase === 'fertig' && 'Fertig — gespeichert im Projekt unter «Designs».'}
        </p>
        <RangeBoard kacheln={kacheln}
          konstant={`Design ${welt?.name || ''}${lockHex ? ` · Akzentfarbe ${lockHex}` : ''}`}
          variabel="Packmittel (Form, Grösse, Funktion)" />
        {phase === 'fertig' && <button type="button" className="knopf haupt vl-fertig" onClick={onClose}>Zu den Designs</button>}
      </div>
    </div>
  );
}

const CSS = `
.li-start{display:flex;align-items:center;gap:12px;width:100%;margin-top:10px;padding:12px 14px;border:1px dashed var(--linie);border-radius:14px;text-align:left;transition:border-color .15s,background .15s}
.li-start:hover{border-color:#c9c9c4;background:var(--nische)}
.li-start b{display:block;font-size:14px;font-weight:600}
.li-start small{display:block;color:var(--grau);font-size:12.5px;margin-top:1px}
.li-punkte{display:flex;flex:none}
.li-punkte i{width:16px;height:16px;border-radius:50%;border:2px solid var(--panel);margin-left:-5px}
.li-punkte i:nth-child(1){background:#00AEEF;margin-left:0}.li-punkte i:nth-child(2){background:#F5B700}.li-punkte i:nth-child(3){background:#FF7F6E}
.li-kopf{position:relative;padding-right:30px}
.li-zu{position:absolute;top:-4px;right:-4px;width:28px;height:28px;border-radius:50%;font-size:18px;color:var(--hell)}
.vl-fertig{margin-top:14px;width:100%}
.li{margin-top:14px;border:1px solid var(--linie);border-radius:14px;padding:16px;background:var(--panel)}
.li-kopf{display:flex;flex-direction:column;gap:3px;margin-bottom:12px;font-size:13.5px}
.li-kopf span{color:var(--grau);font-size:12.5px;line-height:1.45}
.li-farben{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px}
.li-f{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--linie);border-radius:999px;padding:6px 12px 6px 7px;font-size:12.5px;background:#fff;cursor:pointer}
.li-f.an{border-color:var(--tinte);box-shadow:inset 0 0 0 1px var(--tinte)}
.li-f i{width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,.12);display:inline-block}
.li-wahl{display:inline-flex;align-items:center;gap:9px;border:1px solid var(--linie);border-radius:999px;padding:4px 14px 4px 5px;background:#fff;cursor:pointer;font-family:var(--mono);font-size:13px}
.li-wahl input{width:30px;height:30px;border:none;padding:0;background:none;cursor:pointer;border-radius:50%}
.li-dazu{padding:8px 16px}
.li-los{width:100%;margin:4px 0 2px}
.rb{margin-top:14px}
.rb-raster{display:grid;gap:10px}
.rb-k{display:flex;flex-direction:column;gap:6px;text-align:left;background:none;border:none;padding:0;min-width:0}
.rb-k:disabled{cursor:default}
.rb-bild{aspect-ratio:9/16;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid var(--linie);border-radius:11px;overflow:hidden}
.rb-bild img{width:100%;height:100%;object-fit:contain}
.rb-laeuft{width:26px;height:26px;border-radius:50%;border:2px solid var(--linie);border-top-color:var(--tinte);animation:rbdreh 0.9s linear infinite}
@keyframes rbdreh{to{transform:rotate(360deg)}}
.rb-fehler{font-size:11.5px;color:var(--rouge);padding:10px;text-align:center;line-height:1.4}
.rb-name{display:flex;align-items:center;gap:6px;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-name i{width:11px;height:11px;border-radius:50%;flex:none;border:1px solid rgba(0,0,0,.12)}
.rb-notiz{font-size:11px;color:var(--hell)}
.rb-weil{margin-top:12px;font-size:12.5px;line-height:1.6;color:var(--grau);border-top:1px solid var(--linie2);padding-top:10px}
.rb-weil b{color:var(--tinte);font-weight:600}
.vl-ebene{position:fixed;inset:0;z-index:80;background:rgba(20,20,18,.35);display:flex;align-items:center;justify-content:center;padding:16px}
.vl-karte{background:var(--panel);border-radius:18px;width:min(980px,100%);max-height:92vh;overflow-y:auto;padding:24px 26px 22px;box-shadow:0 20px 60px rgba(0,0,0,.18)}
.vl-kopf{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.vl-kopf h3{font-size:22px;margin:0 0 3px}
.vl-kopf p{color:var(--grau);font-size:13px;margin:0}
.vl-zu{font-size:24px;line-height:1;width:34px;height:34px;border-radius:50%;border:1px solid var(--linie);background:#fff}
.vl-status{font-size:12.5px;color:var(--hell);margin:12px 0 0}
.lin-aktion{margin:12px 0 0}
@media (max-width:640px){.rb-raster{grid-template-columns:repeat(2,minmax(0,1fr))!important}.vl-karte{padding:18px 16px}}
`;
