'use client';
/* ulba · page.tsx — Thread-Verlauf: jeder Suchlauf ist ein Block.
   Spricht nur mit dem Renderer (/api/search, /api/render).
   Favoriten/Projekte über localStorage. Historie: git log. */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

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

const FACETTEN: { dim: keyof ParsedFilters; label: string; opt: string[] }[] = [
  // v60 — Werte sind die REALEN Airtable-Optionen (deutsch), sonst trifft der Filter nichts.
  { dim: 'materials', label: 'Material', opt: ['Glas', 'PET', 'PETG', 'HDPE', 'PP', 'Aluminium'] },
  { dim: 'sizes', label: 'Volumen', opt: ['15ml', '30ml', '50ml', '75ml', '100ml', '200ml'] },
  { dim: 'closures', label: 'Verschluss', opt: ['Schraubverschluss', 'Pump', 'Pipette', 'Spray', 'Flip-top'] },
];

/* Ein Verschluss aus /api/search: id + name (für die Anfrage) + imageUrl (Anzeige). */
interface CapRef { id: string; name: string; imageUrl: string }

/* Konzept-Brief aus /api/render — Markenwelt hinter dem Render (Rahmen + Wunschwerte). */
interface RenderConcept {
  konzept_name: string;
  story: string;
  rationale: string;
  produzierbar: { finish?: string[]; dekoration?: string[]; grafik_label?: string; farbkonzept?: string } | null;
  szene_id: string;
  label?: { wortmarke: string; kategorie: string; ist_platzhalter: boolean };
  palette?: { name: string; hex: string[]; pantone: string[] };
  radar?: Record<string, number>;
  zielprofil?: string[];
  // Achsen-Cursor: gewählter Code + Temp_Laut-Nachbarschaft für die Nudge-Chips.
  design_code?: {
    id: string; name: string; umleitung?: string | null; brand?: string | null; produkt?: string | null; stufe?: number; verlust?: string[];
    farbort?: string; can_koerper?: boolean; can_liquid?: boolean;
    laut?: number | null; register?: string | null;
    can_quieter?: boolean; can_louder?: boolean;
    // v27-Backend: Material für die Behauptung.
    beschreibung?: string | null; wirkstoff_welt?: string[]; zielgruppe?: string[];
  };
  // Die Herleitungs-Leiter: pro Signal eine Zeile Bedeutung → Form → weil.
  kette?: Array<{ typ: string; bedeutung: string; form: string; weil: string }>;
  do_not?: string[];
  karte?: {
    register: string | null; laut: number | null;
    gewaehlt: string; kompass: string | null; anti: string | null; verworfen: string | null;
    welten: Array<{ register: string; anzahl: number; codes: Array<{ id: string; name: string; brand: string; bild: string | null; laut: number | null }> }>;
  };
  verworfen?: { name: string; grund: string } | null;
  farbsystem?: {
    rollen: Array<{ rolle: string; hex: string; ort: string; cue?: string }>;
    laut: string | null; warnungen: string[];
  };
}
function produzierbarText(p: RenderConcept['produzierbar']): string {
  if (!p) return '';
  const parts: string[] = [];
  if (p.finish?.length) parts.push(`Finish: ${p.finish.join(', ')}`);
  if (p.dekoration?.length) parts.push(`Dekoration: ${p.dekoration.join(', ')}`);
  if (p.farbkonzept) parts.push(`Farbe: ${p.farbkonzept}`);
  if (p.grafik_label) parts.push(`Grafik/Label: ${p.grafik_label}`);
  return parts.join('\n');
}


// ►►► ANNAHME: /api/search liefert results: Result[] mit diesen Feldern.
/* v47 — was ulba aus einem Referenzfoto liest. `geraten` nennt die Felder,
   die geschaetzt sind; die zeichnet das Interface gestrichelt. */
interface Bildlesart {
  typ: string | null; form: string[]; schulter: string | null; proportion: string | null;
  verschluss: string | null; material: string[]; transparenz: string | null;
  finish: string | null; volumen: string | null; prosa: string; geraten: string[];
}

interface Result {
  id: string; name: string; score: number; reasoning: string;
  abweichung?: string[]; // v47 — wo dieses Teil vom Referenzbild abweicht
  formNaehe?: number | null;  // v55 — Silhouetten-Naehe
  type: string; material: string[]; form: string[]; closure: string;
  description?: string; imageUrl: string | null;
  capabilities: string[]; availableSizes: string[]; availableMaterials: string[];
  capCount: number;
  caps?: CapRef[]; // {id, name, imageUrl}
  capImages?: string[]; // Fallback (nur URLs) — falls Backend noch alt ist
  supplier?: string;
  projekt?: string;
}

// ►►► design_looks aus /api/search: Look-Rezept + reales Gate-Base.
//     brand/produkt sind aspirationale Referenzen → NIE im UI anzeigen.
interface DesignLook {
  code_id: string; code_name: string;
  register: string; temp_laut: number | null; temp_ton: number | null;
  body_behandlung: string; farbort: string; body_hex: string; body_hex_2: string;
  farbverlauf: string; akzent_hex: string;
  finish_body: string; cap_finish: string; cap_hex: string; typo_haltung: string;
  anforderungen: string[]; segment: string[];
  axis_score: number; axis_why: string;
  matched_base: { id: string; name: string; type: string; material: string[]; closure: string; image_url: string | null; supplier: string };
}

// ►►► ANNAHME: /api/search liefert parsedFilters mit genau diesen vier Keys.
type ParsedFilters = { sizes: string[]; materials: string[]; types: string[]; closures: string[] };

/* Kontext, den „Muster anfragen" ans Modal übergibt: Original + aktueller Wunsch. */
interface SampleContext {
  product: Result;
  renderUrl: string; // aktueller Wunsch-Render (leer, wenn nur Rohteil angezeigt)
  wishValues: string; // produzierbare Wunschwerte des letzten Renders (Finish/Dekor/Farbe)
  capLabel: string; // lesbarer Name des gewählten Verschlusses
  konzept: RenderConcept | null; // Markenwelt hinter dem Render (Rahmen + Wunschwerte)
}

interface Block {
  id: number;
  intro: string;
  query: string;
  filters: ParsedFilters;
  removed?: ParsedFilters; // per Chip-X entfernte Werte — bleiben über Verfeinerungen entfernt (Backend subtrahiert sie nach dem Union-Merge)
  results: Result[];
  looks: DesignLook[]; // Design-Looks (Rezept × Gate-Base) — Payoff-Reihe über dem Grid
  categoryMatch: string;
  hinweis: string; // v30 — Kompetenz-Satz vor den Kacheln (Formel-Flags)
  alleZeigen: boolean;
  status: 'loading' | 'done' | 'error';
  capWall?: CapWall; // Verschluss-Wand aus /api/search (deprioritize_open_dropper)
  bild?: string;          // v47 — Referenzfoto dieser Runde (Vorschau im Thread)
  nah?: number;           // v50 — wie viele Treffer wirklich nah sind
  aehnlich?: number;      // v55 — zweite Stufe: verwandt in der Form, kein Volltreffer
  formMessung?: { aktiv: boolean; grund?: string; seitenverhaeltnis?: number } | null;
  tags?: { kat: string; wert: string }[]; // v50 — was ulba im Bild gelesen hat
  lesart?: Bildlesart | null; // v47 — die Lesart, als korrigierbare Chips
  commits?: LookCommit[]; // Look-Turns unter diesem Block — Teil ins Design gelegt (Verlauf, persistiert)
}

/* Ein Lauf (v12): eine abgeschlossene Ableitung — Worte, Richtung, Bild.
   Läufe werden nie überschrieben, nur angehängt (wie Suchblöcke). */
interface Lauf {
  id: number;
  worte: string;
  heroUrl: string | null;
  capRenderUrl: string | null;
  lastPrompt: string;
  concept: RenderConcept | null;
}

/* Ein Look-Turn im Verlauf: welches Teil, welcher Verschluss, und auf welchem Brief
   der Render basiert (Text + Justierung). Bleibt im Projekt, wie ein Suchblock. */
interface LookCommit {
  id: number;
  productId: string;
  cap: number;
  ts: number;
  brief?: string;      // finaler Brief-Text beim „Rendern →" (leer = noch im Brief)
  justier?: string[];  // gewählte Justierungs-Chips
  // Render-Ergebnis (persistiert, damit der Turn nach Projektwechsel vollständig steht):
  heroUrl?: string | null;
  capRenderUrl?: string | null;
  lastPrompt?: string;
  concept?: RenderConcept | null;
  // v11 (Legacy, wird nur noch gelesen): Worte-Log alter Commits.
  verlauf?: { worte: string; code: string; ts: number }[];
  // v12 — die Läufe dieses Turns. Quelle der Wahrheit für alles Gerenderte.
  laeufe?: Lauf[];
}

/* Cap-Wand aus /api/search: steuert das Verschluss-Panel (nicht den Hard Filter).
   deprioritize_open_dropper = offenen Pipetten-Cap nach hinten + Hinweis, nie entfernen. */
interface CapWall { deprioritize_open_dropper?: boolean }

interface Project {
  id: string;
  name: string;
  createdAt: number;
  rootQuery: string;
  blocks: Block[];
  board: Result[];
  blockSeq: number;
}

interface FavoriteEntry { productId: string; projectId: string; savedAt: number; product: Result; }

const LS_PROJECTS = 'ulba_projects_v2';
const LS_FAVORITES = 'ulba_favorites';

/* v60 — stabile Bild-Adressen. Airtable-Anhang-URLs laufen nach ~2 h ab;
   gespeicherte Favoriten/Projekte zeigten danach leere Karten. Jede
   Airtable-URL an einem Objekt mit Record-ID wird auf /api/bild?r=<id>
   umgeschrieben — die Route holt bei Bedarf die frische URL. Wirkt beim
   Laden aus localStorage (heilt Altbestand) und bei jeder neuen Antwort. */
const AT_URL = /airtableusercontent\.com|dl\.airtable\.com/;
const REC_ID = /^rec[A-Za-z0-9]{14}$/;
function stabil(id: string, k?: string): string { return `/api/bild?r=${id}${k ? `&k=${k}` : ''}`; }
function heile<T>(x: T): T {
  if (Array.isArray(x)) return x.map(v => heile(v)) as unknown as T;
  if (!x || typeof x !== 'object') return x;
  const ein = x as Record<string, unknown>;
  const id = typeof ein.id === 'string' && REC_ID.test(ein.id) ? ein.id : null;
  const aus: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ein)) {
    aus[k] = id && (k === 'imageUrl' || k === 'image_url') && typeof v === 'string' && AT_URL.test(v) ? stabil(id) : heile(v);
  }
  if (Array.isArray(aus.caps) && Array.isArray(aus.capImages)) aus.capImages = (aus.caps as { imageUrl?: string }[]).map(c => c.imageUrl || '');
  return aus as T;
}

function loadProjects(): Project[] {
  try { const raw = localStorage.getItem(LS_PROJECTS); if (raw) return heile(JSON.parse(raw)); } catch {}
  return [];
}
/* v60 — localStorage fasst ~5 MB. Grosse Referenzbild-Vorschauen haben das
   Limit gesprengt; danach wurde still NICHTS mehr gespeichert. Jetzt: beim
   Ueberlauf die Vorschauen abwerfen und erneut speichern. */
