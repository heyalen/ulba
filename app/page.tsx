'use client';

/* ══════════════════════════════════════════════════════════════════════
   ulba · page.tsx — Stufe 1 (Variante A)
   Thread-Verlaufsmodell: jeder Suchlauf ist ein Block im Verlauf.
   Verdrahtet gegen die bestehenden Endpoints /api/search und /api/render.
   Favoriten/Projekte laufen wie bisher über localStorage (unverändert).

   Änderungen 29.07 (v2):
   · Farbwelt auf reines Weiß + kühles Hellgrau umgestellt (ChatGPT-Stil):
     --porzellan #FFFFFF · --nische #F7F7F8 · --linie #ECECEE · --linie2 #F4F4F5
   · Render-Panel rechts von 530px auf 640px verbreitert

   ►►► ZU VERIFIZIEREN gegen die echte /api/search-Antwort ◄◄◄
   Suche unten nach ANNAHME: — dort sind die Feldnamen dokumentiert,
   die dein Backend liefern muss. Wenn ein Feld anders heisst, nur dort ändern.
   ══════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from 'react';

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

const FILTER_LABELS: Record<keyof ParsedFilters, string> = {
  materials: 'Material', types: 'Typ', closures: 'Verschluss', sizes: 'Größe',
};

/* Facetten zum manuellen Eingrenzen. Nur Dimensionen anbieten,
   die nicht schon in parsedFilters gesetzt sind. Die Werte werden bei
   Auswahl in active_filters.<dim> geschoben und lösen eine neue Suche aus. */
const FACETTEN: { dim: keyof ParsedFilters; label: string; opt: string[] }[] = [
  { dim: 'materials', label: 'Material', opt: ['Glass', 'PP', 'PETG', 'Acrylic', 'Aluminium'] },
  { dim: 'sizes', label: 'Volumen', opt: ['15ml', '30ml', '50ml', '75ml', '100ml'] },
  { dim: 'closures', label: 'Verschluss', opt: ['ScrewCap', 'Pump', 'Dropper', 'Spray', 'FlipTop'] },
];

// ►►► ANNAHME: /api/search liefert results: Result[] mit diesen Feldern.
// (1:1 aus deinem bestehenden Interface übernommen — nichts geraten.)
interface Result {
  id: string; name: string; score: number; reasoning: string;
  type: string; material: string[]; form: string[]; closure: string;
  description?: string; imageUrl: string | null;
  capabilities: string[]; availableSizes: string[]; availableMaterials: string[];
  capCount: number; capImages?: string[];
  supplier?: string;
}

// ►►► ANNAHME: /api/search liefert parsedFilters mit genau diesen vier Keys.
type ParsedFilters = { sizes: string[]; materials: string[]; types: string[]; closures: string[] };

/* Ein Verlaufs-Block = ein Suchlauf. Der Thread ist Block[].
   So wird jede Verfeinerung als eigener Block DARUNTER sichtbar. */
interface Block {
  id: number;
  intro: string;          // was diesen Block ausgelöst hat ("wärmer", "Material: Glass", Startquery)
  query: string;          // die Query, mit der gesucht wurde
  filters: ParsedFilters; // Filterstand dieses Blocks (Snapshot)
  results: Result[];
  categoryMatch: string;
  alleZeigen: boolean;    // "alle weiteren anzeigen" pro Block
  status: 'loading' | 'done' | 'error';
}

interface Project { id: string; name: string; createdAt: number; }
interface FavoriteEntry { productId: string; projectId: string; savedAt: number; product: Result; }

const LS_PROJECTS = 'ulba_projects';
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

