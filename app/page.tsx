'use client';

import { useState, useEffect, useCallback } from 'react';

const RENDER_API = 'https://ulba-vision-renderer.vercel.app/api/render';
const SEARCH_API = 'https://ulba-vision-renderer.vercel.app/api/search';

const EXAMPLES = [
  { label: 'Ruhig & teuer', q: 'Feminine luxury glass serum, premium' },
  { label: 'Laut & jung', q: 'Gen Z bold color fun affordable' },
  { label: 'Männlich minimal', q: 'Mens shampoo minimal clean masculine' },
  { label: 'Clean & nachhaltig', q: 'Sustainable clean beauty refill bamboo' },
  { label: 'Premium Ritual', q: 'Premium anti-aging ceremonial glass luxe' },
];

const TYPE_LABELS: Record<string, string> = {
  Jar_ScrewCap: 'Tiegel · Schraub', Bottle_ScrewCap: 'Flasche · Schraub',
  Bottle_DispenserPump: 'Flasche · Pumpe', Airless_Bottle: 'Airless',
  Airless_Jar: 'Airless Tiegel', Bottle_FlipTop: 'Flasche · Flip',
  Bottle_Dropper: 'Flasche · Pipette', Bottle_Spray: 'Flasche · Spray',
  Tube_FlipTop: 'Tube · Flip', Tube_ScrewCap: 'Tube · Schraub',
  Bottle_TriggerPump: 'Flasche · Trigger',
};

const FILTER_LABELS: Record<string, string> = {
  materials: 'Material', types: 'Typ', closures: 'Verschluss', sizes: 'Größe',
};

// Volumen → Regal-Höhe (Maßstab). Erste verfügbare Größe bestimmt den Bucket.
const VOL_BUCKET: Record<number, number> = { 15: 150, 20: 162, 30: 178, 50: 205, 75: 232, 100: 258, 150: 288, 200: 310 };
function sizeToHeight(sizes?: string[]): number {
  const raw = sizes?.[0] || '';
  const ml = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  if (!ml || Number.isNaN(ml)) return 205;
  const keys = Object.keys(VOL_BUCKET).map(Number);
  const near = keys.reduce((a, b) => (Math.abs(b - ml) < Math.abs(a - ml) ? b : a));
  return VOL_BUCKET[near];
}

interface Result {
  id: string; name: string; score: number; reasoning: string;
  type: string; material: string[]; form: string[]; closure: string;
  description?: string; imageUrl: string | null;
  capabilities: string[]; availableSizes: string[]; availableMaterials: string[];
  capCount: number; capImages?: string[];
  supplier?: string;
}
type ParsedFilters = { sizes: string[]; materials: string[]; types: string[]; closures: string[] };
interface Project { id: string; name: string; createdAt: number; }
interface FavoriteEntry { productId: string; projectId: string; savedAt: number; product: Result; }

const LS_PROJECTS  = 'ulba_projects';
const LS_FAVORITES = 'ulba_favorites';