function saveProjects(p: Project[]) {
  try { localStorage.setItem(LS_PROJECTS, JSON.stringify(p)); return; } catch {}
  try {
    const schlank = p.map(x => ({ ...x, blocks: x.blocks.map(b => b.bild ? { ...b, bild: undefined } : b) }));
    localStorage.setItem(LS_PROJECTS, JSON.stringify(schlank));
  } catch {}
}
/* Vollbilder der laufenden Sitzung (fuer Lesart-Korrekturen); nie persistiert. */
const bildSpeicher = new Map<string, string>();
function projektName(lesart: Bildlesart | null | undefined): string | null {
  if (!lesart?.typ) return null;
  return `Referenzbild · ${[lesart.typ, lesart.material?.[0]].filter(Boolean).join(', ')}`.slice(0, 48);
}
function neueProjektId(): string { return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function loadFavorites(): FavoriteEntry[] {
  try { const raw = localStorage.getItem(LS_FAVORITES); if (raw) return heile(JSON.parse(raw)); } catch {}
  return [];
}
function saveFavorites(f: FavoriteEntry[]) { try { localStorage.setItem(LS_FAVORITES, JSON.stringify(f)); } catch {} }

/* Private Render-Historie pro Packmittel — client-seitig, kein Leak, überlebt Sessions. */
const LS_RENDERS = 'ulba_renders_v1';
function loadRenderHist(systemId: string): string[] {
  try { const raw = localStorage.getItem(LS_RENDERS); if (raw) { const all = JSON.parse(raw); return Array.isArray(all[systemId]) ? all[systemId] : []; } } catch {}
  return [];
}
function saveRenderHist(systemId: string, urls: string[]) {
  try {
    const raw = localStorage.getItem(LS_RENDERS);
    const all = raw ? JSON.parse(raw) : {};
    all[systemId] = urls;
    localStorage.setItem(LS_RENDERS, JSON.stringify(all));
  } catch {}
}

/* Gesendete Musteranfragen — lokal gemerkt (kein Login), Status wird live nachgeladen. */
const LS_REQUESTS = 'ulba_requests_v1';
interface SentRequest {
  id: string; productName: string; supplier: string; konzeptName: string;
  renderUrl: string; sentAt: number; status?: string;
}
function loadRequests(): SentRequest[] {
  try { const raw = localStorage.getItem(LS_REQUESTS); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function saveRequests(r: SentRequest[]) { try { localStorage.setItem(LS_REQUESTS, JSON.stringify(r)); } catch {} }

/* Caps normalisieren: bevorzugt caps[{id,name,url}], sonst aus capImages ableiten. */
function getCaps(p: Result): CapRef[] {
  if (p.caps && p.caps.length > 0) return p.caps.filter(c => c && c.imageUrl);
  if (p.capImages && p.capImages.length > 0) return p.capImages.map(url => ({ id: '', name: '', imageUrl: url }));
  return [];
}

/* ── Design-System: „Porzellan & Pigment" — reines Weiß ── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap');
:root{
  --porzellan:#FFFFFF;--panel:#FFFFFF;--nische:#F7F7F8;
  --tinte:#1D1D1B;--grau:#5B5B58;--hell:#9A9A96;
  --rouge:#4C1420;--linie:#ECECEE;--linie2:#F4F4F5;--r:14px;
  /* Chat-Ebene: eigene Blase fuer den Nutzer, ruhige Flaeche darunter. */
  --blase:#DCEAFB;--blase-txt:#14213A;--flaeche:#FAFAFA;
  --serif:'Archivo',system-ui,sans-serif;
  --sans:'Archivo',system-ui,sans-serif;
  --mono:'Archivo',system-ui,sans-serif;
}
.ulba{background:var(--flaeche);color:var(--tinte);height:100dvh;font-family:var(--sans);font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased;display:grid;grid-template-columns:347px 1fr;overflow:hidden}
.ulba *{box-sizing:border-box}
.ulba button{font:inherit;color:inherit;background:none;border:none;cursor:pointer}
.ulba input,.ulba textarea{font:inherit}
.ulba :focus-visible{outline:1.5px solid var(--tinte);outline-offset:2px}
.serif{font-family:var(--serif);font-weight:800;letter-spacing:-.01em} .kursiv{font-family:var(--serif);font-style:normal}
.mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
.nav{background:var(--flaeche);border-right:1px solid var(--linie);padding:16px 14px;display:flex;flex-direction:column;gap:3px;overflow-y:auto}
.nav-marke{text-align:left;padding:6px 8px 14px;display:block;line-height:0}
.nav-logo{height:26px;width:auto;display:block}
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
.nav-chat{position:relative;text-align:left;padding:9px 26px 9px 11px;border-radius:9px;display:flex;flex-direction:column;gap:2px}
.nav-chat:hover{background:var(--nische)} .nav-chat.an{background:var(--nische)}
.nc-x{position:absolute;top:50%;right:8px;transform:translateY(-50%);width:18px;height:18px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;color:var(--hell);opacity:0}
.nav-chat:hover .nc-x{opacity:1}
.nc-x:hover{background:var(--linie);color:var(--rouge)}
.nc-t{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nc-s{font-family:var(--mono);font-size:10px;color:var(--hell)}
.nav-leer{font-size:12.5px;color:var(--hell);padding:8px 11px}
.nav-profil{display:flex;align-items:center;gap:10px;padding:12px 8px 4px;margin-top:8px;border-top:1px solid var(--linie)}
.np-av{width:30px;height:30px;border-radius:50%;background:var(--rouge);color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center}
.np-n{display:block;font-size:13.5px} .np-s{display:block;font-family:var(--mono);font-size:10.5px;color:var(--hell)}
.main{display:flex;flex-direction:column;min-width:0;overflow:hidden}
.topbar{flex:none;border-bottom:1px solid var(--linie);display:flex;align-items:center;gap:14px;padding:14px 32px}
.topbar .spur{font-family:var(--mono);font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--hell)}
.content{flex:1;overflow-y:auto;min-height:0}
.content-chat{overflow:hidden;display:flex}
.start{height:100%;display:flex;align-items:center;justify-content:center;padding:20px 0 80px}
.st-mitte{width:100%;max-width:640px;text-align:center;padding:0 24px}
.st-logo{font-family:var(--serif);font-size:26px;color:var(--rouge);margin-bottom:18px;opacity:.7}
.st-mitte h1{font-family:var(--serif);font-size:clamp(28px,3.6vw,40px);font-weight:500;line-height:1.12;letter-spacing:-.02em;color:var(--tinte);margin-bottom:34px}
.st-mitte h1 em{font-style:normal;font-weight:500;color:var(--rouge)}
.feld{position:relative;display:flex;align-items:center;max-width:600px;margin:0 auto;border:1px solid var(--linie);border-radius:14px;background:var(--panel);padding:6px 6px 6px 20px;box-shadow:none;transition:border-color .15s}
.feld:focus-within{border-color:var(--hell)}
.feld input:focus,.feld input:focus-visible{outline:none!important;box-shadow:none}
.feld input{flex:1;border:0;background:none;padding:14px 4px;color:var(--tinte);min-width:0;outline:none}
.feld input::placeholder{color:var(--hell)}
.bildknopf{flex:none;display:flex;align-items:center;justify-content:center;width:34px;height:34px;margin-left:-8px;margin-right:2px;border-radius:9px;color:var(--hell);cursor:pointer;font-size:17px;transition:background .15s,color .15s}
.bildknopf:hover{background:var(--nische);color:var(--tinte)}
.msg-bild{display:block;max-width:150px;max-height:150px;border-radius:11px;border:1px solid var(--linie);margin-bottom:8px;object-fit:contain;background:#fff}
.eb-aehnlich{display:flex;align-items:baseline;gap:10px;margin:22px 0 12px}
.eb-lesart{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-bottom:16px}
.lz-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font-size:12px;background:var(--nische);border:1px solid var(--linie);color:var(--tinte)}
.lz-pill.geraten{background:none;border-style:dashed;color:var(--grau)}
.lz-note{font-size:11px;color:var(--hell);margin-left:2px}
.ek-ab{display:block;font-family:var(--mono);font-size:10px;color:var(--hell);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.feld .go{flex:none;width:38px;height:38px;border-radius:10px;background:var(--tinte);color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center}
.feld .go:hover{background:var(--rouge)}
.st-trend{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin:22px auto 0;max-width:580px}
.tr-pill{padding:8px 15px;border-radius:999px;font-size:13px;color:var(--grau);border:1px solid transparent;background:var(--nische)}
.tr-pill:hover{background:var(--linie2);color:var(--tinte)}
.st-note{color:var(--hell);font-size:13.5px;max-width:44ch;margin:32px auto 0;line-height:1.5}
.chat{display:grid;grid-template-columns:1fr;height:100%;width:100%;min-height:0;overflow:hidden}
.chat.split{grid-template-columns:minmax(420px,1fr) 720px}
.cs-main{display:flex;flex-direction:column;min-width:0;height:100%;min-height:0}
.thread{flex:1;overflow-y:auto;min-height:0;padding:26px clamp(16px,4vw,54px) 20px}
.thread-inner{max-width:900px;margin:0 auto;width:100%}
.refine{flex:none;background:var(--flaeche);padding:12px clamp(16px,4vw,54px) 20px}
.refine .feld{max-width:760px;margin:0 auto;border-radius:26px;padding:5px 6px 5px 22px;background:#fff;border-color:#E4E4E6;box-shadow:0 1px 6px rgba(20,24,26,.06)}
.refine .feld:focus-within{border-color:#C9CDD4;box-shadow:0 2px 12px rgba(20,24,26,.09)}
.refine .feld .go{width:36px;height:36px;border-radius:50%;background:var(--blase-txt)}
.refine .feld .go:hover{background:var(--rouge)}
.grp-titel{font-family:var(--serif);font-size:20px;font-weight:800;letter-spacing:-.01em;margin:28px 0 14px}
.grp-titel:first-child{margin-top:0}
.refine .feld input{padding:11px 4px;font-size:14px}
/* Kontext-Strip: macht sichtbar, dass die Leiste gerade das Briefing fuehrt
   und nicht die Suche verfeinert — die beiden Ebenen duerfen nie verschwimmen. */
.rf-strip{max-width:900px;margin:0 auto 9px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.rf-modus{font-size:13px;color:var(--grau)}
.rf-modus b{color:var(--tinte);font-weight:600}
.rf-grund{font-size:13px;color:var(--hell)}
.rf-ab{margin-left:auto;background:var(--tinte);color:#fff;border-radius:999px;padding:9px 18px;font-size:13.5px;white-space:nowrap}
.rf-ab:hover{background:var(--rouge)}
.rf-ab:disabled{opacity:.4;cursor:default}
.rf-zurueck{font-size:12.5px;color:var(--hell);text-decoration:underline;text-underline-offset:3px;background:none}
.rf-zurueck:hover{color:var(--rouge)}
.msg-user{display:flex;justify-content:flex-end;margin:16px 0}
.msg-user span{background:var(--blase);color:var(--blase-txt);padding:12px 18px;border-radius:20px;font-size:15px;line-height:1.5;max-width:78%;text-align:left}
.msg-ulba{margin:8px 0 26px}
.eb-alt{opacity:.6}
.eb-intro{font-family:var(--serif);font-style:normal;font-size:19px;line-height:1.4;margin-bottom:14px;max-width:60ch}
.eb-filter{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:12px}
.ebf-lbl{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--hell);margin-right:4px}
.ebf-pill{display:inline-flex;align-items:center;gap:7px;background:var(--tinte);color:#fff;padding:6px 8px 6px 13px;border-radius:999px;font-size:13px}
.ebf-x{color:rgba(255,255,255,.6);font-size:15px;line-height:1;cursor:pointer}
.ebf-x:hover{color:#fff}
.eb-kopf{display:flex;align-items:baseline;gap:10px;margin:2px 0 12px}
.ebk-h{font-family:var(--serif);font-size:20px}
.ebk-s{font-family:var(--mono);font-size:11px;color:var(--hell)}
/* Chat-Wolke — abgeleiteter „Welt"-Kopf: Best-Fit groß, Nachbarn mittel, ferne ausgegraut */
.wolke{border:1px solid var(--linie);border-radius:14px;background:var(--nische);padding:14px 17px 12px;margin:2px 0 18px}
.wolke-read{font-size:15px;line-height:1.5;margin-bottom:11px}
.wolke-read b{font-weight:600;color:var(--rouge)}
.wolke-cloud{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cw{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--linie);border-radius:22px;background:#fff;padding:6px 12px 6px 8px;cursor:pointer;font-size:13px;color:#3a3a37;transition:.15s}
.cw:hover{border-color:var(--hell)}
.cw.best{font-weight:600;font-size:15px;padding:8px 16px 8px 9px;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.cw.an{border-color:var(--tinte);background:var(--tinte);color:#fff}
.cw.an .cw-dot{border-color:#fff}
.cw.an .cw-fit{color:#c9c9c9}
.cw-dot{width:15px;height:15px;border-radius:50%;border:1px solid rgba(0,0,0,.12);flex:none}
.cw.best .cw-dot{width:19px;height:19px}
.cw-fit{font-family:var(--mono);font-size:9px;color:var(--hell)}
.cw.far{opacity:.42;font-size:11px;padding:4px 10px 4px 7px}
.cw.far .cw-dot{width:11px;height:11px}
.wolke-foot{font-family:var(--mono);font-size:10px;color:var(--hell);margin-top:10px}
.eb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
/* Richtungs-Rail im Panel — Design-Codes als kompakte Chips, weiß/minimal */
.pn-dirs{display:flex;flex-wrap:wrap;gap:7px}
.pn-dir{display:flex;align-items:center;gap:7px;border:1px solid var(--linie);border-radius:20px;padding:5px 12px 5px 7px;background:#fff;cursor:pointer;font-size:13px;color:#3a3a37;transition:border-color .15s}
.pn-dir:hover{border-color:var(--hell)}
.pn-dir:disabled{opacity:.3;cursor:default;pointer-events:none}
.pn-dir.an{border-color:var(--tinte)}
.pn-dir .dot{width:15px;height:15px;border-radius:50%;border:1px solid rgba(0,0,0,.1);flex:none}
/* Look-Vorschau statt Farbkreis: man sieht die Richtung, bevor gerendert wird. */
.lv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;margin-top:2px}
.lv-karte{display:flex;flex-direction:column;align-items:center;gap:3px;border:1px solid var(--linie);border-radius:10px;padding:8px 5px 7px;background:#fff;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.lv-karte:hover{border-color:var(--hell)}
.lv-karte:disabled{opacity:.35;cursor:default;pointer-events:none}
.lv-karte{position:relative}
/* Selektion muss ohne Suchen erkennbar sein: der alte 1px-Randwechsel war
   praktisch unsichtbar — man klickte eine Welt an und sah es nicht. */
.lv-karte.an{border-color:var(--tinte);box-shadow:0 0 0 2px var(--tinte);background:#faf9f6}
.lv-karte.an .lv-buehne{background:linear-gradient(180deg,#fff,#f2f1ec)}
.lv-karte.an .lv-nm{font-weight:600;color:var(--tinte)}
.lv-haken{position:absolute;top:-7px;right:-7px;width:18px;height:18px;border-radius:50%;background:var(--tinte);color:#fff;font-size:11px;line-height:18px;text-align:center;font-family:var(--mono)}
.lv-buehne{display:flex;align-items:center;justify-content:center;height:56px;width:100%;background:linear-gradient(180deg,#fbfbfa,#f4f4f2);border-radius:6px}
.lv-svg{height:52px;width:auto;display:block}
.lv-autopunkt{width:26px;height:26px;border-radius:50%;background:conic-gradient(from 90deg,#e9455f,#3b6fd4,#2bb0a3,#e6d8a8,#e9455f)}
.lv-nm{font-size:11px;line-height:1.25;color:#3a3a37;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.lv-meta{font-family:var(--mono);font-size:9px;letter-spacing:.02em;color:var(--hell);text-align:center;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.pn-dir.auto .dot{background:conic-gradient(from 90deg,#e9455f,#3b6fd4,#2bb0a3,#e6d8a8,#e9455f)}
.eb-grid.schmal{grid-template-columns:repeat(4,minmax(0,1fr))}
.ek{position:relative;border:1px solid #E6E6E8;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(20,24,26,.04);overflow:hidden;transition:border-color .15s,transform .15s}
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
.ek.lead{border-color:var(--tinte)}
.ek-lead{position:absolute;top:10px;right:10px;font-family:var(--mono);font-size:8px;letter-spacing:.09em;text-transform:uppercase;color:#fff;background:var(--tinte);border-radius:7px;padding:4px 8px}
.favherz{position:absolute;top:9px;left:10px;z-index:3;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.9);border:1px solid var(--linie);font-size:13px;color:var(--hell);display:flex;align-items:center;justify-content:center}
.favherz:hover,.favherz.an{color:var(--rouge)}
.eb-mehr{display:block;margin:16px auto;border:1px solid var(--linie);border-radius:999px;padding:11px 26px;font-size:13.5px;color:var(--grau);background:var(--panel)}
.eb-mehr:hover{border-color:var(--tinte);color:var(--tinte)}
.eb-facetten{display:flex;flex-direction:column;gap:10px;margin-top:22px;padding-top:20px;border-top:1px solid var(--linie2)}
.facet{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.fc-lbl{font-family:var(--mono);font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--grau);width:92px;flex:none}
.fc-opt{padding:7px 14px;border-radius:999px;font-size:13px;color:var(--grau);border:1px solid var(--linie);background:var(--panel)}
.fc-opt:hover{border-color:var(--tinte);color:var(--tinte)}
.scan{width:100%;margin:10px 0 6px}
.scan-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:11px}
.scan-msg{font-family:var(--mono);font-size:11.5px;letter-spacing:.02em;color:var(--grau)}
.scan-pct{font-family:var(--mono);font-size:11.5px;font-weight:600;color:var(--tinte);font-variant-numeric:tabular-nums}
.scan-bar{height:3px;background:var(--linie);border-radius:999px;overflow:hidden}
.scan-fill{height:100%;background:var(--rouge);border-radius:999px;transition:width .17s ease}
.eb-scan{border:1px solid var(--linie);border-radius:13px;background:var(--panel);padding:15px 18px;max-width:560px;margin-bottom:8px}
.panel{border-left:1px solid var(--linie);background:var(--panel);display:flex;flex-direction:column;height:100%;min-height:0;overflow-y:auto}
/* Look-Turn: Render-Motor als Chat-Karte (gleiche pn-* Bausteine wie das Panel) */
/* LookTurn ist kein Kasten mehr, sondern ein Gespraechsverlauf im Thread:
   ulba links als Prosa, der Nutzer rechts als Blase, Bilder als Beitrag —
   alles in EINER Zeitachse (siehe strom). */
.lookturn{margin:6px 0 10px;display:flex;flex-direction:column}
.ch-lauf{max-width:720px}
.ch-teil{max-width:720px;display:flex;align-items:center;gap:16px;background:#fff;border:1px solid var(--linie);border-radius:18px;padding:16px 20px;margin-bottom:8px;box-shadow:0 1px 4px rgba(20,24,26,.04)}
.ch-teil img{width:66px;height:66px;object-fit:contain;background:var(--nische);border-radius:13px;border:1px solid var(--linie);flex:none;padding:5px}
.ch-teil-txt{display:flex;flex-direction:column;gap:2px;min-width:0}
.ch-teil-txt b{font-family:var(--serif);font-weight:800;font-size:19px;letter-spacing:-.015em}
.ch-teil-txt span{font-size:13px;color:var(--hell)}
.ch-hinweis{font-size:13px;color:var(--hell);margin:0 2px 20px}
/* Wolke mittig, Worte als echte Buttons — Auswahl wird im Chat angeheftet. */
.ch-wolke{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;max-width:560px;margin:2px auto 4px}
.ch-wort{font-size:14.5px;padding:10px 20px;border-radius:999px;border:1px solid #E2E2E5;background:#fff;color:#3a3a37;transition:.14s;box-shadow:0 1px 3px rgba(20,24,26,.05)}
.ch-wort:hover{border-color:var(--blase-txt);transform:translateY(-1px)}
.ch-wort.an{background:var(--blase);border-color:var(--blase);color:var(--blase-txt);font-weight:600}
.ch-wort.duenn{opacity:.4}
.ch-wolke-lbl{text-align:center;font-size:12.5px;color:var(--hell);margin:18px 0 10px}
.ch-hilfe-zeile{display:flex;justify-content:center;margin-top:14px}
/* Angeheftete Auswahl: sichtbar im Chat, reist mit der Antwort mit. */
.ch-pins{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px;margin:0 0 12px}
.ch-pin{display:inline-flex;align-items:center;gap:7px;background:var(--blase);color:var(--blase-txt);border-radius:999px;padding:7px 13px;font-size:13.5px}
.ch-pin button{color:var(--blase-txt);opacity:.55;font-size:15px;line-height:1}
.ch-pin button:hover{opacity:1}
.ch-zu{margin-left:auto;font-size:20px;color:var(--hell);background:none;flex:none}
.ch-zu:hover{color:var(--rouge)}
.ch-ulba{font-family:var(--serif);font-size:16px;line-height:1.55;color:var(--tinte);margin:0 0 16px;max-width:60ch}
.ch-frage-alt{margin-bottom:16px}
.ch-frage{margin-bottom:16px}
.ch-konzept b{font-family:var(--serif);font-weight:800;font-size:19px;letter-spacing:-.015em}
.ch-story{font-size:15px;color:var(--grau);margin-top:5px}
.ch-lauf{margin:2px 0 18px}
.ch-lauf .lauf-stage{margin-bottom:10px}
.ch-lade{display:flex;align-items:center;gap:10px;color:var(--grau);font-size:14.5px}
/* Denk-Indikator: drei Punkte, dann EINE fertige Antwort — nichts springt. */
.ch-denkt{display:inline-flex;gap:5px;align-items:center;height:22px;margin:0 0 16px 2px}
.ch-denkt i{width:7px;height:7px;border-radius:50%;background:var(--hell);animation:chDot 1.1s infinite ease-in-out}
.ch-denkt i:nth-child(2){animation-delay:.18s}.ch-denkt i:nth-child(3){animation-delay:.36s}
@keyframes chDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
/* Gesendete Nachricht: geklickte Worte als eigene Buttons, Freitext darunter. */
/* Gesendete Nachricht: Wolken-Worte und Freitext NEBENEINANDER, identisch
   gesetzt — eine Aussage aus mehreren Teilen, kein Etiketten-Stapel. */
.ch-msg{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin:0 0 16px}
.ch-teilm{background:var(--blase);color:var(--blase-txt);border-radius:20px;padding:12px 18px;font-size:15px;line-height:1.5;font-weight:400;max-width:78%}
.ch-ref{font-size:12.5px;color:var(--hell);margin:-8px 0 16px 2px;display:flex;gap:10px;flex-wrap:wrap}
.ch-ref-tr{opacity:.5}
.ch-ref b{color:var(--grau);font-weight:600}
/* Token-Feld: gewaehlte Worte leben im Eingabefeld, nicht im Chat. */
.refine .feld{flex-wrap:wrap;gap:6px;padding-left:12px}
.refine .feld input{min-width:180px;padding-left:8px}
.rf-chip{display:inline-flex;align-items:center;gap:6px;background:var(--blase);color:var(--blase-txt);border-radius:999px;padding:7px 8px 7px 13px;font-size:13.5px;font-weight:600;line-height:1}
.rf-chip button{color:var(--blase-txt);opacity:.5;font-size:15px;line-height:1;padding:0 2px}
.rf-chip button:hover{opacity:1}
.ch-meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:4px}
.lookturn .msg-user{margin:0 0 14px}
.lookturn .lauf-akt{display:flex;gap:8px;flex-wrap:wrap}
.lookturn .pn-kopf{padding-top:18px}
.lt-eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--hell);margin-bottom:4px}
.lookturn .pn-aktion{position:static;background:var(--panel);margin-top:4px}
.lookturn .cta:disabled{opacity:.45;cursor:default}
.lt-lesart{padding:6px 24px 10px;font-size:14.5px;line-height:1.5;color:#3a3a37}
.lt-lesart b{font-weight:600;color:var(--tinte)}
.lt-weil{color:var(--grau)}
.lt-alt{font-family:var(--mono);font-size:11px;color:var(--hell)}
.lt-just{display:flex;flex-direction:column;gap:8px;margin:2px 0 12px}
.lt-just-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.lt-just-lbl{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--hell);min-width:78px}
.lt-chip{font-size:12.5px;padding:5px 12px;border-radius:14px;border:1px solid var(--linie);background:#fff;color:#55554f;cursor:pointer;transition:.12s}
.lt-chip:hover{border-color:var(--hell)}
.lt-chip.an{background:var(--tinte);color:#fff;border-color:var(--tinte)}
.lt-brieftext{font-family:var(--mono);font-size:11px;color:var(--grau);margin-top:8px}
/* Behauptung — der Agentur-Screen vor dem Bild */
.lookturn .bh{margin-left:0;margin-right:0}
.behaupt{margin:2px 24px 16px;border:1px solid var(--linie);border-radius:var(--r);background:#FFFFFF;padding:22px 24px 20px}
.bh-eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--rouge)}
.bh-titel{font-family:var(--serif);font-weight:800;font-size:29px;line-height:1.05;letter-spacing:-.015em;color:var(--tinte);margin-top:7px}
.bh-story{font-family:var(--serif);font-size:16px;line-height:1.45;color:var(--grau);margin-top:9px;max-width:52ch}
.bh-weil{display:flex;gap:11px;margin-top:17px;padding-top:15px;border-top:1px solid var(--linie2)}
.bh-weil-lbl{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--hell);padding-top:3px;flex:none}
.bh-weil-txt{font-size:14px;line-height:1.55;color:var(--grau);max-width:56ch}
.bh-weil-txt b{font-weight:600;color:var(--tinte)}
.bh-code{font-size:12.5px;color:var(--hell);margin-top:9px}
.bh-code b{color:var(--grau);font-weight:600}
.bh-stufe{margin-top:6px;padding-left:9px;border-left:2px solid var(--linie);color:var(--hell);line-height:1.5}
.bh-hinweis{font-size:13px;line-height:1.5;color:var(--grau);margin-top:14px;padding:11px 14px;background:var(--nische);border-radius:10px;border-left:2px solid var(--rouge)}
.bh-hinweis b{font-weight:600;color:var(--tinte)}
.bh-pal{display:flex;align-items:center;gap:7px;margin-top:16px}
.bh-sw{width:30px;height:30px;border-radius:8px;border:1px solid rgba(0,0,0,.07)}
.bh-pal-nm{font-family:var(--mono);font-size:10.5px;letter-spacing:.05em;color:var(--hell);margin-left:5px}
.bh-cta{margin-top:20px;background:var(--tinte);color:#fff;border-radius:999px;padding:14px 30px;font-size:15px}
.bh-cta:hover{background:var(--rouge)} .bh-cta:disabled{opacity:.5;cursor:default}
.lt-abl{display:flex;justify-content:center;margin:0 24px 14px}
.lt-abl button{border:1px solid var(--linie);border-radius:999px;padding:8px 18px;font-size:12.5px;color:var(--grau);background:#fff}
.lt-abl button:hover{border-color:var(--tinte);color:var(--tinte)}
/* Verlauf — jeder Render mit seinen Worten, persistiert im Commit */
.lt-verlauf{margin:12px 24px 0;padding:12px 16px;background:var(--nische);border-radius:10px}
.lv-lbl{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--hell);margin-bottom:7px}
.lv-zeile{font-size:12.5px;line-height:1.6;color:var(--grau)}
.lv-zeile b{font-weight:600;color:var(--tinte)}
/* Lauf (v12) — eingefrorene Ableitung: Worte → Richtung → Bild */
.lauf{margin:10px 24px 4px;padding:14px 0 10px;border-top:1px solid var(--linie2)}
.lauf:first-of-type{border-top:none}
.lauf-worte{display:inline-block;background:var(--blase);color:var(--blase-txt);padding:8px 15px;border-radius:18px;font-size:13.5px;margin-bottom:9px}
.lauf-kopf{font-size:14.5px;margin-bottom:8px}
.lauf-kopf b{font-family:var(--serif);font-weight:800;font-size:17px;letter-spacing:-.01em}
.lauf-ident{font-family:var(--mono);font-size:11px;color:var(--grau)}
.lauf-stage{display:flex;flex-direction:column;align-items:center;background:linear-gradient(#FFFFFF 62%,#FAFAFB 100%);border:1px solid var(--linie);border-radius:12px;padding:14px 10px 18px}
.lauf-cap{width:64px;max-height:120px;object-fit:contain;object-position:bottom;display:block;margin-bottom:-4px}
.lauf-hero{max-width:78%;max-height:400px;object-fit:contain;display:block}
.lauf-alt{opacity:.72}
.lauf-alt .lauf-hero{max-height:220px}
.lauf-alt .lauf-cap{width:40px;max-height:70px}
.lauf-akt{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:10px}
.lauf-btn{font-size:12px;padding:5px 11px;border-radius:14px;border:1px solid var(--linie);background:#fff;color:#55554f}
/* ── Das Board (Referenz-Runde als Bild) ────────────────────────── */
.bd{margin:6px 0 10px}
.bd-lade{font-size:13px;color:var(--hell);text-align:center;padding:14px 0}
.bd-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
.bd-k{display:flex;flex-direction:column;gap:5px;padding:5px;border:1px solid var(--linie);border-radius:10px;background:#fff;text-align:left;min-width:0}
.bd-k img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;background:#F4F3EE;display:block}
.bd-k-leer{width:100%;aspect-ratio:1;border-radius:6px;background:#F4F3EE;display:block}
.bd-k-nm{font-size:11px;color:var(--grau);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bd-k-mark{font-size:10px;line-height:1.2;font-weight:600}
.bd-ja{border:2px solid #4B7A52;padding:4px}
.bd-ja .bd-k-mark{color:#4B7A52}
.bd-nein{border:2px dashed var(--rouge);padding:4px;opacity:.72}
.bd-nein img{filter:grayscale(1)}
.bd-nein .bd-k-mark{color:var(--rouge)}
.bd-lgd{font-size:11px;color:var(--hell);text-align:center;margin-top:8px}
@media(max-width:560px){.bd-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
/* ── Die Karte ──────────────────────────────────────────────────── */
.kt{margin-top:12px;border:1px solid var(--linie);border-radius:12px;background:#fff;overflow:hidden}
.kt-welten{display:flex;gap:6px;padding:4px 10px 12px;align-items:stretch;overflow-x:auto}
.kt-welt{flex:0 0 60px;border:1px solid var(--linie);border-radius:9px;padding:7px 5px;background:#fff;min-width:0}
.kt-welt-aktiv{flex:1 1 300px;border:2px solid var(--tinte);padding:9px 10px}
.kt-welt-leer{border-style:dashed;background:transparent}
.kt-welt-kopf{display:flex;justify-content:space-between;align-items:baseline;gap:6px;margin-bottom:6px;flex-wrap:wrap}
.kt-welt-nm{font-size:10.5px;color:var(--grau);line-height:1.2;word-break:break-word}
.kt-welt-aktiv .kt-welt-nm{font-size:13px;color:var(--tinte);font-weight:600}
.kt-welt-n{font-size:10px;color:var(--hell)}
.kt-grid{display:grid;grid-template-columns:1fr;gap:4px}
.kt-grid-aktiv{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.kt-k{border-radius:6px;padding:2px;min-width:0}
.kt-k img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;background:#F4F3EE;display:block}
.kt-k-leer{width:100%;aspect-ratio:1;border-radius:4px;background:#F4F3EE}
.kt-k-dir{outline:2px solid var(--tinte);outline-offset:1px}
.kt-k-komp{outline:2px solid #7A8F6B;outline-offset:1px}
.kt-k-anti{outline:2px dashed var(--rouge);outline-offset:1px}
.kt-k-vw{outline:2px dashed var(--hell);outline-offset:1px}
.kt-k-t{margin-top:4px;font-size:10.5px;line-height:1.25;color:var(--grau);display:flex;flex-direction:column}
.kt-k-t b{color:var(--tinte);font-weight:600}
.kt-k-t em{font-style:normal;color:var(--hell);font-size:10px}
.kt-k-klick{background:transparent;border:0;padding:2px;text-align:left;width:100%}
.kt-k-klick:hover .kt-k-t em{color:var(--tinte)}
.kt-laut{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:10.5px;color:var(--hell)}
.kt-laut-bar{flex:1;height:2px;background:var(--linie);position:relative}
.kt-laut-pt{position:absolute;top:-4px;width:10px;height:10px;border-radius:50%;background:var(--tinte);transform:translateX(-50%)}
/* ── Herleitung (die Leiter) ──────────────────────────────────────── */
.hl{margin-top:12px;border:1px solid var(--linie);border-radius:12px;background:#fff;overflow:hidden}
.hl-kopf{display:flex;align-items:center;gap:9px;width:100%;padding:10px 13px;background:#fff;border:0;text-align:left}
.hl-kopf-lbl{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--tinte)}
.hl-kopf-n{font-size:11.5px;color:var(--hell);flex:1}
.hl-kopf-pf{font-size:12px;color:var(--hell)}
.hl-body{padding:2px 13px 13px}
.hl-z,.hl-farb,.hl-vw{padding:9px 0;border-top:1px solid var(--linie2)}
.hl-typ{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--hell);margin-bottom:4px}
.hl-mitte{display:flex;flex-wrap:wrap;align-items:baseline;gap:7px;font-size:13.5px;line-height:1.45}
.hl-bed{color:var(--tinte);font-weight:600}
.hl-pf{color:var(--hell)}
.hl-form{color:var(--tinte)}
.hl-weil{font-size:12.5px;line-height:1.5;color:var(--grau);margin-top:3px;max-width:60ch}
.fs-zeile{display:flex;gap:12px;align-items:baseline;padding:7px 0;border-top:1px solid var(--linie2)}
.fs-zeile .fs-cap{flex:none;min-width:150px}
.fs-val{font-size:13px;line-height:1.5;color:var(--tinte)}
.hl-mehr{font-size:12px;padding:6px 0 2px;background:transparent;border:0;color:var(--hell);text-align:left}
.hl-rollen{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:2px}
.hl-rolle{display:flex;align-items:center;gap:6px}
.hl-laut{font-style:italic}
.hl-sw{width:18px;height:18px;border-radius:5px;border:1px solid rgba(0,0,0,.08);flex:none}
.hl-rolle-t{font-size:12.5px;color:var(--grau)}
.hl-rolle-t b{color:var(--tinte);font-weight:600}
.hl-warn{font-size:12px;line-height:1.45;color:var(--rouge);margin-top:6px;padding-left:9px;border-left:2px solid var(--rouge)}
.hl-vw-t{font-size:13px;line-height:1.5;color:var(--grau);max-width:60ch}
.hl-vw-t b{color:var(--tinte);font-weight:600}
/* ── Justierung: benannte Vorschläge mit Konsequenz, nie anonyme Knöpfe ── */
.just{margin-top:12px;display:flex;flex-direction:column;gap:7px}
.just-lbl{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--hell)}
.just-v{display:flex;gap:10px;align-items:flex-start;text-align:left;width:100%;padding:10px 13px;border:1px solid var(--linie);border-radius:11px;background:#fff}
.just-v:hover:not(:disabled){border-color:var(--tinte)}
.just-v:disabled{opacity:.45;cursor:default}
.just-v-t{font-size:13.5px;color:var(--tinte);font-weight:600;flex:none}
.just-v-k{font-size:12.5px;color:var(--grau);line-height:1.45}
.just-mehr{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.just-mehr-btn{font-size:12px;padding:4px 10px;border-radius:13px;border:1px dashed var(--linie);background:transparent;color:var(--hell)}
/* Farbort gehört ans Bild — es ist keine Richtungsänderung, sondern der Träger. */
.stage-chips{display:flex;gap:6px;justify-content:center;margin-top:9px;flex-wrap:wrap}
.stage-chip{font-size:11.5px;padding:4px 10px;border-radius:13px;border:1px solid var(--linie);background:rgba(255,255,255,.9);color:#55554f}
/* Ältere Läufe: eingeklappt auf Name + Claim. */
.lauf-zu{display:flex;align-items:baseline;gap:9px;width:100%;text-align:left;padding:10px 13px;border:1px solid var(--linie);border-radius:11px;background:#fff;margin-bottom:8px}
.lauf-zu b{font-size:14px;color:var(--tinte)}
.lauf-zu span{font-size:12.5px;color:var(--hell);flex:1}
.lauf-btn:hover{border-color:var(--hell)} .lauf-btn:disabled{opacity:.4;cursor:default}
.lauf-cta{margin-left:auto;background:var(--tinte);color:#fff;border-radius:999px;padding:8px 18px;font-size:13px}
.lauf-cta:hover{background:var(--rouge)} .lauf-cta:disabled{opacity:.5;cursor:default}
.lauf-details{margin-top:10px}
.lauf-story{font-family:var(--serif);font-size:14.5px;line-height:1.45;color:var(--grau);padding:0 2px 8px}
.lauf-lade{display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;color:var(--grau);border-top:none;padding:16px 0}
/* Atmende Wolke (v13) — Anker groß mit Luft, Nachbarschaften darunter */
.bw{margin:4px 0 14px}
.bw-anker-wolke{display:flex;flex-wrap:wrap;gap:10px 12px;padding:6px 2px}
.bw-anker{font-size:15px;padding:9px 18px;border-radius:22px;border:1px solid var(--linie);background:#fff;color:#3a3a37;transition:.15s;line-height:1}
.bw-anker:hover{border-color:var(--hell);transform:translateY(-1px)}
.bw-anker.an{background:var(--tinte);color:#fff;border-color:var(--tinte)}
.bw-anker.offen{box-shadow:0 0 0 2px var(--linie)}
.bw-anker.an.offen{box-shadow:0 0 0 2px var(--hell)}
.bw-kinder{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:10px 2px 2px;padding:10px 12px;background:#fff;border:1px dashed var(--linie);border-radius:12px;animation:bwAuf .18s ease}
@keyframes bwAuf{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.bw-kinder-pfeil{font-family:var(--mono);font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--hell);margin-right:4px}
.bw-lesart{font-family:var(--serif);font-size:15px;line-height:1.45;color:var(--grau);margin:12px 2px 12px;padding-left:12px;border-left:2px solid var(--rouge)}
.bw-lesart b{font-weight:600;color:var(--tinte)}
.bw-konflikt{font-size:12.5px;line-height:1.5;color:#9a6b1f;background:#FDF6E7;border:1px solid #F0E0BC;border-radius:9px;padding:8px 12px;margin:0 2px 12px}
.bw-anker.duenn,.lt-chip.duenn{opacity:.42}
.bw-anker.duenn:hover,.lt-chip.duenn:hover{opacity:.75}
/* Geführtes Briefing (v15) — ein Gespräch, kein Formular. Die Frage ist der
   Held: Serif, gross, Tinte. Die Wolke liegt hinter einem leisen Link — wer
   fluessig erzaehlt, sieht sie nie. Der Spiegel ist eine Zeile, kein Raster. */
.gf-eroeffnung{font-family:var(--serif);font-size:16.5px;line-height:1.5;color:var(--grau);margin:2px 2px 22px;padding-left:14px;border-left:2px solid var(--tinte);max-width:62ch}
.gf-zug{margin:0 2px 20px;padding-left:14px;border-left:2px solid var(--linie);max-width:64ch}
.gf-zug-frage{font-size:13px;color:var(--hell);margin-bottom:6px}
.gf-zug-antwort{font-family:var(--serif);font-size:15px;color:var(--grau);margin-bottom:8px}
.gf-zug-lesart{font-family:var(--serif);font-size:16px;line-height:1.55;color:var(--tinte)}
.gf-zug-weil{color:inherit}
.gf-aktiv{margin:26px 2px 4px;max-width:64ch}
.gf-frage{font-family:var(--serif);font-size:21px;line-height:1.35;letter-spacing:-.012em;color:var(--tinte);margin-bottom:14px;max-width:36ch}
.gf-feld{display:flex;gap:10px;align-items:flex-end}
.gf-feld textarea{flex:1;background:var(--panel);border:1px solid var(--linie);border-radius:14px;padding:13px 15px;font:inherit;font-size:15px;line-height:1.5;outline:none;resize:none}
.gf-feld textarea:focus{border-color:var(--hell)}
.gf-feld textarea::placeholder{color:var(--hell)}
.gf-senden{background:var(--tinte);color:#fff;border-radius:999px;padding:13px 22px;font-size:14px;white-space:nowrap}
.gf-senden:hover{background:var(--rouge)}
.gf-senden:disabled{opacity:.32;cursor:default}
.gf-unten{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:11px;min-height:20px}
.gf-gelesen{font-size:13.5px;color:var(--grau)}
.gf-gelesen b{color:var(--tinte);font-weight:600}
.gf-hilfe-btn{font-size:13px;color:var(--hell);text-decoration:underline;text-underline-offset:3px;background:none}
.gf-hilfe-btn:hover{color:var(--rouge)}
.gf-hilfe{margin-top:14px;padding:14px 16px;border:1px dashed var(--linie);border-radius:13px;animation:bwAuf .18s ease}
.gf-hilfe-lbl{font-size:12.5px;color:var(--hell);margin-bottom:10px}
.gf-ab{display:flex;align-items:center;gap:13px;flex-wrap:wrap;margin-top:22px;padding-top:17px;border-top:1px solid var(--linie2)}
.gf-ab-cta{background:var(--tinte);color:#fff;border-radius:999px;padding:13px 24px;font-size:15px}
.gf-ab-cta:hover{background:var(--rouge)}
.gf-ab-cta:disabled{opacity:.28;cursor:default}
.gf-ab-grund{font-size:13.5px;color:var(--grau)}
.msg-commit{margin-top:18px}
.msg-commit .msg-user{margin-bottom:8px}
.pn-kopf{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 24px 12px}
.pn-kopf h3{font-family:var(--serif);font-size:24px}
.pn-spec{font-family:var(--mono);font-size:11.5px;color:var(--grau)}
.pn-akt{display:flex;gap:10px}
.pn-zu{font-size:22px;color:var(--hell)} .pn-zu:hover{color:var(--rouge)}
.pn-bild{margin:0 24px;height:min(56vh,560px);min-height:400px;border:1px solid var(--linie);border-radius:var(--r);background:linear-gradient(#FFFFFF 62%,#FAFAFB 100%);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
.pn-bild.im-frame{border-radius:0;border-top:none;border-bottom:none}
.pn-bild::after{content:'';position:absolute;left:12%;right:12%;bottom:10px;height:22px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(29,29,27,.10),transparent 70%);filter:blur(2px)}
.pn-bild > img{max-width:82%;max-height:88%;object-fit:contain;position:relative;z-index:1}
.pn-body{padding:16px 24px 0}

/* ── Style-Frame: Headline ────────────────────────────────────────── */
.frame-head{margin:0 24px;padding:16px 20px 14px;border:1px solid var(--linie);border-bottom:none;border-radius:var(--r) var(--r) 0 0;background:#FFFFFF}
.fh-eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--rouge)}
.fh-title{font-family:var(--serif);font-weight:800;font-size:27px;line-height:1.05;letter-spacing:-.015em;color:var(--tinte);margin-top:6px}
.fh-sub{font-family:var(--serif);font-size:15px;line-height:1.4;color:var(--grau);margin-top:6px;max-width:52ch}

/* ── Style-Frame: SpecSheet-Footer ────────────────────────────────── */
.frame-spec{margin:0 24px 4px;border:1px solid var(--linie);border-top:none;border-radius:0 0 var(--r) var(--r);background:#FFFFFF;padding:0 20px 18px}
.fs-label{text-align:center;padding:18px 0 16px;border-bottom:1px solid var(--linie2)}
.fsl-mark{font-family:var(--serif);font-weight:800;font-size:30px;letter-spacing:.03em;color:var(--tinte);line-height:1}
.fsl-kat{font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--grau);margin-top:7px}
.fsl-hint{font-size:11px;color:var(--hell);margin-top:8px;font-style:italic}
.fs-grid{display:grid;grid-template-columns:1fr 1fr;gap:26px;padding:18px 0 4px}
@media(max-width:1180px){.fs-grid{grid-template-columns:1fr;gap:18px}}
.fs-cap{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--hell);margin-bottom:12px}
.fs-chips{display:flex;gap:16px;flex-wrap:wrap}
.fs-chip{display:flex;flex-direction:column;align-items:center;gap:5px}
.fsc-sw{width:44px;height:44px;border-radius:9px;border:1px solid rgba(0,0,0,.06);box-shadow:0 1px 3px rgba(0,0,0,.06)}
.fsc-hex{font-family:var(--mono);font-size:10px;color:var(--tinte);text-transform:uppercase}
.fsc-pan{font-family:var(--mono);font-size:9px;color:var(--hell)}
/* Emotions-Balken */
.ebars{display:flex;flex-direction:column;gap:9px}
.ebar{display:grid;grid-template-columns:64px 1fr 16px;align-items:center;gap:10px}
.eb-lbl{font-size:11px;color:var(--grau);text-align:right}
.eb-track{position:relative;height:6px;border-radius:6px;background:var(--linie2);overflow:visible}
.eb-fill{position:absolute;left:0;top:0;height:100%;border-radius:6px;background:linear-gradient(90deg,#7a2233,var(--rouge));width:0;transition:width .9s cubic-bezier(.22,1,.36,1)}
.eb-dot{position:absolute;right:-3px;top:50%;width:8px;height:8px;border-radius:50%;background:var(--rouge);transform:translateY(-50%) scale(0);transition:transform .3s ease .3s;box-shadow:0 0 0 3px rgba(76,20,32,.12)}
.ebar:hover .eb-dot{transform:translateY(-50%) scale(1)}
.eb-val{font-family:var(--mono);font-size:11px;color:var(--tinte);text-align:center}
.fs-tags{font-size:12px;color:var(--grau);margin-top:12px;font-style:italic}
.fs-why{font-size:13px;line-height:1.5;color:var(--grau);margin-top:16px;padding-top:14px;border-top:1px solid var(--linie2);padding-left:13px;border-left:2px solid var(--rouge)}
.vis{background:var(--nische);border-radius:var(--r);padding:16px 18px;margin:18px 0}
.vis .top{font-family:var(--mono);font-size:11px;color:var(--hell);letter-spacing:.04em;text-transform:uppercase;margin-bottom:10px}
.vis .row{display:flex;gap:8px}
.vis input{flex:1;background:var(--panel);border:1px solid var(--linie);border-radius:11px;padding:11px 13px;font-size:14px;outline:none}
.vis .gen{background:var(--tinte);color:#fff;border-radius:999px;padding:11px 20px;font-size:13px;white-space:nowrap}
.vis .gen:hover{background:var(--rouge)} .vis .gen:disabled{opacity:.5;cursor:default}
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
.pn-cap-gross .buehne{height:128px;background:#FFFFFF;border:1px solid var(--linie);border-radius:var(--r);display:flex;align-items:center;justify-content:center;overflow:hidden}
.pn-cap-gross .buehne img{max-width:70%;max-height:86%;object-fit:contain}
.pn-cap-gross .ph{font-size:34px;color:#d8d8d6}
.capthumb{flex:none;width:82px;height:82px;border-radius:12px;border:1px solid var(--linie);background:#FFFFFF;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:0}
.capthumb.an{border-color:var(--tinte);box-shadow:inset 0 0 0 1px var(--tinte)}
.capthumb img{max-width:100%;max-height:100%;object-fit:contain;padding:4px}
.pn-aktion{position:sticky;bottom:0;display:flex;gap:9px;padding:16px 24px;background:linear-gradient(to top,var(--panel) 72%,transparent);margin-top:auto}
.pn-aktion .cta{flex:1;background:var(--tinte);color:#fff;padding:14px;border-radius:999px;font-size:15px}
.pn-aktion .cta:hover{background:var(--rouge)}
.pn-aktion .cta-sek{border:1px solid var(--linie);border-radius:999px;padding:14px 18px;font-size:14px;color:var(--grau);background:var(--panel)}
.pn-aktion .cta-sek.an{border-color:var(--rouge);color:var(--rouge)}
.bereich{padding:32px clamp(16px,4vw,54px) 60px}
.ber-kopf{margin-bottom:24px}
.ber-kopf h2{font-family:var(--serif);font-size:32px;letter-spacing:-.015em;margin-bottom:8px}
.ber-kopf p{color:var(--grau);max-width:52ch}
.leer{color:var(--hell);font-size:14px;padding:44px;text-align:center;border:1px dashed var(--linie);border-radius:var(--r)}
.leer .gr{font-family:var(--serif);font-style:normal;font-size:20px;color:var(--tinte);margin-bottom:6px}
.lin-kopf{display:flex;align-items:center;gap:20px;border:1px solid var(--linie);border-radius:var(--r);background:var(--panel);padding:16px 20px}
.lin-kopf .lk-reihe{display:flex;gap:12px;background:transparent;padding:0;min-height:0;flex:none}
.lin-kopf .lk-reihe img{max-height:56px}
.lk-reihe{display:flex;gap:12px;justify-content:center;background:var(--nische);padding:20px;min-height:110px;align-items:center}
.lk-reihe img{max-height:80px;object-fit:contain}
.lk-info{padding:14px 16px}
.lk-t{display:block;font-family:var(--serif);font-size:18px}
.lk-s{display:block;font-family:var(--mono);font-size:11px;color:var(--hell);margin-top:3px}
.modal-bg{position:fixed;inset:0;background:rgba(20,24,26,.35);z-index:100}
.modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;z-index:101;border-radius:22px;box-shadow:0 24px 60px rgba(20,24,26,.18);width:480px;max-width:calc(100vw - 48px);padding:36px;max-height:calc(100vh - 48px);overflow-y:auto}
.mfield{width:100%;background:var(--nische);border:0;border-radius:11px;padding:12px 15px;font-size:14px;outline:none}
.mfield::placeholder{color:var(--hell)}
.mlbl{font-family:var(--mono);font-size:11px;color:var(--hell);letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px}
.mwunsch{display:flex;gap:12px;align-items:center;background:var(--nische);border-radius:12px;padding:10px 12px;margin-bottom:14px}
.mwunsch img{width:52px;height:52px;object-fit:contain;background:#fff;border-radius:9px;border:1px solid var(--linie);flex:none}
.mwunsch .t{font-family:var(--mono);font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--hell);margin-bottom:2px}
.mwunsch .v{font-size:13px;color:var(--grau);line-height:1.4}
@media(max-width:820px){
  .ulba{grid-template-columns:1fr}
  .nav{position:fixed;left:0;top:0;bottom:0;width:347px;max-width:88vw;z-index:60;transform:translateX(-100%);transition:transform .25s;box-shadow:0 0 40px -10px rgba(0,0,0,.2);background:var(--flaeche)}
  .nav.offen{transform:none}
  .chat.split{grid-template-columns:1fr}
  .chat.split .cs-main{display:none}
}
@media(prefers-reduced-motion:reduce){.ulba *{transition:none!important}}
.nav-marke,.ebk-h,.pn-kopf h3,.ber-kopf h2,.lk-t{font-weight:800;letter-spacing:-.015em}
.ebk-h,.pn-kopf h3,.lk-t{letter-spacing:-.01em}
.eb-intro{color:var(--grau);font-weight:400}
.pgrund{font-weight:400}
.leer .gr{font-weight:700}
.mono,.nav-lbl,.ebf-lbl,.fc-lbl,.em-l,.pn-caps-top .lbl,.pn-cap-gross .lbl,.vis .top,.mlbl,.topbar .spur,.mwunsch .t,.varstrip .lbl{font-weight:600}
.varstrip{margin:14px 24px 4px}
.varstrip .lbl{font-family:var(--mono);font-size:10.5px;color:var(--hell);letter-spacing:.04em;text-transform:uppercase;margin-bottom:9px}
.varstrip .thumbs{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
.varthumb{position:relative;flex:none;width:74px;height:74px;border-radius:12px;border:1px solid var(--linie);background:#FFFFFF;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:0}
.varthumb.an{border-color:var(--tinte);box-shadow:inset 0 0 0 1px var(--tinte)}
.varthumb img{max-width:100%;max-height:100%;object-fit:contain;padding:7px}
.varthumb .ph{font-size:26px;color:#d8d8d6}
.vt-tag{position:absolute;bottom:0;left:0;right:0;font-family:var(--mono);font-size:8.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--hell);background:rgba(255,255,255,.86);padding:2px 0;text-align:center}
.anfr-liste{display:flex;flex-direction:column;gap:10px}
.anfr-row{display:flex;align-items:center;gap:16px;border:1px solid var(--linie);border-radius:var(--r);background:var(--panel);padding:12px 16px}
.anfr-bild{flex:none;width:56px;height:56px;border-radius:10px;border:1px solid var(--linie);background:#FFFFFF;display:flex;align-items:center;justify-content:center;overflow:hidden}
.anfr-bild img{max-width:100%;max-height:100%;object-fit:contain;padding:6px}
.anfr-bild .ph{font-size:24px;color:#d8d8d6}
.anfr-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.anfr-t{font-family:var(--serif);font-weight:800;font-size:16px;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.anfr-s{font-family:var(--mono);font-size:11px;color:var(--hell)}
.anfr-status{flex:none;font-family:var(--mono);font-size:11px;letter-spacing:.04em;text-transform:uppercase;padding:5px 11px;border-radius:999px;border:1px solid var(--linie);color:var(--grau)}
.anfr-status.s-neu{background:#FFF7E6;color:#8a6d00;border-color:#F2E2B8}
.anfr-status.s-weitergeleitet{background:#EAF2FF;color:#1a4b8a;border-color:#C9DEF9}
.anfr-status.s-erledigt{background:#EAF7EE;color:#1a6b34;border-color:#C4E7CE}
.anfr-status.s-abgebrochen{background:#FDECEC;color:#9a2323;border-color:#F5C9C9}
/* ── v45 — Die Design-Wand + Look im Panel ── */
.pn-look{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 24px 0}
.pn-look-btn{border:1px solid var(--linie);border-radius:999px;padding:11px 20px;font-size:14px;background:var(--panel);transition:border-color .15s}
.pn-look-btn:hover{border-color:var(--tinte)}
.pn-look-jetzt{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--grau)}
.pn-look-jetzt i{width:13px;height:13px;border-radius:50%;border:1px solid rgba(0,0,0,.1);display:block}
.pn-look-fehler{font-size:12.5px;color:#dc2626}
.pn-waechter{margin:12px 24px 0;background:var(--nische);border-radius:12px;padding:12px 15px;display:flex;flex-direction:column;gap:5px}
.pn-waechter b{font-family:var(--serif);font-weight:800;font-size:16px;letter-spacing:-.015em}
.pn-waechter span{font-size:13px;line-height:1.5;color:var(--grau)}
.pn-waechter .pn-w-warn{font-size:12.5px;line-height:1.5;color:#9a6b1f}
.pn-waechter .pn-w-prod{font-family:var(--mono);font-size:11px;letter-spacing:.03em;color:var(--hell)}

.lp-box{position:relative;background:var(--panel);border-radius:20px;width:100%;max-width:1040px;max-height:92vh;overflow:hidden;box-shadow:0 24px 70px rgba(20,24,26,.28);display:flex}
.lp-scroll{flex:1;overflow-y:auto;min-height:0}
.lp-zu{position:absolute;top:14px;right:14px;z-index:3;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 1px 4px rgba(0,0,0,.12);font-size:20px;line-height:1;color:var(--grau)}
.lp-zu:hover{color:var(--rouge)}
.lp-titel{height:150px;background:linear-gradient(135deg,#F3F1EE,#ECEDEF);overflow:hidden;position:relative}
.lp-titel-img{width:100%;height:100%;object-fit:cover;display:block}
.lp-titel-reihe{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:flex-end;gap:18px;padding:0 70px 0 40%;opacity:.38;filter:grayscale(1)}
.lp-titel-reihe img{height:118px;width:auto;object-fit:contain;mix-blend-mode:multiply}
.lp-kopf{display:flex;align-items:flex-end;gap:18px;padding:0 30px;margin-top:-44px;position:relative}
.lp-logo{width:96px;height:96px;flex:none;border-radius:18px;background:#fff;border:4px solid #fff;box-shadow:0 2px 10px rgba(20,24,26,.1);display:flex;align-items:center;justify-content:center;overflow:hidden}
.lp-logo img{max-width:82%;max-height:82%;object-fit:contain}
.lp-logo span{font-family:var(--serif);font-weight:800;font-size:30px;color:var(--rouge)}
.lp-id{flex:1;min-width:0;padding-bottom:2px}
.lp-id h3{font-size:26px;margin:0;line-height:1.15;display:flex;align-items:center;gap:8px}
.lp-check{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--tinte);color:#fff;font-size:11px;font-family:var(--sans)}
.lp-meta{display:block;font-size:14px;color:var(--grau);margin-top:4px}
.lp-quelle{display:block;font-family:var(--mono);font-size:10.5px;letter-spacing:.04em;color:var(--hell);margin-top:3px}
.lp-web{flex:none;border:1px solid var(--tinte);border-radius:999px;padding:8px 16px;font-size:13px;color:var(--tinte);text-decoration:none;margin-bottom:4px}
.lp-web:hover{background:var(--tinte);color:#fff}
.lp-info{margin:22px 30px 0;display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start}
.lp-ueber{font-size:14px;line-height:1.65;color:var(--grau);margin:0;max-width:62ch}
.lp-fakten{display:grid;grid-template-columns:repeat(2,minmax(130px,auto));gap:8px}
.lp-fakten div{background:var(--nische);border-radius:11px;padding:10px 13px}
.lp-fakten span{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--hell)}
.lp-fakten b{display:block;font-size:13.5px;font-weight:600;margin-top:2px}
.lp-reiter{position:sticky;top:0;z-index:2;background:var(--panel);display:flex;gap:4px;padding:0 30px;margin-top:24px;border-bottom:1px solid var(--linie);overflow-x:auto}
.lp-reiter button{padding:13px 12px 11px;font-size:14px;color:var(--grau);border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}
.lp-reiter button:hover{color:var(--tinte)}
.lp-reiter button.an{color:var(--tinte);border-bottom-color:var(--tinte);font-weight:600}
.lp-reiter i{font-style:normal;font-family:var(--mono);font-size:11px;color:var(--hell);margin-left:6px}
.lp-sortiment{padding:20px 30px 30px}
.lp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:12px}
.lp-grid .ek-klick:disabled{cursor:default}
.lp-skel{height:212px;border-radius:12px;background:linear-gradient(90deg,var(--nische) 25%,#EFEFF1 50%,var(--nische) 75%);background-size:200% 100%;animation:lpskel 1.2s ease-in-out infinite}
@keyframes lpskel{to{background-position:-200% 0}}
.lp-leer{padding:34px 0;color:var(--grau);font-size:14px}
@media (max-width:720px){
.lp-titel{height:104px}.lp-titel-reihe{padding-left:30%}.lp-titel-reihe img{height:84px}
.lp-kopf{flex-wrap:wrap;padding:0 18px;margin-top:-36px;gap:12px}.lp-logo{width:76px;height:76px;border-radius:15px}
.lp-id{flex-basis:100%}.lp-id h3{font-size:22px}.lp-web{margin-bottom:0}
.lp-info{grid-template-columns:1fr;margin:18px 18px 0}.lp-reiter{padding:0 18px}.lp-sortiment{padding:16px 18px 24px}
.lp-grid{grid-template-columns:repeat(2,1fr);gap:10px}}
.dw-ov{position:fixed;inset:0;background:rgba(20,24,26,.42);z-index:60;display:flex;align-items:center;justify-content:center;padding:clamp(12px,3vw,36px)}
.dw-box{background:var(--panel);border-radius:20px;width:100%;max-width:1180px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 70px rgba(20,24,26,.28)}
.dw-kopf{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:22px 26px 14px;flex:none}
.dw-kopf h3{font-size:23px;margin:0}
.dw-sub{display:block;font-size:13px;color:var(--hell);margin-top:3px}
.dw-filter{flex:none;padding:0 26px 14px;border-bottom:1px solid var(--linie);display:flex;flex-direction:column;gap:9px}
.dw-suche input{width:100%;max-width:360px;border:1px solid var(--linie);border-radius:11px;background:#fff;padding:9px 14px;font-size:13.5px;outline:none}
.dw-suche input:focus{border-color:var(--hell)}
.dw-suche input::placeholder{color:var(--hell)}
.dw-dim{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.dw-dim-lbl{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--grau);width:86px;flex:none}
.dw-dim-opt{display:flex;gap:6px;flex-wrap:wrap;flex:1}
.dw-pill{padding:6px 13px;border-radius:999px;font-size:12.5px;color:var(--grau);border:1px solid var(--linie);background:var(--panel);transition:.14s}
.dw-pill:hover{border-color:var(--tinte);color:var(--tinte)}
.dw-pill.an{background:var(--blase);border-color:var(--blase);color:var(--blase-txt);font-weight:600}
.dw-reset{align-self:flex-start;font-size:12.5px;color:var(--rouge);text-decoration:underline;padding:2px 0}
.dw-body{flex:1;overflow-y:auto;min-height:0;padding:16px 26px 26px}
.dw-lbl{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--hell);margin:6px 0 10px}
.dw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:12px;margin-bottom:8px}
.dw-k{border:1px solid #E6E6E8;border-radius:12px;background:#fff;overflow:hidden;text-align:left;transition:border-color .15s,transform .15s;display:flex;flex-direction:column}
.dw-k:hover{border-color:var(--tinte);transform:translateY(-2px)}
.dw-k-bild{position:relative;height:150px;background:var(--nische);display:flex;align-items:center;justify-content:center;overflow:hidden}
.dw-k-bild img{width:100%;height:100%;object-fit:cover;display:block}
.dw-k-ph{font-size:30px;color:#d8d8d6}
.dw-k-farben{position:absolute;bottom:7px;right:7px;display:flex;gap:4px}
.dw-k-farben i{width:13px;height:13px;border-radius:50%;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.2);display:block}
.dw-k-nm{display:block;font-size:13px;padding:9px 11px 0;line-height:1.3}
.dw-k-brand{display:block;font-family:var(--mono);font-size:10px;color:var(--hell);padding:2px 11px 10px;letter-spacing:.03em}
.dw-mehr{display:block;width:100%;border:1px solid var(--linie);border-radius:11px;padding:12px;font-size:13.5px;color:var(--grau);background:var(--panel);margin-top:6px}
.dw-mehr:hover{border-color:var(--tinte);color:var(--tinte)}
.dw-leer{color:var(--hell);font-size:14px;padding:32px 2px;text-align:center}
@media(max-width:620px){.dw-box{max-height:96vh;border-radius:14px}.dw-dim-lbl{width:100%}.dw-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}}

.pn-lade{display:flex;flex-direction:column;align-items:center;gap:14px;font-family:var(--mono);font-size:12px;color:var(--grau)}
.pn-lade-sp{width:26px;height:26px;border:2px solid var(--linie);border-top-color:var(--rouge);border-radius:50%;animation:pnspin .8s linear infinite}
@keyframes pnspin{to{transform:rotate(360deg)}}
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
function gruppiereNachProjekt<T>(items: T[], label: (x: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const it of items) { const k = label(it) || 'Ohne Projekt'; if (!map.has(k)) map.set(k, []); map.get(k)!.push(it); }
  return Array.from(map.entries());
}

/* ── Caps für ein Teil inkl. Cap-Wand (aus /api/search): offener Pipetten-Cap wird
   bei oxidationsempfindlicher Formel ans Ende sortiert — NIE entfernt, nur depriorisiert. ── */
const istPipetteCap = (c: CapRef) => /pipette|dropper|tropfer/i.test(c.name || '');
function capsFuer(product: Result, capWall?: CapWall): { caps: CapRef[]; dropperDepri: boolean } {
  const capsRaw = getCaps(product);
  const dropperDepri = !!capWall?.deprioritize_open_dropper && capsRaw.some(istPipetteCap);
  const caps = dropperDepri
    ? [...capsRaw].sort((a, b) => (istPipetteCap(a) ? 1 : 0) - (istPipetteCap(b) ? 1 : 0))
    : capsRaw;
  return { caps, dropperDepri };
}

/* ── v45 — Die Design-Wand.
   Eine Fläche, alle kuratierten Design-Codes als Bilder. Kein Briefing, keine
   Runden: der Kunde sieht, tippt an, und das eigene Teil steht danach in genau
   diesem Design. Die Filter kommen aus der Design_Code-Tabelle selbst
   (Register, Segment, Form, Material, Wirkstoff-Welt) — nichts Erfundenes.
   Was das Teil physikalisch nicht kann, meldet der Render als Wächterzeile;
   die Wand blendet nichts stumm aus. */
interface DesignCodeKarte {
  id: string; name: string; brand: string; bild: string | null;
  register: string | null; segments: string[]; wirkstoffWelt: string[];
  laut: number | null; ton: number | null; form: number | null; farbtemp: number | null; deko: number | null;
  hfForm: string | null; hfMaterial: string | null; hfTyp: string | null;
  bodyHex: string | null; capHex: string | null; wirkung: string; passend: boolean;
}
interface CodeFacetten { register: string[]; segment: string[]; form: string[]; material: string[]; wirkstoff: string[] }
type FacettenDim = keyof CodeFacetten;
const FACETTEN_LABEL: Record<FacettenDim, string> = {
  register: 'Welt', segment: 'Preisniveau', form: 'Form', material: 'Material', wirkstoff: 'Wirkstoff',
};

/* ── Lieferanten-Profil (v59) ──────────────────────────────────────────
   Aufbau wie ein Unternehmensprofil: Titelbild · Logo · Name · Standort ·
   Kennzahlen · Über uns, darunter das Sortiment mit Typ-Reitern. Karten
   sind die Such-Karten (.ek) und öffnen das Teil im Detail-Panel. Daten:
   /api/search ({ lieferant }) aus der Airtable-Tabelle "Lieferant". */
interface LieferantDaten {
  profil: { name?: string; land?: string; standort?: string; website?: string; beschreibung?: string; status?: string;
    logo?: string | null; titelbild?: string | null; moq?: number | null; lieferzeit_wochen?: number | null; zertifikat?: string; eu?: boolean };
  anzahl: number;
  teile: Result[];
}
function LieferantProfil({ name, onClose, onTeil }: { name: string; onClose: () => void; onTeil?: (r: Result) => void }) {
  const [daten, setDaten] = useState<LieferantDaten | null>(null);
  const [laden, setLaden] = useState(true);
  const [reiter, setReiter] = useState('alle');
  useEffect(() => {
    let tot = false;
    setLaden(true); setReiter('alle');
    fetch(SEARCH_API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lieferant: name }) })
      .then(r => r.json())
      .then(d => { if (!tot && Array.isArray(d?.teile)) setDaten(heile(d)); })
      .catch(() => {})
      .finally(() => { if (!tot) setLaden(false); });
    return () => { tot = true; };
  }, [name]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  const p = daten?.profil || {};
  const anzeigeName = p.name || name;
  const teile = daten?.teile || [];
  const typen = Array.from(new Set(teile.map(t => t.type || 'Weitere')));
  const sichtbar = reiter === 'alle' ? teile : teile.filter(t => (t.type || 'Weitere') === reiter);
  const ort = [p.standort, p.land].filter(Boolean).join(', ');
  const fakten = [
    p.moq ? { k: 'Mindestmenge', v: `ab ${p.moq.toLocaleString('de-CH')} Stk.` } : null,
    p.lieferzeit_wochen ? { k: 'Lieferzeit', v: `ca. ${p.lieferzeit_wochen} Wochen` } : null,
    p.zertifikat ? { k: 'Zertifikat', v: p.zertifikat } : null,
    p.eu ? { k: 'Konformität', v: 'EU-konform' } : null,
  ].filter((f): f is { k: string; v: string } => f !== null);
  const initialen = anzeigeName.replace(/[^A-Za-zÄÖÜäöü0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '·';
  const bestaetigt = p.status === 'bestätigt';
  const titelBilder = teile.filter(t => t.imageUrl).slice(0, 7);
  return (
    <div className="dw-ov" role="dialog" aria-label={`Lieferant ${anzeigeName}`} onClick={onClose}>
      <div className="lp-box" onClick={e => e.stopPropagation()}>
        <button className="lp-zu" onClick={onClose} aria-label="schließen">×</button>
        <div className="lp-scroll">
          <div className="lp-titel">
            {p.titelbild
              ? <img src={p.titelbild} alt="" className="lp-titel-img" />
              : <div className="lp-titel-reihe" aria-hidden>{titelBilder.map(t => <img key={t.id} src={t.imageUrl as string} alt="" />)}</div>}
          </div>
          <div className="lp-kopf">
            <div className="lp-logo">{p.logo ? <img src={p.logo} alt={`${anzeigeName} Logo`} /> : <span>{initialen}</span>}</div>
            <div className="lp-id">
              <h3 className="serif">{anzeigeName}{bestaetigt && <span className="lp-check" title="Vom Lieferanten bestätigt">✓</span>}</h3>
              <span className="lp-meta">
                {[ort, daten ? `${daten.anzahl} ${daten.anzahl === 1 ? 'Teil' : 'Teile'} auf ulba` : ''].filter(Boolean).join(' · ') || 'Lieferant'}
              </span>
              <span className="lp-quelle">{bestaetigt ? 'Profil vom Lieferanten bestätigt' : 'Aus dem öffentlichen Katalog des Lieferanten'}</span>
            </div>
            {p.website && <a className="lp-web" href={p.website} target="_blank" rel="noreferrer">Website ↗</a>}
          </div>
          {(fakten.length > 0 || p.beschreibung) && (
            <div className="lp-info">
              {p.beschreibung && <p className="lp-ueber">{p.beschreibung}</p>}
              {fakten.length > 0 && <div className="lp-fakten">{fakten.map(f => <div key={f.k}><span>{f.k}</span><b>{f.v}</b></div>)}</div>}
            </div>
          )}
          <div className="lp-reiter">
            {[{ id: 'alle', n: 'Alle', z: teile.length }, ...typen.map(t => ({ id: t, n: TYPE_LABELS[t] || t, z: teile.filter(x => (x.type || 'Weitere') === t).length }))].map(r => (
              <button key={r.id} className={reiter === r.id ? 'an' : ''} onClick={() => setReiter(r.id)}>{r.n}<i>{r.z}</i></button>
            ))}
          </div>
          <div className="lp-sortiment">
            {laden && <div className="lp-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="lp-skel" />)}</div>}
            {!laden && !daten && <div className="lp-leer">Profil gerade nicht erreichbar. Bitte gleich nochmal öffnen.</div>}
            {!laden && daten && teile.length === 0 && <div className="lp-leer">Für diesen Lieferanten sind gerade keine Teile veröffentlicht.</div>}
            {!laden && sichtbar.length > 0 && (
              <div className="lp-grid">
                {sichtbar.map(r => (
                  <div key={r.id} className="ek">
                    <button className="ek-klick" onClick={() => { onTeil?.(r); onClose(); }} disabled={!onTeil}>
                      <div className="ek-bild">{r.imageUrl ? <img src={r.imageUrl} alt={r.name} loading="lazy" /> : <span className="ek-ph">◇</span>}</div>
                      <div className="ek-info">
                        <span className="ek-nm">{r.name}</span>
                        <span className="ek-spec">{[r.availableSizes?.[0], r.material?.[0], r.closure].filter(Boolean).join(' · ')}</span>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignWand({ suche, register, onWahl, onClose }: {
  suche?: string; register?: string | null;
  onWahl: (c: DesignCodeKarte) => void; onClose: () => void;
}) {
  const [codes, setCodes] = useState<DesignCodeKarte[]>([]);
  const [facetten, setFacetten] = useState<CodeFacetten>({ register: [], segment: [], form: [], material: [], wirkstoff: [] });
  const [laden, setLaden] = useState(true);
  const [aktiv, setAktiv] = useState<Partial<Record<FacettenDim, string>>>({});
  const [alleZeigen, setAlleZeigen] = useState(false);
  const [suchwort, setSuchwort] = useState('');

  useEffect(() => {
    let tot = false;
    setLaden(true);
    fetch(RENDER_API, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      // Wirkstoff erkennt der Renderer aus der Suche — gegen die Airtable-Tabelle
      // Wirkstoffe, nicht gegen eine Liste im Frontend.
      body: JSON.stringify({ codes: true, register: register || null, suche: suche || null }) })
      .then(r => r.json())
      .then(d => { if (tot) return;
        setCodes(Array.isArray(d?.codes) ? d.codes : []);
        if (d?.facetten) setFacetten(d.facetten);
      })
      .catch(() => { if (!tot) setCodes([]); })
      .finally(() => { if (!tot) setLaden(false); });
    return () => { tot = true; };
  }, [register, suche]);

  const setzeFacette = (dim: FacettenDim, wert: string) =>
    setAktiv(a => ({ ...a, [dim]: a[dim] === wert ? undefined : wert }));

  const gefiltert = useMemo(() => {
    const w = suchwort.trim().toLowerCase();
    return codes.filter(c => {
      if (aktiv.register && c.register !== aktiv.register) return false;
      if (aktiv.segment && !c.segments.includes(aktiv.segment)) return false;
      if (aktiv.form && c.hfForm !== aktiv.form) return false;
      if (aktiv.material && c.hfMaterial !== aktiv.material) return false;
      if (aktiv.wirkstoff && !c.wirkstoffWelt.includes(aktiv.wirkstoff)) return false;
      if (w && !(`${c.name} ${c.brand} ${c.wirkung}`.toLowerCase().includes(w))) return false;
      return true;
    });
  }, [codes, aktiv, suchwort]);

  const filterAktiv = Object.values(aktiv).some(Boolean) || !!suchwort.trim();
  const passende = gefiltert.filter(c => c.passend);
  const uebrige = gefiltert.filter(c => !c.passend);
  // Ohne Filter führt die Vorsortierung; sobald gefiltert wird, ist die Wand flach.
  const oben = filterAktiv ? gefiltert : (passende.length ? passende : gefiltert.slice(0, 12));
  const unten = filterAktiv ? [] : (passende.length ? uebrige : gefiltert.slice(12));

  const kachel = (c: DesignCodeKarte) => (
    <button key={c.id} className="dw-k" onClick={() => onWahl(c)} title={c.wirkung || c.name}>
      <div className="dw-k-bild">
        {c.bild ? <img src={c.bild} alt={c.name} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} />
                : <span className="dw-k-ph">◻</span>}
        <span className="dw-k-farben">
          {c.bodyHex && <i style={{ background: c.bodyHex }} />}
          {c.capHex && <i style={{ background: c.capHex }} />}
        </span>
      </div>
      <span className="dw-k-nm">{c.name}</span>
      {c.brand && <span className="dw-k-brand">{c.brand}</span>}
    </button>
  );

  return (
    <div className="dw-ov" role="dialog" aria-label="Design wählen">
      <div className="dw-box">
        <div className="dw-kopf">
          <div>
            <h3 className="serif">In welchem Design?</h3>
            <span className="dw-sub">Tipp eins an — dein Teil steht danach genau so da.</span>
          </div>
          <button className="pn-zu" onClick={onClose} aria-label="schließen">×</button>
        </div>

        <div className="dw-filter">
          <div className="dw-suche">
            <input value={suchwort} onChange={e => setSuchwort(e.target.value)} placeholder="Marke, Name oder Wirkung …" />
          </div>
          {(Object.keys(FACETTEN_LABEL) as FacettenDim[]).map(dim => {
            const opt = facetten[dim] || [];
            if (!opt.length) return null;
            return (
              <div key={dim} className="dw-dim">
                <span className="dw-dim-lbl">{FACETTEN_LABEL[dim]}</span>
                <div className="dw-dim-opt">
                  {opt.map(o => (
                    <button key={o} className={`dw-pill${aktiv[dim] === o ? ' an' : ''}`} onClick={() => setzeFacette(dim, o)}>
                      {o.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {filterAktiv && (
            <button className="dw-reset" onClick={() => { setAktiv({}); setSuchwort(''); }}>Filter zurücksetzen</button>
          )}
        </div>

        <div className="dw-body">
          {laden && <div className="dw-leer">Lade die Design-Welten …</div>}
          {!laden && !gefiltert.length && (
            <div className="dw-leer">
              Kein Design passt zu dieser Auswahl. {filterAktiv ? 'Nimm einen Filter weg.' : 'Das Archiv trägt hier noch nichts.'}
            </div>
          )}
          {!laden && !!oben.length && (
            <>
              {!filterAktiv && !!passende.length && <div className="dw-lbl">Passt zu deiner Suche</div>}
              <div className="dw-grid">{oben.map(kachel)}</div>
            </>
          )}
          {!laden && !!unten.length && (
            <>
              {!alleZeigen && (
                <button className="dw-mehr" onClick={() => setAlleZeigen(true)}>
                  Alle {unten.length} weiteren Designs zeigen →
                </button>
              )}
              {alleZeigen && (
                <>
                  <div className="dw-lbl">Alle weiteren</div>
                  <div className="dw-grid">{unten.map(kachel)}</div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Detail-Panel rechts: Inspektor UND Bühne. Teil ansehen, Verschluss wählen,
   Specs — und mit einem Klick das Teil in einem kuratierten Design sehen.
   Der Render passiert hier, nicht mehr im Chat: ein Design, ein Bild, eine
   Wächterzeile. Der gewählte Look gilt für die Sitzung (lookCode), so lassen
   sich mehrere Teile im selben Design vergleichen. ── */
function DetailPanel({ product, capWall, cap, onCap, isFav, inBoard, onFav, onBoard, onClose, sucheQuery, lookCode, onLook, onSample, onTeil }: {
  product: Result; capWall?: CapWall; cap: number; onCap: (i: number) => void;
  isFav: boolean; inBoard: boolean; onFav: () => void; onBoard: () => void; onClose: () => void;
  sucheQuery?: string; lookCode: DesignCodeKarte | null; onLook: (c: DesignCodeKarte | null) => void;
  onSample: (ctx: SampleContext) => void;
  onTeil?: (r: Result) => void;
}) {
  const { caps, dropperDepri } = capsFuer(product, capWall);
  const istPipette = istPipetteCap;
  const capIdx = Math.min(cap, Math.max(0, caps.length - 1));
  const [wandOffen, setWandOffen] = useState(false);
  const [lieferantOffen, setLieferantOffen] = useState(false);
  const [rstatus, setRstatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [rerror, setRerror] = useState('');
  const [render, setRender] = useState<{ url: string; capUrl: string | null; concept: RenderConcept | null; codeId: string } | null>(null);

  // Teilwechsel: der Look bleibt, das Bild nicht — es gehörte zum alten Teil.
  useEffect(() => { setRender(null); setRstatus('idle'); setRerror(''); }, [product.id]);

  const rendern = async (code: DesignCodeKarte) => {
    setWandOffen(false);
    onLook(code);
    setRstatus('loading'); setRerror('');
    try {
      const body: Record<string, unknown> = {
        systemId: product.id,
        query: sucheQuery || code.name,
        tier: 'lite',
        forceCodeId: code.id,
        sucheQuery: sucheQuery || null,
      };
      const capId = caps[capIdx]?.id || null;
      if (capId) body.selectedCapId = capId;
      const res = await fetch(RENDER_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Render fehlgeschlagen');
      if (!data.renderingUrl) throw new Error('Kein Bild erhalten');
      const cid = typeof data.cacheId === 'string' && REC_ID.test(data.cacheId) ? data.cacheId : null;
      const rUrl: string = cid && AT_URL.test(data.renderingUrl) ? stabil(cid) : data.renderingUrl;
      const cUrl: string | null = data.capRenderingUrl ? (cid && AT_URL.test(data.capRenderingUrl) ? stabil(cid, 'cap') : data.capRenderingUrl) : null;
      setRender({ url: rUrl, capUrl: cUrl, concept: data.concept || null, codeId: code.id });
      setRstatus('idle');
      try { const h = loadRenderHist(product.id); saveRenderHist(product.id, [rUrl, ...h.filter(u => u !== rUrl)].slice(0, 12)); } catch { /* Verlauf ist Kür */ }
    } catch (e) {
      setRstatus('error');
      setRerror(e instanceof Error ? e.message : 'Render fehlgeschlagen');
    }
  };

  const zeigtRender = !!render && rstatus !== 'loading';

  return (
    <aside className="panel">
      <div className="pn-kopf">
        <div><h3 className="serif">{product.name}</h3><span className="pn-spec">{product.id} · {specText(product)}</span></div>
        <div className="pn-akt">
          <button className={`favherz${isFav ? ' an' : ''}`} style={{ position: 'static' }} onClick={onFav} aria-label="Favorit">{isFav ? '♥' : '♡'}</button>
          <button className="pn-zu" onClick={onClose} aria-label="schließen">×</button>
        </div>
      </div>

      {caps.length > 0 && (
        <div className="pn-caps-top">
          <div className="lbl">Verschluss wählen · {caps.length}</div>
          <div className="thumbs">
            {caps.map((c, i) => {
              const depri = dropperDepri && istPipette(c);
              return (
                <div key={i}
                  className={`capthumb${capIdx === i ? ' an' : ''}`}
                  style={depri ? { opacity: 0.5 } : undefined}
                  title={depri ? 'Bei lichtempfindlicher Formel (z. B. Vitamin C) getöntes/opakes Glas wählen — offene Pipette lässt Licht & Luft an das Serum.' : undefined}
                  onClick={() => onCap(i)}>
                  <img src={c.imageUrl} alt={c.name || `Verschluss ${i + 1}`} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                </div>
              );
            })}
          </div>
          {dropperDepri && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--hell)', marginTop: 6, letterSpacing: '.02em' }}>
              Pipette bei lichtempfindlicher Formel nur mit getöntem Glas empfohlen.
            </div>
          )}
        </div>
      )}

      {/* Gestapelte Bühne: gewählter Cap oben, Rohteil unten — blanko, kein Look. */}
      <div className="pn-stack" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {caps.length > 0 && (
          <div className="pn-stack-cap" style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', minHeight: 70, marginBottom: -6 }}>
            {caps[capIdx]?.imageUrl
              ? <img src={caps[capIdx].imageUrl} alt={caps[capIdx]?.name || `Verschluss ${capIdx + 1}`} style={{ width: 76, maxHeight: 150, objectFit: 'contain', objectPosition: 'bottom', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
              : <span className="ph" style={{ color: '#d8d8d5' }}>◇</span>}
          </div>
        )}
        <div className="pn-bild" style={{ width: '100%', position: 'relative' }}>
          {zeigtRender
            ? <img src={render!.url} alt={`${product.name} im Design ${lookCode?.name || ''}`} />
            : product.imageUrl
              ? <img src={product.imageUrl} alt={product.name} />
              : <span style={{ fontSize: 72, color: '#e2e2e0' }}>◻</span>}
          {rstatus === 'loading' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(255,255,255,.87)', zIndex: 3, fontFamily: 'var(--mono)', fontSize: 11.5, letterSpacing: '.05em', color: 'var(--grau)' }}>
              <span className="pn-lade-sp" />
              <span>RENDERT IN {(lookCode?.name || 'DIESEM DESIGN').toUpperCase()} …</span>
            </div>
          )}
        </div>
      </div>

      {/* Ein Knopf, kein Weg: das Teil im kuratierten Design. */}
      <div className="pn-look">
        <button className="pn-look-btn" onClick={() => setWandOffen(true)}>
          {zeigtRender ? 'Anderes Design' : lookCode ? `In ${lookCode.name} zeigen` : 'In einem Design zeigen'}
        </button>
        {zeigtRender && lookCode && (
          <span className="pn-look-jetzt">
            {lookCode.bodyHex && <i style={{ background: lookCode.bodyHex }} />}
            {lookCode.capHex && <i style={{ background: lookCode.capHex }} />}
            {lookCode.name}
          </span>
        )}
        {rstatus === 'error' && <span className="pn-look-fehler">{rerror || 'Render fehlgeschlagen.'}</span>}
      </div>

      {/* Die Wächterzeile: was das reale Teil nicht kann, steht hier — nicht im Bild. */}
      {zeigtRender && render?.concept && (
        <div className="pn-waechter">
          {render.concept.konzept_name && <b>{render.concept.konzept_name}</b>}
          {render.concept.story && <span>{render.concept.story}</span>}
          {!!render.concept.farbsystem?.warnungen?.length && (
            <span className="pn-w-warn">{render.concept.farbsystem.warnungen.join(' · ')}</span>
          )}
          {!!render.concept.do_not?.length && (
            <span className="pn-w-prod">Nicht: {render.concept.do_not.slice(0, 3).join(' · ')}</span>
          )}
          {produzierbarText(render.concept.produzierbar) && (
            <span className="pn-w-prod">{produzierbarText(render.concept.produzierbar)}</span>
          )}
        </div>
      )}

      <div className="pn-body">
        <div className="specs">
          {product.type && <div className="spec"><div className="k">Typ</div><div className="v">{TYPE_LABELS[product.type] || product.type}</div></div>}
          {product.supplier && <div className="spec"><div className="k">Lieferant</div><div className="v"><button onClick={() => setLieferantOffen(true)} style={{ all: 'unset', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>{product.supplier} →</button></div></div>}
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
        <button className="cta" onClick={() => onSample({
          product,
          renderUrl: render?.url || '',
          wishValues: render?.concept ? produzierbarText(render.concept.produzierbar) : '',
          capLabel: caps[capIdx]?.name || '',
          konzept: render?.concept || null,
        })}>Muster anfragen →</button>
        <button className={`cta-sek${inBoard ? ' an' : ''}`} onClick={onBoard}>{inBoard ? '✓ im Paket' : '+ Paket'}</button>
      </div>

      {lieferantOffen && product.supplier && (
        <LieferantProfil name={product.supplier} onClose={() => setLieferantOffen(false)} onTeil={onTeil} />
      )}
      {wandOffen && (
        <DesignWand
          suche={sucheQuery}
          onWahl={rendern}
          onClose={() => setWandOffen(false)}
        />
      )}
    </aside>
  );
}

/* ── Muster-Anfrage-Modal: trägt Original + Wunsch (Render, Werte, Cap, Konzept) ── */
function SampleModal({ ctx, onClose, onSent }: { ctx: SampleContext; onClose: () => void; onSent: (r: SentRequest) => void }) {
  const { product, renderUrl, wishValues, capLabel, konzept } = ctx;
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [firm, setFirm] = useState(''); const [brief, setBrief] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async () => {
    if (!email.trim()) return; setStatus('sending');
    try {
      const res = await fetch('/api/sample-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id, productName: product.name, supplier: product.supplier || '',
          brandName: firm || name, brandEmail: email, brief,
          renderUrl: renderUrl ? new URL(renderUrl, window.location.origin).href : '', wishValues, capLabel,
          konzeptName: konzept?.konzept_name || '', story: konzept?.story || '',
          produzierbar: konzept?.produzierbar || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      if (data?.id) {
        onSent({
          id: data.id,
          productName: product.name,
          supplier: product.supplier || '',
          konzeptName: konzept?.konzept_name || '',
          renderUrl,
          sentAt: Date.now(),
          status: 'Neu',
        });
      }
      setStatus('done');
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
              <div><div className="serif" style={{ fontSize: 22, marginBottom: 3 }}>Muster anfragen</div><div style={{ fontSize: 13, color: 'var(--hell)' }}>{product.name}{product.supplier ? ` · ${product.supplier}` : ''}</div></div>
              <button className="pn-zu" onClick={onClose}>×</button>
            </div>

            {/* Wunsch-Vorschau: was zusätzlich zum Original mitgeschickt wird */}
            {(renderUrl || capLabel || konzept) && (
              <div className="mwunsch">
                {renderUrl && <img src={renderUrl} alt="Wunsch-Render" />}
                <div>
                  <div className="t">Deine Richtung geht mit</div>
                  <div className="v">
                    {konzept?.konzept_name ? <strong>{konzept.konzept_name}</strong> : (renderUrl ? 'Wunsch-Render' : 'Ohne Render')}
                    {capLabel ? ` · Verschluss: ${capLabel}` : ''}
                  </div>
                  {konzept?.produzierbar && produzierbarText(konzept.produzierbar) && (
                    <div className="v" style={{ marginTop: 6, whiteSpace: 'pre-line', fontSize: 12 }}>{produzierbarText(konzept.produzierbar)}</div>
                  )}
                </div>
              </div>
            )}

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
            <div style={{ fontSize: 12, color: 'var(--hell)', textAlign: 'center', marginTop: 14 }}>Der Lieferant erhält das reale Packmittel als verbindliche Basis — dein Render zeigt die gewünschte Anmutung.</div>
          </>
        )}
      </div>
    </>
  );
}

/* ── Lade-Anzeige ── */
const SCAN_MESSAGES = [
  'Lese Formsprache und Silhouette …',
  'Gleiche Material und Volumen ab …',
  'Bewerte emotionale Passung …',
  'Prüfe Verschluss-Kompatibilität …',
  'Wäge Markenfit und Regalwirkung ab …',
  'Stelle die besten Treffer zusammen …',
];
function ScanBar() {
  const [pct, setPct] = useState(4);
  const [msg, setMsg] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPct(p => (p < 95 ? p + Math.max(1, Math.round((96 - p) / 14)) : p)), 170);
    const m = setInterval(() => setMsg(i => (i + 1) % SCAN_MESSAGES.length), 1300);
    return () => { clearInterval(t); clearInterval(m); };
  }, []);
  return (
    <div className="scan">
      <div className="scan-top">
        <span className="scan-msg">{SCAN_MESSAGES[msg]}</span>
        <span className="scan-pct">{pct}%</span>
      </div>
      <div className="scan-bar"><div className="scan-fill" style={{ width: pct + '%' }} /></div>
    </div>
  );
}

export type LookMitStatus = DesignLook & { _umgeleitet?: boolean };


/* Ein Handyfoto sind schnell 6 MB — Vercel nimmt 4,5. Und mehr als 1200 px
   liest das Vision-Modell ohnehin nicht besser. Also erst schrumpfen. */
/* Kleine Vorschau fuer den Verlauf (persistiert). Das Vollbild geht nur ans Backend. */
function vorschauVon(dataUrl: string, max = 320): Promise<string> {
  return new Promise(ok => {
    const img = new Image();
    img.onerror = () => ok(dataUrl.length > 120000 ? '' : dataUrl);
    img.onload = () => {
      const f = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
      const ctx = c.getContext('2d');
      if (!ctx) return ok('');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/jpeg', 0.72));
    };
    img.src = dataUrl;
  });
}

function bildVerkleinern(datei: File): Promise<string> {
  return new Promise((ok, fehl) => {
    const leser = new FileReader();
    leser.onerror = () => fehl(new Error('Datei nicht lesbar'));
    leser.onload = () => {
      const img = new Image();
      img.onerror = () => fehl(new Error('Kein gueltiges Bild'));
      img.onload = () => {
        const max = 1200;
        const f = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
        const ctx = c.getContext('2d');
        if (!ctx) return fehl(new Error('Canvas fehlt'));
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(leser.result);
    };
    leser.readAsDataURL(datei);
  });
}

const LESART_LABEL: Record<string, string> = {
  typ: 'Typ', form: 'Form', schulter: 'Schulter', proportion: 'Proportion',
  verschluss: 'Verschluss', material: 'Material', transparenz: 'Transparenz',
  finish: 'Finish', volumen: 'Volumen',
};

function lesartChips(l: Bildlesart): { feld: string; text: string; unsicher: boolean }[] {
  const raus: { feld: string; text: string; unsicher: boolean }[] = [];
  const push = (feld: string, wert: string | null) => {
    if (!wert) return;
    raus.push({ feld, text: `${LESART_LABEL[feld]}: ${wert}`, unsicher: l.geraten.includes(feld) });
  };
  push('typ', l.typ);
  push('form', l.form.join(' / ') || null);
  push('schulter', l.schulter);
  push('proportion', l.proportion);
  push('verschluss', l.verschluss);
  push('material', l.material.join(' / ') || null);
  push('transparenz', l.transparenz);
  push('finish', l.finish);
  push('volumen', l.volumen);
  return raus;
}

function Karte({ r, selected, isFav, isLead, onOpen, onFav }: {
  r: Result; selected: boolean; isFav: boolean; isLead?: boolean; onOpen: () => void; onFav: (e: React.MouseEvent) => void;
}) {
  return (
    <div className={`ek${selected ? ' an' : ''}${isLead ? ' lead' : ''}`}>
      <button className={`favherz${isFav ? ' an' : ''}`} onClick={onFav} aria-label="Favorit">{isFav ? '♥' : '♡'}</button>
      <button className="ek-klick" onClick={onOpen}>
        <div className="ek-bild">{r.imageUrl ? <img src={r.imageUrl} alt={r.name} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} /> : <span className="ek-ph">◇</span>}</div>
        <div className="ek-info">
          <span className="ek-nm">{r.name}</span>
          <span className="ek-spec">{specText(r)}</span>
          {typeof r.formNaehe === 'number' && <span className="ek-ab">Form {r.formNaehe} %</span>}
          {r.abweichung && r.abweichung.length > 0 && (
            <span className="ek-ab">≠ {r.abweichung.slice(0, 2).join(' · ')}</span>
          )}
        </div>
        {isLead && <span className="ek-lead">Empfehlung</span>}
      </button>
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'start' | 'chat' | 'linien' | 'favoriten' | 'anfragen'>('start');
  const [input, setInput] = useState('');
  const [refineInput, setRefineInput] = useState('');
  // Ein Feld, eine Aufgabe: die untere Leiste verfeinert die Suche in Worten.
  const leisteSenden = () => {
    const t = refineInput.trim();
    if (!t) return;
    verfeinereText(t);
    setRefineInput('');
  };
  const [selected, setSelected] = useState<Result | null>(null); // Detail-Panel (Inspektor)
  // Ein Look pro Sitzung: so lassen sich mehrere Teile im selben Design vergleichen.
  const [lookCode, setLookCode] = useState<DesignCodeKarte | null>(null);
  const [selectedCap, setSelectedCap] = useState(0); // im Panel gewählter Verschluss
  const [sampleCtx, setSampleCtx] = useState<SampleContext | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const gel = loadProjects().map(p => p.name === 'Referenzbild' ? { ...p, name: projektName(p.blocks[0]?.lesart) || p.name } : p);
    const fav = loadFavorites();
    setProjects(gel);
    setFavorites(fav);
    setSentRequests(loadRequests());
    // v60 — Altbestand: grosse Vorschauen (Vollbilder aus frueheren Versionen) verkleinern.
    const gross = gel.flatMap(p => p.blocks.filter(b => (b.bild?.length || 0) > 90000).map(b => ({ pid: p.id, bid: b.id, bild: b.bild as string })));
    if (gross.length) {
      Promise.all(gross.map(g => vorschauVon(g.bild).then(v => ({ ...g, v })))).then(kl => {
        setProjects(prev => prev.map(p => ({ ...p, blocks: p.blocks.map(b => {
          const k = kl.find(x => x.pid === p.id && x.bid === b.id);
          return k ? { ...b, bild: k.v || undefined } : b;
        }) })));
      });
    }
    // v60 — gespeicherte Teile auffrischen: Lieferantenname, Bilder, Verschluesse
    // koennen sich seit dem Speichern geaendert haben (z. B. Record-ID statt Name).
    const ids = new Set<string>();
    fav.forEach(f => ids.add(f.productId));
    gel.forEach(p => { p.board.forEach(r => ids.add(r.id)); p.blocks.forEach(b => b.results.forEach(r => ids.add(r.id))); });
    if (ids.size === 0) return;
    fetch(SEARCH_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(ids).slice(0, 400) }) })
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d?.frisch) || !d.frisch.length) return;
        const map = new Map<string, Partial<Result>>(heile(d.frisch as Partial<Result>[]).map(f => [f.id as string, f]));
        const auf = <T extends Result>(r: T): T => { const f = map.get(r.id); return f ? { ...r, ...f } : r; };
        setFavorites(prev => { const n = prev.map(f => ({ ...f, product: auf(f.product) })); saveFavorites(n); return n; });
        setProjects(prev => prev.map(p => ({ ...p, board: p.board.map(auf), blocks: p.blocks.map(b => ({ ...b, results: b.results.map(auf) })) })));
        setSelected(prev => prev ? auf(prev) : prev);
      })
      .catch(() => {});
  }, []);

  // SEO — Einstieg über /?teil=<recordId>[&cap=<capId>] (von den indexierbaren Seiten):
  // Teil laden, eine Suche nach ähnlichen Teilen starten (Typ + Material + Form)
  // und das Teil direkt im DetailPanel öffnen — optional mit gewähltem Verschluss.
  const einstiegRef = useRef<{ t: Result; cap: string | null } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = q.get('teil');
    if (!id || !/^rec[A-Za-z0-9]{14}$/.test(id)) return;
    const capId = q.get('cap');
    fetch(SEARCH_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
      .then(r => r.json())
      .then(d => {
        const t = Array.isArray(d?.frisch) ? heile(d.frisch as Partial<Result>[])[0] as Result | undefined : undefined;
        if (!t) return;
        einstiegRef.current = { t, cap: capId && /^rec[A-Za-z0-9]{14}$/.test(capId) ? capId : null };
        const suche = [t.type, ...(t.material || []).slice(0, 1), ...(t.form || []).slice(0, 1)].filter(Boolean).join(' ') || t.name;
        starteSuche(suche);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Sobald das Einstiegs-Projekt aktiv ist: Teil öffnen (starteSuche setzt selected zurück).
  useEffect(() => {
    const e = einstiegRef.current;
    if (!e || view !== 'chat' || !activeId) return;
    einstiegRef.current = null;
    setSelected(e.t);
    const idx = e.cap ? getCaps(e.t).findIndex(c => c.id === e.cap) : -1;
    setSelectedCap(idx > 0 ? idx : 0);
  }, [view, activeId]);

  // Geöffnetes Teil in der URL spiegeln → Link teilbar (LinkedIn, Mail, Musteranfrage).
  useEffect(() => {
    if (!mounted) return;
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set('teil', selected.id); else url.searchParams.delete('teil');
    window.history.replaceState(null, '', url.toString());
  }, [selected, mounted]);

  const handleSent = (r: SentRequest) => {
    setSentRequests(prev => { const next = [r, ...prev.filter(x => x.id !== r.id)]; saveRequests(next); return next; });
  };

  // Live-Status der eigenen Anfragen holen, sobald der Tab geöffnet wird.
  useEffect(() => {
    if (view !== 'anfragen' || sentRequests.length === 0) return;
    const ids = sentRequests.map(r => r.id).join(',');
    fetch(`/api/sample-request?ids=${encodeURIComponent(ids)}`)
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d?.requests)) return;
        const map = new Map<string, string>(d.requests.map((x: any) => [x.id, x.status]));
        setSentRequests(prev => {
          const next = prev.map(r => map.has(r.id) ? { ...r, status: map.get(r.id) } : r);
          saveRequests(next); return next;
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => { if (mounted) saveProjects(projects); }, [projects, mounted]);

  const active = projects.find(p => p.id === activeId) || null;
  const blocks = active ? active.blocks : [];
  const board = active ? active.board : [];
  const rootQuery = active ? active.rootQuery : '';

  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [blocks, activeId]);

  const patchProject = useCallback((id: string, patch: (p: Project) => Project) => {
    setProjects(prev => prev.map(p => p.id === id ? patch(p) : p));
  }, []);

  const isFav = (id: string) => favorites.some(f => f.productId === id);

  const quickFav = (product: Result) => {
    const proj = rootQuery.trim() || 'Ohne Projekt';
    const saved = favorites.some(f => f.productId === product.id);
    const upd = saved ? favorites.filter(f => f.productId !== product.id)
      : [...favorites, { productId: product.id, projectId: proj, savedAt: Date.now(), product: { ...product, projekt: proj } }];
    setFavorites(upd); saveFavorites(upd);
  };

  const toggleBoard = (product: Result) => {
    if (!active) return;
    const proj = rootQuery.trim() || 'Ohne Projekt';
    patchProject(active.id, p => ({
      ...p,
      board: p.board.some(x => x.id === product.id)
        ? p.board.filter(x => x.id !== product.id)
        : [...p.board, { ...product, projekt: proj }],
    }));
  };

  const runSearch = useCallback(async (projectId: string, query: string, filters: ParsedFilters, intro: string, removed?: ParsedFilters, bild?: { data?: string; lesart?: Bildlesart | null; vorschau?: string }) => {
    const rem = removed || emptyFilters();
    let id = 0;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      id = p.blockSeq + 1;
      return { ...p, blockSeq: id, blocks: [...p.blocks, { id, intro, query, filters, removed: rem, results: [], looks: [], categoryMatch: '', hinweis: '', alleZeigen: false, status: 'loading', bild: bild?.vorschau }] };
    }));
    try {
      const body: any = { query };
      // v47/v55 — Bildpfad. Eine korrigierte Lesart schlaegt das Modell,
      // aber das BILD reist immer mit: die Silhouette misst die Geometrie
      // bei jeder Suche, auch nach einer Chip-Korrektur.
      if (bild?.lesart) body.bildlesart = bild.lesart;
      if (bild?.data) body.image = bild.data;
      if (filters.sizes.length || filters.materials.length || filters.types.length || filters.closures.length) {
        body.active_filters = filters;
      }
      // Chip-X-Entfernungen mitschicken — sonst macht das Backend-Union-Merge
      // (Query-Reparse der rootQuery) jedes Entfernen sofort wieder rückgängig.
      if (rem.sizes.length || rem.materials.length || rem.types.length || rem.closures.length) {
        body.removed_filters = rem;
      }
      const res = await fetch(SEARCH_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const serverFilters: ParsedFilters = data.parsedFilters || filters;
      setProjects(prev => prev.map(p => p.id === projectId ? {
        ...p, name: p.name === 'Referenzbild' ? (projektName(data.bildlesart) || p.name) : p.name,
        blocks: p.blocks.map(b => b.id === id ? { ...b, results: heile(data.results || []), looks: heile(data.design_looks || []), categoryMatch: data.categoryMatch || '', hinweis: data.hinweis || '', filters: serverFilters, capWall: data.cap_wall || undefined, lesart: data.bildlesart || null, nah: data.nah || 0, aehnlich: data.aehnlich || 0, formMessung: data.form_messung || null, tags: data.bild_tags || [], status: 'done' } : b),
      } : p));
    } catch {
      setProjects(prev => prev.map(p => p.id === projectId ? {
        ...p, blocks: p.blocks.map(b => b.id === id ? { ...b, status: 'error' } : b),
      } : p));
    }
  }, []);

  const starteSuche = (text: string) => {
    if (!text.trim()) return;
    const q = text.trim();
    const id = neueProjektId();
    const neu: Project = { id, name: q.slice(0, 48), createdAt: Date.now(), rootQuery: q, blocks: [], board: [], blockSeq: 0 };
    setProjects(prev => [neu, ...prev]);
    setActiveId(id); setSelected(null); setInput(''); setView('chat');
    runSearch(id, q, emptyFilters(), q);
  };

  /* Foto rein. Kein Text noetig — das Bild ist die Frage. */
  const starteBildSuche = async (datei: File) => {
    let data: string;
    try { data = await bildVerkleinern(datei); }
    catch { return; }
    const id = neueProjektId();
    const vorschau = await vorschauVon(data);
    bildSpeicher.set(id, data);
    const neu: Project = { id, name: 'Referenzbild', createdAt: Date.now(), rootQuery: '', blocks: [], board: [], blockSeq: 0 };
    setProjects(prev => [neu, ...prev]);
    setActiveId(id); setSelected(null); setInput(''); setView('chat');
    runSearch(id, '', emptyFilters(), 'Referenzbild', undefined, { data, vorschau });
  };

  /* Chip weg = Lesart korrigiert. Neue Runde, kein neuer Vision-Call. */
  const korrigiereLesart = (b: Block, feld: string) => {
    if (!active || !b.lesart) return;
    const l: Bildlesart = { ...b.lesart, geraten: b.lesart.geraten.filter(g => g !== feld) };
    if (feld === 'form' || feld === 'material') (l as any)[feld] = [];
    else (l as any)[feld] = null;
    runSearch(active.id, '', b.filters, `ohne ${LESART_LABEL[feld] || feld}`, b.removed, { lesart: l, vorschau: b.bild, data: bildSpeicher.get(active.id) });
  };

  const verfeinereText = (text: string) => {
    if (!text.trim() || !active) return;
    const letzter = blocks[blocks.length - 1];
    const filters = letzter ? cloneFilters(letzter.filters) : emptyFilters();
    const removed = letzter?.removed ? cloneFilters(letzter.removed) : emptyFilters();
    runSearch(active.id, `${rootQuery} ${text.trim()}`, filters, text.trim(), removed);
  };

  const waehleFacette = (dim: keyof ParsedFilters, wert: string) => {
    if (!active) return;
    const letzter = blocks[blocks.length - 1];
    const filters = letzter ? cloneFilters(letzter.filters) : emptyFilters();
    const removed = letzter?.removed ? cloneFilters(letzter.removed) : emptyFilters();
    if (!filters[dim].includes(wert)) filters[dim] = [...filters[dim], wert];
    // Explizit gewählt schlägt früheres Entfernen: aus der removed-Liste nehmen.
    removed[dim] = removed[dim].filter(v => v !== wert);
    runSearch(active.id, rootQuery, filters, `${FILTER_LABELS[dim]}: ${wert}`, removed);
  };

  const entferneFilter = (dim: keyof ParsedFilters, wert: string) => {
    if (!active) return;
    const letzter = blocks[blocks.length - 1];
    const filters = letzter ? cloneFilters(letzter.filters) : emptyFilters();
    const removed = letzter?.removed ? cloneFilters(letzter.removed) : emptyFilters();
    filters[dim] = filters[dim].filter(v => v !== wert);
    // In die removed-Liste — sonst parst das Backend den Wert aus der rootQuery
    // sofort wieder rein (Union-Merge) und das X wirkt nie.
    if (!removed[dim].includes(wert)) removed[dim] = [...removed[dim], wert];
    runSearch(active.id, rootQuery, filters, `ohne ${wert}`, removed);
  };

  const setBlockAlle = (blockId: number, alle: boolean) => {
    if (!active) return;
    patchProject(active.id, p => ({ ...p, blocks: p.blocks.map(b => b.id === blockId ? { ...b, alleZeigen: alle } : b) }));
  };

  const neuesProjekt = () => { setActiveId(null); setSelected(null); setInput(''); setView('start'); };
  const oeffneProjekt = (id: string) => { setActiveId(id); setSelected(null); setView('chat'); };
  const loescheProjekt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeId === id) { setActiveId(null); setView('start'); setSelected(null); }
  };

  const favCount = favorites.filter((f, i, a) => a.findIndex(x => x.productId === f.productId) === i).length;
  const boardTotal = projects.reduce((n, p) => n + p.board.length, 0);
  const lastId = blocks.length ? blocks[blocks.length - 1].id : -1;

  const nav = (
    <aside className="nav">
      <button className="nav-marke" onClick={neuesProjekt} aria-label="ulba – Start">
        <svg className="nav-logo" viewBox="0 0 200 78" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ulba">
          <text x="0" y="62" fontFamily="Archivo, system-ui, sans-serif" fontWeight="800" fontSize="80" letterSpacing="-4" fill="var(--tinte)">ulba</text>
        </svg>
      </button>
      <button className="nav-neu" onClick={neuesProjekt}>+ Neues Projekt</button>
      <div>
        {([['favoriten', '♡', 'Favoriten', favCount], ['linien', '▤', 'Meine Linien', boardTotal], ['anfragen', '⇄', 'Musteranfragen', 0]] as const).map(([v, ic, t, badge]) => (
          <button key={v} className={`nav-item${view === v ? ' an' : ''}`} onClick={() => setView(v as any)}>
            <span className="ni-ic">{ic}</span><span className="ni-t">{t}</span>{badge ? <span className="ni-b">{badge}</span> : null}
          </button>
        ))}
      </div>
      <div className="nav-lbl">Projekte</div>
      <div className="nav-chats">
        {projects.length === 0
          ? <div className="nav-leer">Noch kein Projekt</div>
          : projects.map(p => (
            <button key={p.id} className={`nav-chat${view === 'chat' && activeId === p.id ? ' an' : ''}`} onClick={() => oeffneProjekt(p.id)}>
              <span className="nc-t">{p.name}</span>
              <span className="nc-s">{p.board.length ? `${p.board.length} im Paket` : `${p.blocks.length} Suche${p.blocks.length === 1 ? '' : 'n'}`}</span>
              <span className="nc-x" onClick={e => loescheProjekt(p.id, e)} aria-label="Projekt löschen">×</span>
            </button>
          ))}
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
          <span className="spur">{view === 'start' ? 'Generatives Sourcing' : view === 'chat' ? (rootQuery.slice(0, 48) || 'Projekt') : view === 'linien' ? 'Meine Linien' : view === 'favoriten' ? 'Favoriten' : 'Musteranfragen'}</span>
        </header>

        <div className={`content${view === 'chat' ? ' content-chat' : ''}`}>
          {view === 'start' && (
            <div className="start">
              <div className="st-mitte">
                <h1>Was möchtest du <em>launchen</em>?</h1>
                <div
                  className="feld"
                  onDragOver={e => { e.preventDefault(); }}
                  onDrop={e => {
                    e.preventDefault();
                    const f = Array.from(e.dataTransfer.files).find(x => x.type.startsWith('image/'));
                    if (f) starteBildSuche(f);
                  }}
                >
                  <label className="bildknopf" title="Referenzbild">
                    <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) starteBildSuche(f); e.target.value = ''; }} />
                    <span>◫</span>
                  </label>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && starteSuche(input)}
                    onPaste={e => {
                      const f = Array.from(e.clipboardData.files).find(x => x.type.startsWith('image/'));
                      if (f) { e.preventDefault(); starteBildSuche(f); }
                    }}
                    placeholder="Beschreiben — oder ein Foto hineinziehen"
                    autoFocus
                  />
                  <button className="go" onClick={() => starteSuche(input)} aria-label="Suchen">↑</button>
                </div>
                <div className="st-trend">
                  {EXAMPLES.map((ex, i) => <button key={i} className="tr-pill" onClick={() => { setInput(ex.q); starteSuche(ex.q); }}>{ex.label}</button>)}
                </div>
                <p className="st-note">ulba durchsucht echte Lieferanten-Kataloge und rankt nach Passung — wie eine Designagentur, in Minuten.</p>
              </div>
            </div>
          )}

          {view === 'chat' && active && (
            <div className={`chat${selected ? ' split' : ''}`}>
              <main className="cs-main">
                <div className="thread" ref={threadRef}>
                  <div className="thread-inner">
                    {blocks.map(b => {
                      const isLast = b.id === lastId;
                      const liste = b.results;
                      // v50 — im Bildmodus schneidet das Backend ab: nur was
                      // wirklich nah ist, wird als Antwort gezeigt. Der Rest
                      // bleibt einen Klick entfernt, wird aber nicht behauptet.
                      const nahN = b.nah && b.nah > 0 ? b.nah : 0;
                      const aehnlichN = nahN > 0 ? (b.aehnlich || 0) : 0;
                      const grenze = nahN > 0 ? nahN + aehnlichN : 20;
                      const zeige = b.alleZeigen ? liste : liste.slice(0, grenze);
                      const rest = liste.length - zeige.length;
                      const pal = b.categoryMatch || 'deine Suche';
                      const chips: { dim: keyof ParsedFilters; wert: string; label: string }[] = [];
                      (Object.keys(FILTER_LABELS) as (keyof ParsedFilters)[]).forEach(dim =>
                        (b.filters[dim] || []).forEach(wert => chips.push({ dim, wert, label: `${FILTER_LABELS[dim]}: ${wert}` })));
                      const facetten = FACETTEN.filter(f => !hasDim(b.filters, f.dim));
                      return (
                        <div key={b.id}>
                          <div className="msg-user">
                            {b.bild && <img className="msg-bild" src={b.bild} alt="Referenzbild" />}
                            <span>{b.intro}</span>
                          </div>
                          <div className="msg-ulba">
                            {b.status === 'loading' && <ScanBar />}
                            {b.status === 'error' && <div className="eb-scan" style={{ color: '#dc2626' }}>Fehler — bitte erneut versuchen.</div>}
                            {b.status === 'done' && (
                              <div className={`eb${isLast ? '' : ' eb-alt'}`}>
                                {chips.length > 0 && !b.lesart && (
                                  <div className="eb-filter">
                                    <span className="ebf-lbl">{isLast ? 'Aktiv' : 'Stand'}</span>
                                    {chips.map((c, i) => (
                                      <span key={i} className="ebf-pill">{c.label}{isLast && <span className="ebf-x" onClick={() => entferneFilter(c.dim, c.wert)}>×</span>}</span>
                                    ))}
                                  </div>
                                )}
                                {b.lesart && (
                                  <div className="eb-lesart">
                                    <span className="ebf-lbl">Gelesen als</span>
                                    {lesartChips(b.lesart).map(c => (
                                      <span key={c.feld} className={`lz-pill${c.unsicher ? ' geraten' : ''}`}>
                                        {c.text}
                                        {isLast && <span className="ebf-x" onClick={() => korrigiereLesart(b, c.feld)}>×</span>}
                                      </span>
                                    ))}
                                    <span className="lz-note">Gestrichelt = geschätzt. Stimmt etwas nicht, nimm es weg.</span>
                                  </div>
                                )}
                                {b.hinweis && <div className="ch-ulba" style={{ marginBottom: 18 }}>{b.hinweis}</div>}
                                <div className="eb-kopf">
                                  <span className="ebk-h">
                                    {b.nah ? `${b.nah} ${b.nah === 1 ? 'Teil kommt' : 'Teile kommen'} nah dran` : `${zeige.length} Systeme für dich`}
                                  </span>
                                  <span className="ebk-s">
                                    {b.nah
                                      ? `${b.tags?.length || 0} Bildmerkmale gelesen · ${b.formMessung ? (b.formMessung.aktiv ? `Form gemessen (SV ${b.formMessung.seitenverhaeltnis})` : `Form NICHT gemessen: ${b.formMessung.grund}`) + ' · ' : ''}${liste.length - b.nah} weitere im Archiv`
                                      : `von ulba kuratiert · gelesen als ${pal}`}
                                  </span>
                                </div>
                                {liste.length === 0
                                  ? <div className="leer"><div className="gr">Keine Treffer.</div>Versuch eine breitere Suche.</div>
                                  : <>
                                    <div className={`eb-grid${selected ? ' schmal' : ''}`}>
                                      {(nahN > 0 && !b.alleZeigen ? zeige.slice(0, nahN) : zeige).map((r, i) => <Karte key={r.id} r={r} selected={selected?.id === r.id} isFav={isFav(r.id)} isLead={i === 0 && !selected} onOpen={() => { setSelected(r); setSelectedCap(0); }} onFav={e => { e.stopPropagation(); quickFav(r); }} />)}
                                    </div>
                                    {nahN > 0 && aehnlichN > 0 && !b.alleZeigen && (
                                      <>
                                        <div className="eb-aehnlich"><span className="ebf-lbl">Ähnlich in der Form</span><span className="lz-note">kein Volltreffer — verwandte Silhouette</span></div>
                                        <div className={`eb-grid${selected ? ' schmal' : ''}`}>
                                          {zeige.slice(nahN, nahN + aehnlichN).map(r => <Karte key={r.id} r={r} selected={selected?.id === r.id} isFav={isFav(r.id)} onOpen={() => { setSelected(r); setSelectedCap(0); }} onFav={e => { e.stopPropagation(); quickFav(r); }} />)}
                                        </div>
                                      </>
                                    )}
                                  </>}
                                {rest > 0 && !b.alleZeigen && <button className="eb-mehr" onClick={() => setBlockAlle(b.id, true)}>Alle weiteren {rest} anzeigen ↓</button>}
                                {b.alleZeigen && liste.length > 20 && <button className="eb-mehr" onClick={() => setBlockAlle(b.id, false)}>Nur beste 20 zeigen ↑</button>}
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
                </div>
                <div className="refine">
                  <div className="feld">
                    <input value={refineInput} onChange={e => setRefineInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') leisteSenden(); }}
                      placeholder="Verfeinern in Worten — wärmer, nur Glas, 30 ml, unter 5000 MOQ" />
                    <button className="go" onClick={leisteSenden} aria-label="senden">↑</button>
                  </div>
                </div>
              </main>
              {selected && (
                <DetailPanel product={selected} capWall={blocks.find(b => b.results.some(r => r.id === selected.id))?.capWall}
                  cap={selectedCap} onCap={setSelectedCap}
                  isFav={isFav(selected.id)} inBoard={board.some(x => x.id === selected.id)}
                  onFav={() => quickFav(selected)} onBoard={() => toggleBoard(selected)}
                  sucheQuery={blocks.find(b => b.results.some(r => r.id === selected.id))?.query}
                  lookCode={lookCode} onLook={setLookCode} onSample={setSampleCtx}
                  onTeil={r => { setSelected(r); setSelectedCap(0); }}
                  onClose={() => setSelected(null)} />
              )}
            </div>
          )}

          {view === 'chat' && !active && (
            <div className="bereich"><div className="leer"><div className="gr">Kein Projekt offen.</div>Wähle links ein Projekt oder starte ein neues.</div></div>
          )}

          {view === 'linien' && (
            <div className="bereich">
              <div className="ber-kopf"><h2 className="serif">Meine Linien</h2><p>Deine Musterpakete — pro Projekt getrennt. Tippe eine Verpackung an, um Details zu sehen.</p></div>
              {boardTotal === 0
                ? <div className="leer"><div className="gr">Noch leer.</div>Leg im Detail ein Packmittel ins Paket.</div>
                : projects.filter(p => p.board.length > 0).map(p => (
                  <div key={p.id} style={{ marginBottom: 34 }}>
                    <div className="lin-kopf" onClick={() => oeffneProjekt(p.id)} style={{ cursor: 'pointer' }}>
                      <div className="lk-reihe">{p.board.slice(0, 4).map(r => r.imageUrl ? <img key={r.id} src={r.imageUrl} alt={r.name} /> : <span key={r.id} style={{ fontSize: 30, color: '#d8d8d6' }}>◇</span>)}</div>
                      <div className="lk-info"><span className="lk-t">{p.name}</span><span className="lk-s">{p.board.length} Teile · zum Ansehen antippen</span></div>
                    </div>
                    <div className="eb-grid" style={{ marginTop: 16 }}>
                      {p.board.map(r => (
                        <Karte key={r.id} r={r} selected={false} isFav={isFav(r.id)}
                          onOpen={() => { setActiveId(p.id); setView('chat'); setSelected(r); }}
                          onFav={e => { e.stopPropagation(); quickFav(r); }} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {view === 'favoriten' && (
            <div className="bereich">
              <div className="ber-kopf"><h2 className="serif">Favoriten</h2><p>Gemerkte Packmittel — nach Projekt gruppiert.</p></div>
              {favCount === 0
                ? <div className="leer"><div className="gr">Noch leer.</div>Tippe auf das Herz an einem Packmittel.</div>
                : gruppiereNachProjekt(
                  favorites.filter((f, i, a) => a.findIndex(x => x.productId === f.productId) === i),
                  f => f.projectId || 'Ohne Projekt'
                ).map(([proj, items]) => (
                  <div key={proj} style={{ marginBottom: 30 }}>
                    <div className="grp-titel">{proj.slice(0, 44)} <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--hell)' }}>· {items.length}</span></div>
                    <div className="eb-grid">
                      {items.map(f => (
                        <Karte key={f.productId} r={f.product} selected={false} isFav onOpen={() => { setSelected(f.product); setView(active ? 'chat' : 'favoriten'); }} onFav={e => { e.stopPropagation(); quickFav(f.product); }} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {view === 'anfragen' && (
            <div className="bereich">
              <div className="ber-kopf"><h2 className="serif">Musteranfragen</h2><p>Was du angefragt hast — und wo es steht. Status wird live aus Airtable geladen.</p></div>
              {sentRequests.length === 0
                ? <div className="leer"><div className="gr">Noch keine Anfrage.</div>Sende im Detail eine Musteranfrage.</div>
                : <div className="anfr-liste">
                  {sentRequests.map(r => (
                    <div key={r.id} className="anfr-row">
                      <div className="anfr-bild">{r.renderUrl ? <img src={r.renderUrl} alt={r.konzeptName || r.productName} /> : <span className="ph">◇</span>}</div>
                      <div className="anfr-info">
                        <span className="anfr-t">{r.konzeptName || r.productName}</span>
                        <span className="anfr-s">{r.productName}{r.supplier ? ` · ${r.supplier}` : ''} · {new Date(r.sentAt).toLocaleDateString('de-CH')}</span>
                      </div>
                      <span className={`anfr-status s-${(r.status || 'Neu').toLowerCase()}`}>{r.status || 'Neu'}</span>
                    </div>
                  ))}
                </div>}
            </div>
          )}
        </div>
      </div>
      {sampleCtx && <SampleModal ctx={sampleCtx} onClose={() => setSampleCtx(null)} onSent={handleSent} />}
    </div>
  );
}