/* ── Design-System: „Porzellan & Pigment" — v2: reines Weiß ── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
:root{
--porzellan:#FFFFFF;--panel:#FFFFFF;--nische:#F7F7F8;
--tinte:#14181A;--grau:#5F6A6C;--hell:#98A2A3;
--rouge:#4C1420;--linie:#ECECEE;--linie2:#F4F4F5;--r:14px;
--serif:'Instrument Serif',Georgia,serif;
--sans:'Instrument Sans',system-ui,sans-serif;
--mono:'IBM Plex Mono',ui-monospace,monospace;
}
.ulba{background:var(--porzellan);color:var(--tinte);height:100dvh;font-family:var(--sans);font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased;display:grid;grid-template-columns:248px 1fr;overflow:hidden}
.ulba *{box-sizing:border-box}
.ulba button{font:inherit;color:inherit;background:none;border:none;cursor:pointer}
.ulba input,.ulba textarea{font:inherit}
.ulba :focus-visible{outline:1.5px solid var(--tinte);outline-offset:2px}
.serif{font-family:var(--serif)} .kursiv{font-family:var(--serif);font-style:italic}
.mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
/* Nav */
.nav{border-right:1px solid var(--linie);padding:16px 12px;display:flex;flex-direction:column;gap:3px;overflow-y:auto}
.nav-marke{font-family:var(--serif);font-size:26px;text-align:left;padding:4px 8px 12px}
.nav-neu{text-align:left;border:1px solid var(--linie);border-radius:11px;padding:11px 14px;font-size:14px;background:var(--panel);margin-bottom:10px}
.nav-neu:hover{border-color:var(--tinte)}
.nav-item{display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:9px;text-align:left;color:var(--grau);font-size:14px}
.nav-item:hover{background:var(--nische)}
.nav-item.an{background:var(--nische);color:var(--tinte)}
.ni-ic{width:18px;text-align:center;color:var(--hell)} .nav-item.an .ni-ic{color:var(--rouge)}
.ni-t{flex:1}
.ni-b{font-family:var(--mono);font-size:11px;background:var(--rouge);color:#fff;border-radius:999px;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px}
.nav-lbl{font-family:var(--mono);font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--hell);padding:12px 11px 6px}
.nav-chats{display:flex;flex-direction:column;gap:1px;flex:1;overflow-y:auto}
.nav-chat{text-align:left;padding:9px 11px;border-radius:9px;display:flex;flex-direction:column;gap:2px}
.nav-chat:hover{background:var(--nische)} .nav-chat.an{background:var(--nische)}
.nc-t{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nc-s{font-family:var(--mono);font-size:10px;color:var(--hell)}
.nav-leer{font-size:12.5px;color:var(--hell);padding:8px 11px}
.nav-profil{display:flex;align-items:center;gap:10px;padding:12px 8px 4px;margin-top:8px;border-top:1px solid var(--linie)}
.np-av{width:30px;height:30px;border-radius:50%;background:var(--rouge);color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center}
.np-n{display:block;font-size:13.5px} .np-s{display:block;font-family:var(--mono);font-size:10.5px;color:var(--hell)}
/* Main */
.main{display:flex;flex-direction:column;min-width:0;overflow:hidden}
.topbar{flex:none;border-bottom:1px solid var(--linie);display:flex;align-items:center;gap:14px;padding:14px 32px}
.topbar .spur{font-family:var(--mono);font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--hell)}
.content{flex:1;overflow-y:auto;min-height:0}
.content-chat{overflow:hidden;display:flex}
/* Start */
.start{height:100%;display:flex;align-items:center;justify-content:center;padding:20px 0 80px}
.st-mitte{width:100%;max-width:640px;text-align:center;padding:0 24px}
.st-logo{font-family:var(--serif);font-size:26px;color:var(--rouge);margin-bottom:18px;opacity:.7}
.st-mitte h1{font-family:var(--serif);font-size:clamp(34px,5vw,54px);line-height:1.05;letter-spacing:-.02em;margin-bottom:30px}
.st-mitte h1 em{font-style:italic;color:var(--rouge)}
.feld{position:relative;display:flex;align-items:center;max-width:600px;margin:0 auto;border:1px solid var(--linie);border-radius:16px;background:var(--panel);padding:6px 6px 6px 20px;box-shadow:0 10px 40px -22px rgba(20,24,26,.4)}
.feld:focus-within{border-color:var(--tinte)}
.feld input{flex:1;border:0;background:none;padding:14px 4px;color:var(--tinte);min-width:0;outline:none}
.feld input::placeholder{color:var(--hell)}
.feld .go{flex:none;width:42px;height:42px;border-radius:11px;background:var(--tinte);color:#fff;font-size:18px;display:flex;align-items:center;justify-content:center}
.feld .go:hover{background:var(--rouge)}
.st-trend{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin:22px auto 0;max-width:580px}
.tr-pill{padding:8px 15px;border-radius:999px;font-size:13px;color:var(--grau);border:1px solid var(--linie);background:var(--panel)}
.tr-pill:hover{border-color:var(--tinte);color:var(--tinte)}
.st-note{color:var(--hell);font-size:13.5px;max-width:44ch;margin:32px auto 0;line-height:1.5}
/* Chat / Split */
.chat{display:grid;grid-template-columns:1fr;height:100%;width:100%;min-height:0;overflow:hidden}
.chat.split{grid-template-columns:minmax(420px,1fr) 720px}
.cs-main{display:flex;flex-direction:column;min-width:0;height:100%;min-height:0}
.thread{flex:1;overflow-y:auto;min-height:0;padding:26px clamp(16px,4vw,54px) 20px}
.refine{flex:none;border-top:1px solid var(--linie);padding:14px clamp(16px,4vw,54px)}
.refine .feld{max-width:none;border-radius:13px;padding:4px 4px 4px 18px;box-shadow:none}
.refine .feld input{padding:11px 4px;font-size:14px}
.msg-user{display:flex;justify-content:flex-end;margin:16px 0}
.msg-user span{background:var(--tinte);color:#fff;padding:11px 17px;border-radius:16px 16px 4px 16px;font-size:14.5px;max-width:78%}
.msg-ulba{margin:8px 0 26px}
.eb-alt{opacity:.6}
.eb-intro{font-family:var(--serif);font-style:italic;font-size:19px;line-height:1.4;margin-bottom:14px;max-width:60ch}
.eb-filter{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:12px}
.ebf-lbl{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--hell);margin-right:4px}
.ebf-pill{display:inline-flex;align-items:center;gap:7px;background:var(--tinte);color:#fff;padding:6px 8px 6px 13px;border-radius:999px;font-size:13px}
.ebf-x{color:rgba(255,255,255,.6);font-size:15px;line-height:1;cursor:pointer}
.ebf-x:hover{color:#fff}
.eb-kopf{display:flex;align-items:baseline;gap:10px;margin:2px 0 12px}
.ebk-h{font-family:var(--serif);font-size:20px}
.ebk-s{font-family:var(--mono);font-size:11px;color:var(--hell)}
.eb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.eb-grid.schmal{grid-template-columns:repeat(4,minmax(0,1fr))}
.ek{position:relative;border:1px solid var(--linie);border-radius:12px;background:var(--panel);overflow:hidden;transition:border-color .15s,transform .15s}
.ek:hover{border-color:var(--hell);transform:translateY(-2px)}
.ek.an{border-color:var(--tinte);box-shadow:inset 0 0 0 1px var(--tinte)}
.ek-klick{display:block;width:100%;text-align:left}
.ek-bild{background:#FFFFFF;display:flex;align-items:center;justify-content:center;height:150px;overflow:hidden}
.ek-bild img{max-width:78%;max-height:80%;object-fit:contain}
.ek-ph{font-size:38px;color:#d8d8d6}
.ek-info{padding:11px 13px}
.ek-nm{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ek-spec{display:block;font-family:var(--mono);font-size:11px;color:var(--hell);margin-top:3px}
.ek-match{position:absolute;top:10px;right:10px;display:flex;flex-direction:column;align-items:center;background:var(--porzellan);border:1px solid var(--linie);border-radius:9px;padding:4px 8px}
.em-z{font-family:var(--mono);font-size:15px;color:var(--rouge);line-height:1}
.em-l{font-family:var(--mono);font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:var(--hell);margin-top:1px}
.favherz{position:absolute;top:9px;left:10px;z-index:3;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.9);border:1px solid var(--linie);font-size:13px;color:var(--hell);display:flex;align-items:center;justify-content:center}
.favherz:hover,.favherz.an{color:var(--rouge)}
.eb-mehr{display:block;margin:16px auto;border:1px solid var(--linie);border-radius:999px;padding:11px 26px;font-size:13.5px;color:var(--grau);background:var(--panel)}
.eb-mehr:hover{border-color:var(--tinte);color:var(--tinte)}
.eb-facetten{display:flex;flex-direction:column;gap:10px;margin-top:22px;padding-top:20px;border-top:1px solid var(--linie2)}
.facet{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.fc-lbl{font-family:var(--mono);font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--grau);width:92px;flex:none}
.fc-opt{padding:7px 14px;border-radius:999px;font-size:13px;color:var(--grau);border:1px solid var(--linie);background:var(--panel)}
.fc-opt:hover{border-color:var(--tinte);color:var(--tinte)}
.eb-scan{border:1px solid var(--linie);border-radius:13px;background:var(--panel);padding:15px 18px;max-width:560px;margin-bottom:8px}
.sc-kopf{display:flex;justify-content:space-between;gap:12px;margin-bottom:9px}
.sc-lbl{font-size:13.5px} .sc-liefer{font-family:var(--mono);font-size:11px;color:var(--rouge)}
.sc-zeile{font-family:var(--mono);font-size:12px;color:var(--grau)}
/* Render-Panel (rechts, fest 640) */
.panel{border-left:1px solid var(--linie);background:var(--panel);display:flex;flex-direction:column;height:100%;min-height:0;overflow-y:auto}
.pn-kopf{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 24px 12px}
.pn-kopf h3{font-family:var(--serif);font-size:24px}
.pn-spec{font-family:var(--mono);font-size:11.5px;color:var(--grau)}
.pn-akt{display:flex;gap:10px}
.pn-zu{font-size:22px;color:var(--hell)} .pn-zu:hover{color:var(--rouge)}
.pn-bild{margin:0 24px;height:min(54vh,560px);min-height:360px;border:1px solid var(--linie);border-radius:var(--r);background:#FFFFFF;display:flex;align-items:center;justify-content:center;overflow:hidden}
.pn-bild > img{max-width:92%;max-height:90%;object-fit:contain}
.pn-body{padding:16px 24px 0}
.pgrund{font-family:var(--serif);font-style:italic;font-size:17px;line-height:1.45;color:var(--grau);margin:16px 0;padding-left:15px;border-left:1px solid var(--rouge)}
.vis{background:var(--nische);border-radius:var(--r);padding:16px 18px;margin:18px 0}
.vis .top{font-family:var(--mono);font-size:11px;color:var(--hell);letter-spacing:.04em;text-transform:uppercase;margin-bottom:10px}
.vis .row{display:flex;gap:8px}
.vis input{flex:1;background:var(--panel);border:1px solid var(--linie);border-radius:11px;padding:11px 13px;font-size:14px;outline:none}
.vis .gen{background:var(--tinte);color:#fff;border-radius:999px;padding:11px 20px;font-size:13px;white-space:nowrap}
.vis .gen:hover{background:var(--rouge)} .vis .gen:disabled{opacity:.5;cursor:default}
.vis .out{margin-top:12px;border-radius:11px;overflow:hidden;border:1px solid var(--linie);background:var(--panel)}
.vis .out img{width:100%;display:block}
.specs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}
.spec{background:var(--nische);border-radius:11px;padding:12px 15px}
.spec .k{font-size:11px;color:var(--hell);margin-bottom:3px}
.spec .v{font-size:14px;font-weight:500}
.chip{background:var(--nische);color:var(--grau);border-radius:999px;padding:5px 11px;font-size:12px;display:inline-block}
.pn-caps-top{padding:4px 24px 14px}
.pn-caps-top .lbl{font-family:var(--mono);font-size:11px;color:var(--hell);letter-spacing:.04em;text-transform:uppercase;margin-bottom:10px}
.pn-caps-top .thumbs{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px}
.pn-cap-gross{margin:0 24px 14px;padding:0}
.pn-cap-gross .lbl{font-family:var(--mono);font-size:10.5px;color:var(--hell);letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px}
.pn-cap-gross .buehne{height:150px;background:#FFFFFF;border:1px solid var(--linie);border-radius:var(--r);display:flex;align-items:center;justify-content:center;overflow:hidden}
.pn-cap-gross .buehne img{max-width:58%;max-height:84%;object-fit:contain}
.pn-cap-gross .ph{font-size:34px;color:#d8d8d6}
.capstrip{margin:16px 0}
.capstrip .lbl{font-family:var(--mono);font-size:11px;color:var(--hell);letter-spacing:.04em;text-transform:uppercase;margin-bottom:9px}
.capstrip .thumbs{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
.capthumb{flex:none;width:82px;height:82px;border-radius:12px;border:1px solid var(--linie);background:#FFFFFF;display:flex;align-items:center;justify-content:center;overflow:hidden}
.capthumb.an{border-color:var(--tinte);box-shadow:inset 0 0 0 1px var(--tinte)}
.capthumb img{max-width:100%;max-height:100%;object-fit:contain;padding:9px}
.pn-aktion{position:sticky;bottom:0;display:flex;gap:9px;padding:16px 24px;background:linear-gradient(to top,var(--panel) 72%,transparent);margin-top:auto}
.pn-aktion .cta{flex:1;background:var(--tinte);color:#fff;padding:14px;border-radius:999px;font-size:15px}
.pn-aktion .cta:hover{background:var(--rouge)}
.pn-aktion .cta-sek{border:1px solid var(--linie);border-radius:999px;padding:14px 18px;font-size:14px;color:var(--grau);background:var(--panel)}
.pn-aktion .cta-sek.an{border-color:var(--rouge);color:var(--rouge)}
/* Bereiche */
.bereich{padding:32px clamp(16px,4vw,54px) 60px}
.ber-kopf{margin-bottom:24px}
.ber-kopf h2{font-family:var(--serif);font-size:32px;letter-spacing:-.015em;margin-bottom:8px}
.ber-kopf p{color:var(--grau);max-width:52ch}
.leer{color:var(--hell);font-size:14px;padding:44px;text-align:center;border:1px dashed var(--linie);border-radius:var(--r)}
.leer .gr{font-family:var(--serif);font-style:italic;font-size:20px;color:var(--tinte);margin-bottom:6px}
.lin-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.lin-karte{text-align:left;border:1px solid var(--linie);border-radius:var(--r);background:var(--panel);overflow:hidden}
.lin-karte:hover{border-color:var(--hell)}
.lk-reihe{display:flex;gap:12px;justify-content:center;background:var(--nische);padding:20px;min-height:110px;align-items:center}
.lk-reihe img{max-height:80px;object-fit:contain}
.lk-info{padding:14px 16px}
.lk-t{display:block;font-family:var(--serif);font-size:18px}
.lk-s{display:block;font-family:var(--mono);font-size:11px;color:var(--hell);margin-top:3px}
.anf-liste{display:flex;flex-direction:column;gap:12px}
.anf-karte{display:grid;grid-template-columns:1fr auto;gap:16px;border:1px solid var(--linie);border-radius:var(--r);background:var(--panel);padding:16px 20px}
.ak-t{font-family:var(--serif);font-size:18px}
.ak-meta{font-family:var(--mono);font-size:11px;color:var(--hell);margin:3px 0 12px}
.ak-status{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.sst{font-family:var(--mono);font-size:11.5px;color:var(--hell)} .sst.an{color:var(--grau)} .sst.jetzt{color:var(--rouge)}
.sst-pfeil{color:var(--linie)}
/* Modal */
.modal-bg{position:fixed;inset:0;background:rgba(20,24,26,.35);z-index:100}
.modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;z-index:101;border-radius:22px;box-shadow:0 24px 60px rgba(20,24,26,.18);width:480px;max-width:calc(100vw - 48px);padding:36px}
.mfield{width:100%;background:var(--nische);border:0;border-radius:11px;padding:12px 15px;font-size:14px;outline:none}
.mfield::placeholder{color:var(--hell)}
.mlbl{font-family:var(--mono);font-size:11px;color:var(--hell);letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px}
@media(max-width:820px){
.ulba{grid-template-columns:1fr}
.nav{position:fixed;left:0;top:0;bottom:0;width:248px;z-index:60;transform:translateX(-100%);transition:transform .25s;box-shadow:0 0 40px -10px rgba(0,0,0,.2);background:var(--porzellan)}
.nav.offen{transform:none}
.chat.split{grid-template-columns:1fr}
.chat.split .cs-main{display:none}
}
@media(prefers-reduced-motion:reduce){.ulba *{transition:none!important}}
`;

/* ── Helpers ── */
function specText(r: Result): string {
  const parts = [TYPE_LABELS[r.type] || r.type];
  if (r.availableSizes?.[0]) parts.push(r.availableSizes[0]);
  if (r.material?.[0]) parts.push(r.material[0]);
  return parts.filter(Boolean).join(' · ');
}
function emptyFilters(): ParsedFilters { return { sizes: [], materials: [], types: [], closures: [] }; }
function cloneFilters(f: ParsedFilters): ParsedFilters {
  return { sizes: [...f.sizes], materials: [...f.materials], types: [...f.types], closures: [...f.closures] };
}
function hasDim(f: ParsedFilters, d: keyof ParsedFilters): boolean { return (f[d] || []).length > 0; }

/* ── Render-Panel rechts ── */
function RenderPanel({ product, defaultQuery, isFav, inBoard, onFav, onBoard, onSample, onClose }: {
  product: Result; defaultQuery: string; isFav: boolean; inBoard: boolean;
  onFav: () => void; onBoard: () => void; onSample: () => void; onClose: () => void;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [rstatus, setRstatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [cap, setCap] = useState(0);
  const [capErr, setCapErr] = useState(false);

  useEffect(() => { setQuery(defaultQuery); setRstatus('idle'); setImgUrl(null); setCap(0); }, [product.id, defaultQuery]);
  useEffect(() => { setCapErr(false); }, [cap, product.id]);

  const run = async () => {
    if (!query.trim()) return;
    setRstatus('loading'); setImgUrl(null);
    try {
      const res = await fetch(RENDER_API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemId: product.id, query, tier: 'lite' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'render failed');
      setImgUrl(data.renderingUrl || null); setCached(!!data.cached); setRstatus('done');
    } catch { setRstatus('error'); }
  };

  const shown = imgUrl || product.imageUrl;

  return (
    <aside className="panel">
      <div className="pn-kopf">
        <div><h3 className="serif">{product.name}</h3><span className="pn-spec">{product.id} · {specText(product)}</span></div>
        <div className="pn-akt">
          <button className={`favherz${isFav ? ' an' : ''}`} style={{ position: 'static' }} onClick={onFav} aria-label="Favorit">{isFav ? '♥' : '♡'}</button>
          <button className="pn-zu" onClick={onClose} aria-label="schließen">×</button>
        </div>
      </div>
      {product.capImages && product.capImages.length > 0 && (
        <div className="pn-caps-top">
          <div className="lbl">Passende Verschlüsse · {product.capImages.length}</div>
          <div className="thumbs">
            {product.capImages.map((url, i) => (
              <div key={i} className={`capthumb${cap === i ? ' an' : ''}`} onClick={() => setCap(i)}>
                <img src={url} alt={`Verschluss ${i + 1}`} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
              </div>
            ))}
          </div>
        </div>
      )}
      {product.capImages && product.capImages.length > 0 && (
        <div className="pn-cap-gross">
          <div className="lbl">Gewählter Verschluss · {cap + 1}/{product.capImages.length}</div>
          <div className="buehne">
            {product.capImages[cap] && !capErr
              ? <img src={product.capImages[cap]} alt={`Verschluss ${cap + 1}`} onError={() => setCapErr(true)} />
              : <span className="ph">◇</span>}
          </div>
        </div>
      )}
      <div className="pn-bild">
        {shown ? <img src={shown} alt={product.name} /> : <span style={{ fontSize: 72, color: '#e2e2e0' }}>◇</span>}
      </div>
      <div className="pn-body">
        {product.reasoning && <p className="pgrund">{product.reasoning}</p>}
        <div className="vis">
          <div className="top">Deine Richtung</div>
          <div className="row">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="z. B. warmes Beige, matt, dezent" />
            <button className="gen" onClick={run} disabled={rstatus === 'loading' || !query.trim()}>{rstatus === 'loading' ? 'Generiert …' : 'Generieren'}</button>
          </div>
          {rstatus === 'error' && <div style={{ fontSize: 13, color: '#dc2626', marginTop: 10 }}>Konnte nicht generieren — bitte erneut versuchen.</div>}
          {imgUrl && <div className="out"><img src={imgUrl} alt="Rendering" />{cached && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--hell)', padding: '8px 12px' }}>Aus Cache</div>}</div>}
        </div>
        {product.capImages && product.capImages.length > 0 && (
          <div className="capstrip" style={{ display: 'none' }} />
        )}
        <div className="specs">
          {product.type && <div className="spec"><div className="k">Typ</div><div className="v">{TYPE_LABELS[product.type] || product.type}</div></div>}
          {product.supplier && <div className="spec"><div className="k">Lieferant</div><div className="v">{product.supplier}</div></div>}
          {product.material?.length ? <div className="spec"><div className="k">Material</div><div className="v">{product.material.join(', ')}</div></div> : null}
          {product.availableSizes?.length ? <div className="spec"><div className="k">Volumen</div><div className="v">{product.availableSizes.join(', ')}</div></div> : null}
          {product.closure && <div className="spec"><div className="k">Verschluss</div><div className="v">{product.closure}</div></div>}
          {product.capCount > 0 && <div className="spec"><div className="k">Kompatible Verschlüsse</div><div className="v">{product.capCount}</div></div>}
        </div>
        {product.capabilities?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>{product.capabilities.map((c, i) => <span key={i} className="chip">{c}</span>)}</div>
        )}
      </div>
      <div className="pn-aktion">
        <button className="cta" onClick={onSample}>Muster anfragen →</button>
        <button className={`cta-sek${inBoard ? ' an' : ''}`} onClick={onBoard}>{inBoard ? '✓ im Paket' : '+ Paket'}</button>
      </div>
    </aside>
  );
}

/* ── Muster-Anfrage-Modal (unverändert aus deinem Code) ── */
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
      <div className="modal-bg" onClick={onClose} />
      <div className="modal">
        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div className="serif" style={{ fontSize: 24, color: 'var(--rouge)', marginBottom: 10 }}>Anfrage raus.</div>
            <div style={{ fontSize: 14, color: 'var(--grau)', marginBottom: 30, lineHeight: 1.6 }}>Der Lieferant meldet sich direkt bei dir{product.supplier ? ` (${product.supplier})` : ''} — mit Mustern und Preisen.</div>
            <button onClick={onClose} style={{ background: 'var(--tinte)', color: '#fff', borderRadius: 999, padding: '14px 36px', fontSize: 15 }}>Schließen</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 }}>
              <div><div className="serif" style={{ fontSize: 22, marginBottom: 3 }}>Muster anfragen</div><div style={{ fontSize: 13, color: 'var(--hell)' }}>{product.name}{product.supplier ? ` · ${product.supplier}` : ''}</div></div>
              <button className="pn-zu" onClick={onClose}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><div className="mlbl">Name</div><input className="mfield" value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" /></div>
                <div><div className="mlbl">Marke</div><input className="mfield" value={firm} onChange={e => setFirm(e.target.value)} placeholder="Markenname" /></div>
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

/* ── Ergebniskarte ── */
function Karte({ r, selected, isFav, onOpen, onFav }: {
  r: Result; selected: boolean; isFav: boolean; onOpen: () => void; onFav: (e: React.MouseEvent) => void;
}) {
  return (
    <div className={`ek${selected ? ' an' : ''}`}>
      <button className={`favherz${isFav ? ' an' : ''}`} onClick={onFav} aria-label="Favorit">{isFav ? '♥' : '♡'}</button>
      <button className="ek-klick" onClick={onOpen}>
        <div className="ek-bild">{r.imageUrl ? <img src={r.imageUrl} alt={r.name} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} /> : <span className="ek-ph">◇</span>}</div>
        <div className="ek-info"><span className="ek-nm">{r.name}</span><span className="ek-spec">{specText(r)}</span></div>
        <span className="ek-match"><span className="em-z">{r.score}</span><span className="em-l">Match</span></span>
      </button>
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'start' | 'chat' | 'linien' | 'favoriten' | 'anfragen'>('start');
  const [input, setInput] = useState('');
  const [refineInput, setRefineInput] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [rootQuery, setRootQuery] = useState('');
  const [selected, setSelected] = useState<Result | null>(null);
  const [sampleProduct, setSampleProduct] = useState<Result | null>(null);
  const [board, setBoard] = useState<Result[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const blockId = useRef(0);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); setProjects(loadProjects()); setFavorites(loadFavorites()); }, []);
  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [blocks]);

  const isFav = (id: string) => favorites.some(f => f.productId === id);
  const quickFav = (product: Result) => {
    const saved = favorites.some(f => f.productId === product.id);
    const upd = saved ? favorites.filter(f => f.productId !== product.id)
      : [...favorites, { productId: product.id, projectId: 'default', savedAt: Date.now(), product }];
    setFavorites(upd); saveFavorites(upd);
  };
  const toggleBoard = (product: Result) => {
    setBoard(b => b.some(x => x.id === product.id) ? b.filter(x => x.id !== product.id) : [...b, product]);
  };

  /* Kernstück: ein Suchlauf → ein neuer Block im Verlauf.
     Variante A: wir nutzen den bestehenden active_filters-Mechanismus. */
  const runSearch = useCallback(async (query: string, filters: ParsedFilters, intro: string) => {
    const id = ++blockId.current;
    setBlocks(prev => [...prev, { id, intro, query, filters, results: [], categoryMatch: '', alleZeigen: false, status: 'loading' }]);
    try {
      const body: any = { query };
      // Nur mitschicken, wenn wir aktiv eingegrenzt haben (erste Suche: reines query).
      if (filters.sizes.length || filters.materials.length || filters.types.length || filters.closures.length) {
        body.active_filters = filters;
      }
      const res = await fetch(SEARCH_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // ►►► ANNAHME: data.results, data.parsedFilters, data.categoryMatch
      const serverFilters: ParsedFilters = data.parsedFilters || filters;
      setBlocks(prev => prev.map(b => b.id === id ? {
        ...b, results: data.results || [], categoryMatch: data.categoryMatch || '',
        filters: serverFilters, status: 'done',
      } : b));
    } catch {
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, status: 'error' } : b));
    }
  }, []);

  const starteSuche = (text: string) => {
    if (!text.trim()) return;
    setRootQuery(text.trim()); setBlocks([]); blockId.current = 0; setSelected(null); setView('chat');
    runSearch(text.trim(), emptyFilters(), text.trim());
  };

  // Freitext-Verfeinerung: hängt an die Root-Query an und sucht neu (Stufe 2 macht das smarter).
  const verfeinereText = (text: string) => {
    if (!text.trim()) return;
    const letzter = blocks[blocks.length - 1];
    const filters = letzter ? cloneFilters(letzter.filters) : emptyFilters();
    const neueQuery = `${rootQuery} ${text.trim()}`;
    setSelected(null);
    runSearch(neueQuery, filters, text.trim());
  };

  // Facette wählen → Filter erweitern → neuer Block darunter
  const waehleFacette = (dim: keyof ParsedFilters, wert: string) => {
    const letzter = blocks[blocks.length - 1];
    const filters = letzter ? cloneFilters(letzter.filters) : emptyFilters();
    if (!filters[dim].includes(wert)) filters[dim] = [...filters[dim], wert];
    setSelected(null);
    runSearch(rootQuery, filters, `${FILTER_LABELS[dim]}: ${wert}`);
  };

  // Filter-Pill entfernen → neuer Block darunter
  const entferneFilter = (dim: keyof ParsedFilters, wert: string) => {
    const letzter = blocks[blocks.length - 1];
    const filters = letzter ? cloneFilters(letzter.filters) : emptyFilters();
    filters[dim] = filters[dim].filter(v => v !== wert);
    setSelected(null);
    runSearch(rootQuery, filters, `ohne ${wert}`);
  };

  const favCount = favorites.filter((f, i, a) => a.findIndex(x => x.productId === f.productId) === i).length;
  const lastId = blocks.length ? blocks[blocks.length - 1].id : -1;

  const nav = (
    <aside className="nav">
      <button className="nav-marke" onClick={() => setView('start')}>ulba</button>
      <button className="nav-neu" onClick={() => setView('start')}>+ Neues Projekt</button>
      <div>
        {([['favoriten', '♡', 'Favoriten', favCount], ['linien', '▤', 'Meine Linien', board.length], ['anfragen', '⇄', 'Musteranfragen', 0]] as const).map(([v, ic, t, badge]) => (
          <button key={v} className={`nav-item${view === v ? ' an' : ''}`} onClick={() => setView(v as any)}>
            <span className="ni-ic">{ic}</span><span className="ni-t">{t}</span>{badge ? <span className="ni-b">{badge}</span> : null}
          </button>
        ))}
      </div>
      <div className="nav-lbl">Projekt</div>
      <div className="nav-chats">
        {rootQuery
          ? <button className={`nav-chat${view === 'chat' ? ' an' : ''}`} onClick={() => setView('chat')}>
            <span className="nc-t">{rootQuery.slice(0, 40)}</span>
            <span className="nc-s">{board.length ? `${board.length} im Paket` : 'Suche'}</span>
          </button>
          : <div className="nav-leer">Noch kein Projekt</div>}
      </div>
      <div className="nav-profil"><span className="np-av">A</span><div><span className="np-n">Alen</span><span className="np-s">ulba · Basel</span></div></div>
    </aside>
  );

  if (!mounted) {
    return <div className="ulba"><style>{STYLES}</style>{nav}<div className="main" /></div>;
  }

  return (
    <div className="ulba">
      <style>{STYLES}</style>
      {nav}
      <div className="main">
        <header className="topbar">
          <span className="spur">{view === 'start' ? 'Generatives Sourcing' : view === 'chat' ? (rootQuery.slice(0, 40) || 'Projekt') : view === 'linien' ? 'Meine Linien' : view === 'favoriten' ? 'Favoriten' : 'Musteranfragen'}</span>
        </header>
        <div className={`content${view === 'chat' ? ' content-chat' : ''}`}>
          {view === 'start' && (
            <div className="start">
              <div className="st-mitte">
                <div className="st-logo">علبة</div>
                <h1>Was möchtest du <em>launchen</em>?</h1>
                <div className="feld">
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && starteSuche(input)} placeholder="z. B. ruhiges Vitamin-C-Serum, 30 ml, premium" autoFocus />
                  <button className="go" onClick={() => starteSuche(input)} aria-label="Suchen">↑</button>
                </div>
                <div className="st-trend">
                  {EXAMPLES.map((ex, i) => <button key={i} className="tr-pill" onClick={() => { setInput(ex.q); starteSuche(ex.q); }}>{ex.label}</button>)}
                </div>
                <p className="st-note">ulba durchsucht echte Lieferanten-Kataloge und rankt nach Passung — wie eine Designagentur, in Minuten.</p>
              </div>
            </div>
          )}

          {view === 'chat' && (
            <div className={`chat${selected ? ' split' : ''}`}>
              <main className="cs-main">
                <div className="thread" ref={threadRef}>
                  {blocks.map(b => {
                    const isLast = b.id === lastId;
                    const liste = b.results;
                    const zeige = b.alleZeigen ? liste : liste.slice(0, 20);
                    const rest = liste.length - zeige.length;
                    const pal = b.categoryMatch || 'deine Suche';
                    const chips: { dim: keyof ParsedFilters; wert: string; label: string }[] = [];
                    (Object.keys(FILTER_LABELS) as (keyof ParsedFilters)[]).forEach(dim =>
                      (b.filters[dim] || []).forEach(wert => chips.push({ dim, wert, label: `${FILTER_LABELS[dim]}: ${wert}` })));
                    const facetten = FACETTEN.filter(f => !hasDim(b.filters, f.dim));
                    return (
                      <div key={b.id}>
                        <div className="msg-user"><span>{b.intro}</span></div>
                        <div className="msg-ulba">
                          {b.status === 'loading' && (
                            <div className="eb-scan">
                              <div className="sc-kopf"><span className="sc-lbl">Durchsuche Lieferanten-Kataloge</span><span className="sc-liefer">LUMSON · Glanzer · Bakic</span></div>
                              <div className="sc-zeile">Rankt nach Passung …</div>
                            </div>
                          )}
                          {b.status === 'error' && <div className="eb-scan" style={{ color: '#dc2626' }}>Fehler — bitte erneut versuchen.</div>}
                          {b.status === 'done' && (
                            <div className={`eb${isLast ? '' : ' eb-alt'}`}>
                              {chips.length > 0 && (
                                <div className="eb-filter">
                                  <span className="ebf-lbl">{isLast ? 'Aktiv' : 'Stand'}</span>
                                  {chips.map((c, i) => (
                                    <span key={i} className="ebf-pill">{c.label}{isLast && <span className="ebf-x" onClick={() => entferneFilter(c.dim, c.wert)}>×</span>}</span>
                                  ))}
                                </div>
                              )}
                              <div className="eb-kopf"><span className="ebk-h">{zeige.length} beste Treffer</span><span className="ebk-s">nach Match · gelesen als {pal}</span></div>
                              {liste.length === 0
                                ? <div className="leer"><div className="gr">Keine Treffer.</div>Versuch eine breitere Suche.</div>
                                : <div className={`eb-grid${selected ? ' schmal' : ''}`}>
                                  {zeige.map(r => <Karte key={r.id} r={r} selected={selected?.id === r.id} isFav={isFav(r.id)} onOpen={() => setSelected(r)} onFav={e => { e.stopPropagation(); quickFav(r); }} />)}
                                </div>}
                              {rest > 0 && !b.alleZeigen && <button className="eb-mehr" onClick={() => setBlocks(prev => prev.map(x => x.id === b.id ? { ...x, alleZeigen: true } : x))}>Alle weiteren {rest} anzeigen ↓</button>}
                              {b.alleZeigen && liste.length > 20 && <button className="eb-mehr" onClick={() => setBlocks(prev => prev.map(x => x.id === b.id ? { ...x, alleZeigen: false } : x))}>Nur beste 20 zeigen ↑</button>}
                              {isLast && facetten.length > 0 && (
                                <div className="eb-facetten">
                                  <span className="ebf-lbl">Weiter eingrenzen</span>
                                  {facetten.map(f => (
                                    <div key={f.dim} className="facet">
                                      <span className="fc-lbl">{f.label}</span>
                                      {f.opt.map(o => <button key={o} className="fc-opt" onClick={() => waehleFacette(f.dim, o)}>{o}</button>)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="refine">
                  <div className="feld">
                    <input value={refineInput} onChange={e => setRefineInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { verfeinereText(refineInput); setRefineInput(''); } }} placeholder={'Verfeinern in Worten — „wärmer", „nur Glas", „30 ml"'} />
                    <button className="go" onClick={() => { verfeinereText(refineInput); setRefineInput(''); }} aria-label="senden">↑</button>
                  </div>
                </div>
              </main>
              {selected && (
                <RenderPanel product={selected} defaultQuery={rootQuery} isFav={isFav(selected.id)} inBoard={board.some(x => x.id === selected.id)}
                  onFav={() => quickFav(selected)} onBoard={() => toggleBoard(selected)} onSample={() => setSampleProduct(selected)} onClose={() => setSelected(null)} />
              )}
            </div>
          )}

          {view === 'linien' && (
            <div className="bereich">
              <div className="ber-kopf"><h2 className="serif">Meine Linien</h2><p>Was du ins Musterpaket gelegt hast. In Stufe 2 wird daraus eine Linie pro Projekt.</p></div>
              {board.length === 0
                ? <div className="leer"><div className="gr">Noch leer.</div>Leg im Detail ein Packmittel ins Paket.</div>
                : <div className="lin-grid">
                  <div className="lin-karte">
                    <div className="lk-reihe">{board.slice(0, 4).map(r => r.imageUrl ? <img key={r.id} src={r.imageUrl} alt={r.name} /> : <span key={r.id} style={{ fontSize: 30, color: '#d8d8d6' }}>◇</span>)}</div>
                    <div className="lk-info"><span className="lk-t">{rootQuery.slice(0, 30) || 'Aktuelle Linie'}</span><span className="lk-s">{board.length} Teile</span></div>
                  </div>
                </div>}
            </div>
          )}

          {view === 'favoriten' && (
            <div className="bereich">
              <div className="ber-kopf"><h2 className="serif">Favoriten</h2><p>Einzelne Packmittel, die du dir gemerkt hast.</p></div>
              {favCount === 0
                ? <div className="leer"><div className="gr">Noch leer.</div>Tippe auf das Herz an einem Packmittel.</div>
                : <div className="eb-grid">
                  {favorites.filter((f, i, a) => a.findIndex(x => x.productId === f.productId) === i).map(f => (
                    <Karte key={f.productId} r={f.product} selected={false} isFav onOpen={() => { setView('chat'); setSelected(f.product); }} onFav={e => { e.stopPropagation(); quickFav(f.product); }} />
                  ))}
                </div>}
            </div>
          )}

          {view === 'anfragen' && (
            <div className="bereich">
              <div className="ber-kopf"><h2 className="serif">Musteranfragen</h2><p>Was du angefragt hast — und wo es steht. Status kommt in Stufe 3 aus Airtable.</p></div>
              <div className="leer"><div className="gr">Noch keine Anfrage.</div>Sende im Detail eine Musteranfrage.</div>
            </div>
          )}
        </div>
      </div>
      {sampleProduct && <SampleModal product={sampleProduct} onClose={() => setSampleProduct(null)} />}
    </div>
  );
}