function loadProjects(): Project[] {
  try { const raw = localStorage.getItem(LS_PROJECTS); if (raw) return JSON.parse(raw); } catch {}
  const def: Project[] = [{ id: 'default', name: 'Meine Sammlung', createdAt: Date.now() }];
  localStorage.setItem(LS_PROJECTS, JSON.stringify(def)); return def;
}
function saveProjects(p: Project[]) { localStorage.setItem(LS_PROJECTS, JSON.stringify(p)); }
function loadFavorites(): FavoriteEntry[] {
  try { const raw = localStorage.getItem(LS_FAVORITES); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function saveFavorites(f: FavoriteEntry[]) { localStorage.setItem(LS_FAVORITES, JSON.stringify(f)); }

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600&display=swap');
:root{
  --weiss:#FFFFFF;--tinte:#17181A;--grau:#6F7276;--hell:#B4B6B9;
  --rouge:#4C1420;--linie:#ECEBE9;--linie2:#F4F3F2;--r:14px;
}
.ulba{background:var(--weiss);color:var(--tinte);min-height:100vh;font-family:'Instrument Sans',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
.ulba *{box-sizing:border-box}
.ulba button{font:inherit;color:inherit;background:none;border:none;cursor:pointer}
.ulba input,.ulba textarea{font:inherit}
.ulba :focus-visible{outline:1.5px solid var(--tinte);outline-offset:2px}
.serif{font-family:'Instrument Serif',Georgia,serif}
.kursiv{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400}

.kopf{position:sticky;top:0;z-index:40;background:rgba(255,255,255,.88);backdrop-filter:blur(12px);display:flex;align-items:center;gap:16px;padding:15px 32px}
.marke{font-family:'Instrument Serif',serif;font-size:24px;letter-spacing:-.01em;line-height:1;cursor:pointer;flex-shrink:0}
.kopf-suche{flex:1;display:flex;justify-content:center}
.kopf-feld{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--linie);border-radius:999px;padding:9px 20px;width:100%;max-width:640px;box-shadow:0 3px 18px -12px rgba(23,24,26,.14)}
.kopf-feld input{flex:1;border:0;background:transparent;outline:none;font-size:14px;color:var(--tinte)}
.kopf-feld input::placeholder{color:var(--hell)}
.kopf-btn{display:flex;align-items:center;gap:7px;font-size:14px;color:var(--grau);flex-shrink:0}
.kopf-btn:hover{color:var(--tinte)}
.kopf-btn .z{font-size:12px;background:var(--tinte);color:#fff;border-radius:999px;min-width:19px;height:19px;display:inline-flex;align-items:center;justify-content:center;padding:0 6px}

.landing{display:flex;flex-direction:column;align-items:center;padding:104px 24px 60px;text-align:center}
.landing h1{font-family:'Instrument Serif',serif;font-size:clamp(38px,5.4vw,56px);line-height:1.05;letter-spacing:-.02em;max-width:16ch;margin:0 auto 16px}
.landing h1 em{font-style:italic;color:var(--rouge)}
.landing .unter{color:var(--grau);max-width:40ch;margin:0 auto 40px}
.feld{display:flex;align-items:center;max-width:600px;width:100%;border:1px solid var(--linie);border-radius:999px;background:#fff;padding:5px 5px 5px 22px;box-shadow:0 4px 24px -12px rgba(23,24,26,.12)}
.feld input{flex:1;border:0;background:transparent;outline:none;padding:12px 6px;font-size:16px;color:var(--tinte)}
.feld input::placeholder{color:var(--hell)}
.feld button{background:var(--tinte);color:#fff;padding:12px 26px;border-radius:999px;font-size:14px;flex-shrink:0}
.feld button:hover{background:var(--rouge)}
.chips-ein{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:20px;max-width:560px}
.chip-ein{padding:8px 15px;border-radius:999px;font-size:13px;color:var(--grau)}
.chip-ein:hover{background:var(--linie2);color:var(--tinte)}
.chip-ein.an{background:var(--tinte);color:#fff}

.results{max-width:1200px;margin:0 auto;padding:0 32px}
.gelesen{margin:24px 0 8px;color:var(--grau);display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;font-size:14px}
.gelesen .pal{font-family:'Instrument Serif',serif;font-style:italic;font-size:20px;color:var(--tinte)}
.gelesen .treffer{margin-left:auto;color:var(--hell)}
.fzeile{display:flex;gap:7px;flex-wrap:wrap;padding:6px 0 8px}
.fchip{display:inline-flex;align-items:center;gap:8px;background:var(--linie2);padding:6px 8px 6px 13px;border-radius:999px;font-size:13px;color:var(--grau)}
.fchip .x{cursor:pointer;color:var(--hell);font-size:15px;line-height:1}
.fchip .x:hover{color:var(--rouge)}

.abschnitt{display:flex;justify-content:space-between;align-items:baseline;margin:34px 0 4px}
.abschnitt .h{font-family:'Instrument Serif',serif;font-size:20px}
.abschnitt .s{color:var(--hell);font-size:13px}

.regale{margin-bottom:6px}
.regal-reihe{display:flex;align-items:flex-end;gap:clamp(20px,3.2vw,54px);padding:46px 4px 0;position:relative;overflow-x:auto}
.regal-reihe::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--linie)}
.regal-reihe::-webkit-scrollbar{display:none}
.stellplatz{position:relative;display:flex;flex-direction:column;align-items:center;flex:none;padding-bottom:30px;cursor:pointer;transition:transform .2s}
.stellplatz:hover{transform:translateY(-5px)}
.obj-wrap{position:relative;display:flex;align-items:flex-end;justify-content:center;filter:drop-shadow(0 12px 16px rgba(23,24,26,.09))}
.obj-wrap img{object-fit:contain;object-position:bottom;display:block}
.obj-ph{display:flex;align-items:center;justify-content:center;color:#d8d8d6}
.score{position:absolute;top:2px;right:-2px;font-size:11px;color:var(--hell);font-variant-numeric:tabular-nums;z-index:2}
.stellplatz:hover .score,.kachel:hover .score{color:var(--grau)}
.nm{position:absolute;bottom:6px;font-size:12.5px;color:var(--grau);white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis}
.stellplatz:hover .nm{color:var(--tinte)}
.stellplatz .fav{position:absolute;top:0;left:-4px;z-index:3;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;font-size:13px;opacity:0;transition:opacity .15s}
.stellplatz:hover .fav{opacity:1}

.raster{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;padding-bottom:20px}
.kachel{background:#FAFAF9;border:1px solid var(--linie2);border-radius:12px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;transition:border-color .15s,transform .15s;overflow:hidden}
.kachel:hover{border-color:var(--linie);transform:translateY(-2px)}
.kachel img{max-width:78%;max-height:74%;object-fit:contain}
.kachel .score{top:8px;right:9px}
.kachel .kn{position:absolute;bottom:8px;left:10px;right:10px;font-size:11.5px;color:var(--hell);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kachel:hover .kn{color:var(--grau)}
.kachel .fav{position:absolute;top:7px;left:8px;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;font-size:12px;opacity:0;transition:opacity .15s}
.kachel:hover .fav{opacity:1}
.ffzeile{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 18px}
.ff{padding:6px 13px;border-radius:999px;font-size:13px;color:var(--grau);border:1px solid var(--linie);background:#fff}
.ff:hover{border-color:var(--hell);color:var(--tinte)}
.ff.an{background:var(--tinte);border-color:var(--tinte);color:#fff}
.mehr-btn{display:block;margin:8px auto 60px;border:1px solid var(--linie);border-radius:999px;padding:11px 26px;font-size:14px;color:var(--grau);background:#fff}
.mehr-btn:hover{border-color:var(--tinte);color:var(--tinte)}

.status-z{padding:10px 0 20px;font-size:14px;color:var(--grau)}

.panel-bg{position:fixed;inset:0;background:rgba(23,24,26,.22);z-index:50}
.panel{position:fixed;top:0;right:0;width:680px;max-width:100vw;height:100%;background:#fff;z-index:51;overflow-y:auto;box-shadow:-2px 0 40px rgba(23,24,26,.1)}
.panel-in{padding:32px 44px 56px}
.panel-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;gap:10px}
.ptool{display:flex;align-items:center;gap:7px;background:var(--linie2);color:var(--grau);border-radius:999px;padding:10px 18px;font-size:14px}
.ptool:hover{color:var(--tinte)}
.ptool.an{background:#fff0f4;color:var(--rouge)}
.ptool.ok{background:#f0fdf4;color:#16a34a}
.pclose{background:var(--linie2);border-radius:999px;width:40px;height:40px;color:var(--grau);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pbild{width:100%;aspect-ratio:1;background:#FAFAF9;border:1px solid var(--linie2);border-radius:var(--r);display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:26px}
.pbild img{width:100%;height:100%;object-fit:contain;padding:26px}
.ptitel{font-family:'Instrument Serif',serif;font-size:30px;line-height:1.15;letter-spacing:-.015em;margin-bottom:5px}
.psub{font-size:14px;color:var(--hell);margin-bottom:22px}
.pgrund{font-family:'Instrument Serif',serif;font-style:italic;font-size:18px;line-height:1.45;color:var(--grau);margin:0 0 22px;padding-left:15px;border-left:1px solid var(--rouge)}
.pblock-lbl{font-size:12px;color:var(--hell);margin-bottom:12px;letter-spacing:.02em}
.specs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}
.spec{background:#FAFAF9;border-radius:12px;padding:14px 18px}
.spec .k{font-size:11px;color:var(--hell);margin-bottom:4px}
.spec .v{font-size:14.5px;font-weight:500;color:var(--tinte)}
.chip{background:var(--linie2);color:var(--grau);border-radius:999px;padding:5px 11px;font-size:12px;white-space:nowrap;display:inline-block}
.vis{background:#FAFAF9;border-radius:var(--r);padding:20px 22px;margin:24px 0}
.vis .top{font-size:12px;color:var(--hell);margin-bottom:12px;letter-spacing:.02em}
.vis .row{display:flex;gap:8px;align-items:center}
.vis input{flex:1;background:#fff;border:1px solid var(--linie);border-radius:12px;padding:12px 15px;font-size:14px;color:var(--tinte);outline:none}
.vis .go{background:var(--tinte);color:#fff;border-radius:999px;padding:12px 22px;font-size:13px;white-space:nowrap;flex-shrink:0}
.vis .go:hover{background:var(--rouge)}
.vis .go:disabled{opacity:.5;cursor:default}
.vis .out{margin-top:14px;border-radius:12px;overflow:hidden;background:#fff;border:1px solid var(--linie)}
.vis .out img{width:100%;display:block}
.cta-zeile{display:flex;gap:12px;margin-top:30px}
.cta{flex:1;background:var(--tinte);color:#fff;padding:16px;border-radius:999px;font-size:16px}
.cta:hover{background:var(--rouge)}

.capstrip .lbl{font-size:12px;color:var(--hell);margin-bottom:10px;letter-spacing:.02em}
.capstrip .thumbs{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
.capthumb{flex-shrink:0;width:60px;height:60px;border-radius:12px;overflow:hidden;cursor:pointer;border:1px solid var(--linie);background:#FAFAF9;display:flex;align-items:center;justify-content:center}
.capthumb.an{border:1.5px solid var(--tinte)}
.capthumb img{width:100%;height:100%;object-fit:contain;padding:6px}
.capsolo{margin-top:12px;width:100%;height:140px;background:#FAFAF9;border-radius:var(--r);display:flex;align-items:center;justify-content:center;overflow:hidden}
.capsolo img{max-height:100%;max-width:100%;object-fit:contain;padding:16px}

.modal-bg{position:fixed;inset:0;background:rgba(23,24,26,.35);z-index:100}
.modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;z-index:101;box-shadow:0 24px 60px rgba(23,24,26,.18)}
.mfield{width:100%;background:#FAFAF9;border:0;border-radius:12px;padding:12px 16px;font-size:14px;color:var(--tinte);outline:none}
.mfield::placeholder{color:var(--hell)}
.mlbl{font-size:11px;color:var(--hell);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}

.leer{text-align:center;padding:80px 20px;color:var(--grau)}
.leer .gr{font-family:'Instrument Serif',serif;font-style:italic;font-size:22px;color:var(--tinte);margin-bottom:8px}

@media(max-width:900px){.raster{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}}
@media(max-width:560px){.kopf{padding-left:18px;padding-right:18px}.results{padding-left:18px;padding-right:18px}.panel-in{padding:24px 22px 44px}.specs{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.ulba *{transition:none!important}}
`;

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="chip">{children}</span>;
}

function CapSlider({ caps }: { caps: string[] }) {
  const [active, setActive] = useState(0);
  if (!caps.length) return null;
  return (
    <div className="capstrip" style={{ marginBottom: 24 }}>
      <div className="lbl">Passende Verschlüsse · {caps.length}</div>
      <div className="thumbs">
        {caps.map((url, i) => (
          <div key={i} className={`capthumb${active === i ? ' an' : ''}`} onClick={() => setActive(i)}>
            <img src={url} alt={`Verschluss ${i + 1}`} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
          </div>
        ))}
      </div>
      <div className="capsolo"><img src={caps[active]} alt="Verschluss" /></div>
    </div>
  );
}

function RenderSection({ product, defaultQuery }: { product: Result; defaultQuery: string }) {
  const [query, setQuery]   = useState(defaultQuery);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const run = async () => {
    if (!query.trim()) return;
    setStatus('loading'); setImgUrl(null);
    try {
      const res = await fetch(RENDER_API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemId: product.id, query, tier: 'lite' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'render failed');
      setImgUrl(data.renderingUrl || null);
      setCached(!!data.cached);
      setStatus('done');
    } catch { setStatus('error'); }
  };

  return (
    <div className="vis">
      <div className="top">Deine Richtung</div>
      <div className="row">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="z. B. warmes Beige, matt, dezent" />
        <button className="go" onClick={run} disabled={status === 'loading' || !query.trim()}>
          {status === 'loading' ? 'Generiert …' : 'Generieren'}
        </button>
      </div>
      {status === 'error' && <div style={{ fontSize: 13, color: '#dc2626', marginTop: 10 }}>Konnte nicht generieren — bitte erneut versuchen.</div>}
      {imgUrl && (
        <div className="out">
          <img src={imgUrl} alt="Rendering" />
          {cached && <div style={{ fontSize: 11, color: 'var(--hell)', padding: '8px 12px' }}>Aus Cache</div>}
        </div>
      )}
    </div>
  );
}

function SampleModal({ product, onClose }: { product: Result; onClose: () => void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [firm, setFirm] = useState(''); const [brief, setBrief] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const submit = async () => {
    if (!email.trim()) return; setStatus('sending');
    try {
      const res = await fetch('/api/sample-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, productName: product.name, supplier: product.supplier || '', brandName: firm || name, brandEmail: email, brief }) });
      if (!res.ok) throw new Error(); setStatus('done');
    } catch { setStatus('error'); }
  };
  return (
    <>
      <div className="modal-bg" onClick={onClose} style={{ zIndex: 100 }} />
      <div className="modal" style={{ width: 480, maxWidth: 'calc(100vw - 48px)', borderRadius: 24, padding: '40px 40px 36px', zIndex: 101 }}>
        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div className="serif" style={{ fontSize: 32, color: 'var(--rouge)', marginBottom: 14 }}>✓</div>
            <div className="serif" style={{ fontSize: 24, color: 'var(--tinte)', marginBottom: 10 }}>Anfrage raus.</div>
            <div style={{ fontSize: 14, color: 'var(--grau)', marginBottom: 30, lineHeight: 1.6 }}>Der Lieferant meldet sich direkt bei dir{product.supplier ? ` (${product.supplier})` : ''} — mit Mustern und Preisen.</div>
            <button onClick={onClose} style={{ background: 'var(--tinte)', color: '#fff', borderRadius: 999, padding: '14px 36px', fontSize: 15 }}>Schließen</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 }}>
              <div><div className="serif" style={{ fontSize: 22, color: 'var(--tinte)', marginBottom: 3 }}>Muster anfragen</div><div style={{ fontSize: 13, color: 'var(--hell)' }}>{product.name}{product.supplier ? ` · ${product.supplier}` : ''}</div></div>
              <button className="pclose" onClick={onClose} style={{ width: 36, height: 36, fontSize: 13 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><div className="mlbl">Name</div><input className="mfield" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" /></div>
                <div><div className="mlbl">Marke</div><input className="mfield" type="text" value={firm} onChange={e => setFirm(e.target.value)} placeholder="Markenname" /></div>
              </div>
              <div><div className="mlbl">E-Mail *</div><input className="mfield" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="du@marke.com" /></div>
              <div><div className="mlbl">Briefing (optional)</div><textarea className="mfield" value={brief} onChange={e => setBrief(e.target.value)} placeholder="Volumen, Menge, Finish, Zeitrahmen …" rows={3} style={{ resize: 'none', lineHeight: 1.5 }} /></div>
            </div>
            {status === 'error' && <div style={{ fontSize: 13, color: '#dc2626', marginTop: 10 }}>Etwas ging schief — bitte erneut versuchen.</div>}
            <button onClick={submit} disabled={!email.trim() || status === 'sending'} style={{ width: '100%', marginTop: 20, padding: 16, background: email.trim() ? 'var(--tinte)' : 'var(--linie)', color: email.trim() ? '#fff' : 'var(--hell)', borderRadius: 999, fontSize: 15 }}>{status === 'sending' ? 'Senden …' : 'Anfrage senden →'}</button>
            <div style={{ fontSize: 12, color: 'var(--hell)', textAlign: 'center', marginTop: 14 }}>Nur Muster, keine Bestellung.</div>
          </>
        )}
      </div>
    </>
  );
}

function SaveToProjectModal({ product, projects, favorites, onSave, onClose }: { product: Result; projects: Project[]; favorites: FavoriteEntry[]; onSave: (projectId: string) => void; onClose: () => void; }) {
  const [newName, setNewName] = useState(''); const [creating, setCreating] = useState(false);
  const savedProjectIds = favorites.filter(f => f.productId === product.id).map(f => f.projectId);
  return (
    <>
      <div className="modal-bg" onClick={onClose} style={{ zIndex: 200 }} />
      <div className="modal" style={{ width: 360, maxWidth: 'calc(100vw - 48px)', borderRadius: 22, padding: '30px 30px 26px', zIndex: 201 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="serif" style={{ fontSize: 19, color: 'var(--tinte)' }}>Aufs Board</div>
          <button className="pclose" onClick={onClose} style={{ width: 32, height: 32, fontSize: 12 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {projects.map(p => { const isSaved = savedProjectIds.includes(p.id); return (
            <button key={p.id} onClick={() => onSave(p.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: isSaved ? '#fff0f4' : '#FAFAF9', border: isSaved ? '1px solid #f0d0da' : '1px solid transparent', borderRadius: 12, fontSize: 14, color: 'var(--tinte)', textAlign: 'left' }}>
              <span>{p.name}</span>{isSaved && <span style={{ color: 'var(--rouge)' }}>♥</span>}
            </button>
          ); })}
        </div>
        {creating ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input autoFocus className="mfield" type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onSave('__new__:' + newName.trim()); setCreating(false); setNewName(''); } if (e.key === 'Escape') setCreating(false); }} placeholder="Board-Name …" />
            <button onClick={() => { if (newName.trim()) { onSave('__new__:' + newName.trim()); setCreating(false); setNewName(''); } }} style={{ background: 'var(--tinte)', color: '#fff', borderRadius: 12, padding: '10px 16px', fontSize: 13 }}>Anlegen</button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} style={{ width: '100%', padding: 11, color: 'var(--grau)', border: '1px dashed var(--linie)', borderRadius: 12, fontSize: 13 }}>+ Neues Board</button>
        )}
      </div>
    </>
  );
}

function ProductTile({ r, i, onOpen, onFav, isFav }: { r: Result; i: number; onOpen: () => void; onFav: (e: React.MouseEvent) => void; isFav: boolean }) {
  const h = sizeToHeight(r.availableSizes);
  return (
    <div className="stellplatz" onClick={onOpen} title={`${r.name}${r.availableSizes?.[0] ? ' · ' + r.availableSizes[0] : ''}`}>
      <span className="score">{r.score}</span>
      <button className="fav" onClick={onFav} style={{ color: isFav ? 'var(--rouge)' : 'var(--grau)' }}>{isFav ? '♥' : '♡'}</button>
      <div className="obj-wrap" style={{ height: h, width: Math.round(h * 0.6) }}>
        {r.imageUrl
          ? <img src={r.imageUrl} alt={r.name} style={{ maxHeight: h, maxWidth: '100%' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} />
          : <span className="obj-ph" style={{ height: h, fontSize: 40 }}>◇</span>}
      </div>
      <span className="nm">{r.name}</span>
    </div>
  );
}

function FavoritesView({ projects, favorites, onRemove, onRenameProject, onDeleteProject, onProductClick }: { projects: Project[]; favorites: FavoriteEntry[]; onRemove: (productId: string, projectId: string) => void; onRenameProject: (id: string, name: string) => void; onDeleteProject: (id: string) => void; onProductClick: (product: Result) => void; }) {
  const [editingId, setEditingId] = useState<string | null>(null); const [editName, setEditName] = useState(''); const [activeProject, setActiveProject] = useState<string>('all');
  const filtered = activeProject === 'all' ? favorites : favorites.filter(f => f.projectId === activeProject);
  const uniqueProducts = filtered.filter((f, i, arr) => arr.findIndex(x => x.productId === f.productId) === i);
  const allCount = favorites.filter((f, i, arr) => arr.findIndex(x => x.productId === f.productId) === i).length;
  return (
    <div className="results" style={{ paddingBottom: 60 }}>
      <div className="ffzeile" style={{ marginTop: 24 }}>
        <button className={`ff${activeProject === 'all' ? ' an' : ''}`} onClick={() => setActiveProject('all')}>Alle ({allCount})</button>
        {projects.map(p => { const count = favorites.filter(f => f.projectId === p.id).length; return (
          editingId === p.id
            ? <input key={p.id} autoFocus className="mfield" style={{ width: 150 }} value={editName} onChange={e => setEditName(e.target.value)} onBlur={() => { if (editName.trim()) onRenameProject(p.id, editName.trim()); setEditingId(null); }} onKeyDown={e => { if (e.key === 'Enter') { if (editName.trim()) onRenameProject(p.id, editName.trim()); setEditingId(null); } }} />
            : <button key={p.id} className={`ff${activeProject === p.id ? ' an' : ''}`} onClick={() => setActiveProject(p.id)} onDoubleClick={() => { setEditingId(p.id); setEditName(p.name); }}>{p.name} ({count})</button>
        ); })}
      </div>
      {activeProject !== 'all' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <button onClick={() => { const p = projects.find(x => x.id === activeProject); if (p) { setEditingId(p.id); setEditName(p.name); } }} style={{ background: '#FAFAF9', borderRadius: 999, padding: '8px 16px', fontSize: 12, color: 'var(--grau)' }}>Umbenennen</button>
          <button onClick={() => { onDeleteProject(activeProject); setActiveProject('all'); }} style={{ background: '#fff0f0', borderRadius: 999, padding: '8px 16px', fontSize: 12, color: '#dc2626' }}>Board löschen</button>
        </div>
      )}
      {uniqueProducts.length === 0
        ? <div className="leer"><div className="gr">Noch leer.</div><div>Speicher im Detail ein Packmittel — dann siehst du deine Linie hier.</div></div>
        : <div className="raster">{uniqueProducts.map((f, i) => (
            <div key={f.productId + f.projectId} className="kachel" onClick={() => onProductClick(f.product)}>
              <span className="score">{f.product.score}</span>
              <button className="fav" onClick={e => { e.stopPropagation(); onRemove(f.productId, f.projectId); }} style={{ color: 'var(--rouge)' }}>♥</button>
              {f.product.imageUrl ? <img src={f.product.imageUrl} alt={f.product.name} /> : <span style={{ fontSize: 34, color: '#d8d8d6' }}>◇</span>}
              <span className="kn">{f.product.name}</span>
            </div>
          ))}</div>}
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted]             = useState(false);
  const [input, setInput]                 = useState('');
  const [results, setResults]             = useState<Result[] | null>(null);
  const [parsedFilters, setParsedFilters] = useState<ParsedFilters>({ sizes: [], materials: [], types: [], closures: [] });
  const [categoryMatch, setCategoryMatch] = useState<string>('');
  const [status, setStatus]               = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [selected, setSelected]           = useState<Result | null>(null);
  const [currentQuery, setCurrentQuery]   = useState('');
  const [showResults, setShowResults]     = useState(false);
  const [sampleProduct, setSampleProduct] = useState<Result | null>(null);
  const [view, setView]                   = useState<'search' | 'saved'>('search');
  const [projects, setProjects]           = useState<Project[]>([]);
  const [favorites, setFavorites]         = useState<FavoriteEntry[]>([]);
  const [saveModal, setSaveModal]         = useState<Result | null>(null);
  const [copied, setCopied]               = useState(false);
  const [formFilter, setFormFilter]       = useState<string | null>(null);
  const [restLimit, setRestLimit]         = useState(24);

  useEffect(() => { setMounted(true); setProjects(loadProjects()); setFavorites(loadFavorites()); }, []);

  useEffect(() => {
    if (!mounted) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (sampleProduct) { setSampleProduct(null); return; } if (saveModal) { setSaveModal(null); return; } setSelected(null); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [mounted, sampleProduct, saveModal]);

  useEffect(() => {
    if (!mounted) return;
    if (selected) { const u = new URL(window.location.href); u.searchParams.set('product', selected.id); window.history.replaceState(null, '', u.toString()); }
    else { const u = new URL(window.location.href); u.searchParams.delete('product'); window.history.replaceState(null, '', u.toString()); }
  }, [mounted, selected]);

  const isFavorited = (id: string) => favorites.some(f => f.productId === id);

  const handleSave = (product: Result, projectIdOrNew: string) => {
    let pid = projectIdOrNew; let updP = projects;
    if (projectIdOrNew.startsWith('__new__:')) {
      const name = projectIdOrNew.replace('__new__:', '');
      const np: Project = { id: Date.now().toString(), name, createdAt: Date.now() };
      updP = [...projects, np]; setProjects(updP); saveProjects(updP); pid = np.id;
    }
    const saved = favorites.some(f => f.productId === product.id && f.projectId === pid);
    const upd = saved ? favorites.filter(f => !(f.productId === product.id && f.projectId === pid)) : [...favorites, { productId: product.id, projectId: pid, savedAt: Date.now(), product }];
    setFavorites(upd); saveFavorites(upd); setSaveModal(null);
  };
  const quickFav = (product: Result) => {
    const pid = 'default';
    const saved = favorites.some(f => f.productId === product.id);
    const upd = saved ? favorites.filter(f => f.productId !== product.id) : [...favorites, { productId: product.id, projectId: pid, savedAt: Date.now(), product }];
    setFavorites(upd); saveFavorites(upd);
  };
  const removeFavorite = (pid: string, prj: string) => { const u = favorites.filter(f => !(f.productId === pid && f.projectId === prj)); setFavorites(u); saveFavorites(u); };
  const renameProject  = (id: string, name: string) => { const u = projects.map(p => p.id === id ? { ...p, name } : p); setProjects(u); saveProjects(u); };
  const deleteProject  = (id: string) => {
    const updP = projects.filter(p => p.id !== id); const updF = favorites.filter(f => f.projectId !== id);
    if (!updP.length) { const d = [{ id: 'default', name: 'Meine Sammlung', createdAt: Date.now() }]; setProjects(d); saveProjects(d); } else { setProjects(updP); saveProjects(updP); }
    setFavorites(updF); saveFavorites(updF);
  };
  const copyLink = () => {
    if (!selected || !mounted) return;
    const u = new URL(window.location.href); u.searchParams.set('product', selected.id);
    navigator.clipboard.writeText(u.toString()); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const doSearch = useCallback(async (text: string, overrideFilters?: ParsedFilters) => {
    if (!text.trim()) return;
    setStatus('loading'); setCurrentQuery(text); setShowResults(true); setView('search'); setFormFilter(null); setRestLimit(24);
    try {
      const body: any = { query: text };
      if (overrideFilters !== undefined) body.active_filters = overrideFilters;
      const res = await fetch(SEARCH_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setParsedFilters(data.parsedFilters || { sizes: [], materials: [], types: [], closures: [] });
      setCategoryMatch(data.categoryMatch || '');
      setResults(data.results || []);
      setStatus('done');
      if (mounted) window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { setStatus('error'); }
  }, [mounted]);

  const search     = (t: string) => doSearch(t);
  const submit     = () => search(input);
  const useExample = (q: string) => { setInput(q); search(q); };
  const goHome = () => { setShowResults(false); setInput(''); setCurrentQuery(''); setResults(null); setParsedFilters({ sizes: [], materials: [], types: [], closures: [] }); setCategoryMatch(''); setSelected(null); setView('search'); if (mounted) window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const removeFilter = (key: keyof ParsedFilters, value: string) => {
    const next: ParsedFilters = { sizes: [...parsedFilters.sizes], materials: [...parsedFilters.materials], types: [...parsedFilters.types], closures: [...parsedFilters.closures] };
    next[key] = next[key].filter(v => v !== value);
    setParsedFilters(next);
    doSearch(currentQuery, next);
  };

  const favCount = favorites.filter((f, i, arr) => arr.findIndex(x => x.productId === f.productId) === i).length;

  const filterChips: { key: keyof ParsedFilters; value: string; label: string }[] = [];
  (Object.keys(FILTER_LABELS) as (keyof ParsedFilters)[]).forEach(key => {
    (parsedFilters[key] || []).forEach(value => filterChips.push({ key, value, label: `${FILTER_LABELS[key]}: ${value}` }));
  });

  const gelesenPalette = categoryMatch || (currentQuery ? EXAMPLES.find(e => e.q === currentQuery)?.label : '') || 'Deine Suche';

  // Regale (Top-Matches, bis zu 5 Reihen) + Raster (Rest)
  const PRO_REIHE = 7, MAX_REGALE = 5;
  const alle = results || [];
  const gefiltert = formFilter ? alle.filter(r => (r.form?.[0] || r.type || '').toLowerCase().includes(formFilter.toLowerCase())) : alle;
  const topN = PRO_REIHE * MAX_REGALE;
  const top = gefiltert.slice(0, Math.min(topN, gefiltert.length));
  const rest = gefiltert.slice(top.length);
  const regale: Result[][] = [];
  for (let i = 0; i < top.length; i += PRO_REIHE) regale.push(top.slice(i, i + PRO_REIHE));
  const formOptionen = Array.from(new Set(alle.map(r => r.form?.[0] || r.type).filter(Boolean))) as string[];

  if (!mounted) {
    return (
      <div className="ulba">
        <style>{STYLES}</style>
        <div className="kopf"><span className="marke">ulba</span></div>
        <div className="landing"><h1>Beschreib das <em>Gefühl</em>.<br />Wir stellen das Regal.</h1></div>
      </div>
    );
  }

  return (
    <div className="ulba">
      <style>{STYLES}</style>

      <div className="kopf">
        <span className="marke" onClick={goHome}>ulba</span>
        {(showResults || view === 'saved') && view === 'search' && (
          <div className="kopf-suche"><div className="kopf-feld"><input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Suchen …" /></div></div>
        )}
        {(showResults || view === 'saved') && view === 'saved' && <div className="kopf-suche" />}
        <button className="kopf-btn" onClick={() => setView(v => v === 'saved' ? 'search' : 'saved')}>
          Board {favCount > 0 && <span className="z">{favCount}</span>}
        </button>
      </div>

      {!showResults && view === 'search' && (
        <div className="landing">
          <h1>Beschreib das <em>Gefühl</em>.<br />Wir stellen das Regal.</h1>
          <div className="unter">Marken-Sprache oder harte Specs — beides trägt.</div>
          <div className="feld">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="z. B. ruhige, teure Hautpflege für Frauen 40+" autoFocus />
            <button onClick={submit}>Suchen</button>
          </div>
          <div className="chips-ein">
            {EXAMPLES.map((ex, i) => <button key={i} className="chip-ein" onClick={() => useExample(ex.q)}>{ex.label}</button>)}
          </div>
        </div>
      )}

      {view === 'saved' && <FavoritesView projects={projects} favorites={favorites} onRemove={removeFavorite} onRenameProject={renameProject} onDeleteProject={deleteProject} onProductClick={p => setSelected(p)} />}

      {showResults && view === 'search' && (
        <div className="results">
          <div className="chips-ein" style={{ justifyContent: 'flex-start', margin: '16px 0 4px', maxWidth: 'none' }}>
            {EXAMPLES.map((ex, i) => <button key={i} className={`chip-ein${currentQuery === ex.q ? ' an' : ''}`} onClick={() => useExample(ex.q)}>{ex.label}</button>)}
          </div>

          {status === 'loading' && <div className="status-z">Sucht …</div>}
          {status === 'error' && <div className="status-z" style={{ color: '#dc2626' }}>Fehler — bitte erneut versuchen.</div>}

          {results && status === 'done' && (
            <>
              <div className="gelesen">
                <span>Gelesen als</span><span className="pal">{gelesenPalette}</span>
                <span className="treffer">{gefiltert.length} Treffer</span>
              </div>
              {filterChips.length > 0 && (
                <div className="fzeile">
                  {filterChips.map((f, i) => <span key={i} className="fchip">{f.label}<span className="x" onClick={() => removeFilter(f.key, f.value)}>×</span></span>)}
                </div>
              )}

              {results.length === 0 && <div className="leer" style={{ paddingTop: 60 }}><div className="gr">Keine Treffer.</div><div>Versuch eine breitere Suche.</div></div>}

              {top.length > 0 && (
                <>
                  <div className="abschnitt"><span className="h">Fürs Gefühl kuratiert</span><span className="s">Top {top.length} · beste zuerst</span></div>
                  <div className="regale">
                    {regale.map((reihe, ri) => (
                      <div className="regal-reihe" key={ri}>
                        {reihe.map(r => <ProductTile key={r.id} r={r} i={ri} onOpen={() => setSelected(r)} onFav={e => { e.stopPropagation(); quickFav(r); }} isFav={isFavorited(r.id)} />)}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {rest.length > 0 && (
                <>
                  <div className="abschnitt"><span className="h">Weitere Treffer</span><span className="s">{rest.length} · nach Relevanz</span></div>
                  {formOptionen.length > 1 && (
                    <div className="ffzeile">
                      <button className={`ff${!formFilter ? ' an' : ''}`} onClick={() => { setFormFilter(null); setRestLimit(24); }}>Alle</button>
                      {formOptionen.map(f => <button key={f} className={`ff${formFilter === f ? ' an' : ''}`} onClick={() => { setFormFilter(f); setRestLimit(24); }}>{f}</button>)}
                    </div>
                  )}
                  <div className="raster">
                    {rest.slice(0, restLimit).map(r => (
                      <div key={r.id} className="kachel" onClick={() => setSelected(r)} title={r.name}>
                        <span className="score">{r.score}</span>
                        <button className="fav" onClick={e => { e.stopPropagation(); quickFav(r); }} style={{ color: isFavorited(r.id) ? 'var(--rouge)' : 'var(--grau)' }}>{isFavorited(r.id) ? '♥' : '♡'}</button>
                        {r.imageUrl ? <img src={r.imageUrl} alt={r.name} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} /> : <span style={{ fontSize: 34, color: '#d8d8d6' }}>◇</span>}
                        <span className="kn">{r.name}</span>
                      </div>
                    ))}
                  </div>
                  {rest.length > restLimit && <button className="mehr-btn" onClick={() => setRestLimit(l => l + 24)}>Weitere {Math.min(24, rest.length - restLimit)} laden</button>}
                </>
              )}
            </>
          )}
        </div>
      )}

      {selected && (
        <>
          <div className="panel-bg" onClick={() => setSelected(null)} />
          <div className="panel">
            <div className="panel-in">
              <div className="panel-top">
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className={`ptool${isFavorited(selected.id) ? ' an' : ''}`} onClick={() => setSaveModal(selected)}>
                    <span>{isFavorited(selected.id) ? '♥' : '♡'}</span><span>{isFavorited(selected.id) ? 'Gespeichert' : 'Speichern'}</span>
                  </button>
                  <button className={`ptool${copied ? ' ok' : ''}`} onClick={copyLink}>
                    <span style={{ fontSize: 13 }}>{copied ? '✓' : '↗'}</span><span>{copied ? 'Kopiert' : 'Teilen'}</span>
                  </button>
                </div>
                <button className="pclose" onClick={() => setSelected(null)}>✕</button>
              </div>

              {selected.capImages && selected.capImages.length > 0 && <CapSlider caps={selected.capImages} />}

              <div className="pbild">
                {selected.imageUrl ? <img src={selected.imageUrl} alt={selected.name} /> : <span style={{ fontSize: 80, color: '#e2e2e0' }}>◇</span>}
              </div>

              <div className="ptitel">{selected.name}</div>
              <div className="psub">{selected.supplier || ''}</div>

              {selected.reasoning && <p className="pgrund">{selected.reasoning}</p>}

              <RenderSection product={selected} defaultQuery={currentQuery} />

              <div style={{ marginBottom: 8 }}>
                <div className="pblock-lbl">Technische Daten</div>
                <div className="specs">
                  {selected.type && <div className="spec"><div className="k">Typ</div><div className="v">{TYPE_LABELS[selected.type] || selected.type}</div></div>}
                  {selected.supplier && <div className="spec"><div className="k">Lieferant</div><div className="v">{selected.supplier}</div></div>}
                  {selected.material?.length ? <div className="spec"><div className="k">Material</div><div className="v">{selected.material.join(', ')}</div></div> : null}
                  {selected.availableSizes?.length ? <div className="spec"><div className="k">Volumen</div><div className="v">{selected.availableSizes.join(', ')}</div></div> : null}
                  {selected.closure && <div className="spec"><div className="k">Verschluss</div><div className="v">{selected.closure}</div></div>}
                  {selected.capCount > 0 && <div className="spec"><div className="k">Kompatible Verschlüsse</div><div className="v">{selected.capCount}</div></div>}
                </div>
                {selected.capabilities?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>{selected.capabilities.map((c, i) => <Chip key={i}>{c}</Chip>)}</div>
                )}
              </div>

              <div className="cta-zeile">
                <button className="cta" onClick={() => setSampleProduct(selected)}>Muster anfragen →</button>
              </div>
            </div>
          </div>
        </>
      )}

      {sampleProduct && <SampleModal product={sampleProduct} onClose={() => setSampleProduct(null)} />}
      {saveModal && <SaveToProjectModal product={saveModal} projects={projects} favorites={favorites} onSave={pid => handleSave(saveModal, pid)} onClose={() => setSaveModal(null)} />}
    </div>
  );
}
