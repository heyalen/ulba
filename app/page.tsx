'use client';
/* ══════════════════════════════════════════════════════════════════════
   ulba · page.tsx
   Thread-Verlaufsmodell: jeder Suchlauf ist ein Block im Verlauf.
   Verdrahtet gegen /api/search und /api/render.
   Favoriten/Projekte über localStorage.
   v3 — Render-Umbau: Render = Hero, Varianten-Strip, private Render-Historie,
        kein Auto-Render, kein Doppelbild.
   v4 — Cap→Render: caps [{id, imageUrl}], Cap-Großbild, selectedCapId beim Render.
   v5 — Anfrage trägt Original + Wunsch (Schritt 3):
        · caps jetzt [{id, name, imageUrl}] — Cap-Name für die Anfrage.
        · run() merkt sich renderingPrompt (Wunschwerte) zum aktuellen Render.
        · „Muster anfragen" schickt Wunsch-Render-URL, Wunschwerte und Cap-Name mit.
        Original bleibt das verbindliche Teil (System-Link), Wunsch ist Intention.
   v6 — Konzept-Brief: /api/render liefert concept {name, story, rationale,
        produzierbar, szene}. Rahmen ums Render + produzierbare Wunschwerte in die Anfrage.
   v7 — Panel/Chat-Split: Panel = Detail-Inspektor (Teil, Verschluss, Specs, Paket).
        „Design rendern →" schließt das Panel und öffnet den LookTurn im Chat-Verlauf,
        der den unveränderten Render-Motor trägt (Auto-Render nach Commit, Achsen-Cursor,
        Varianten, Konzept-Brief, Muster anfragen). Score-Badges → Empfehlung/kuratiert.
        LookTurn hat zwei Phasen: Brief (Lesart + Rail + Justierung, kein Bild) → „Rendern →"
        → Render-Phase (Bühne, Achsen-Cursor, Nudges, Muster). Kein Auto-Render.
   v8 — Sichtbares „Weil": abgeleitete Identität (Register + Laut) wird im
        Achsen-Cursor als Herleitungssatz gezeigt statt als Koordinate/Zahl.
   v9 — Ableitung statt Auswahl (Agentur-Flow). Der Look-Turn hat drei Phasen:
        ① Brief   — nur Worte. Keine Justierungs-Chips, keine Richtungs-Rail.
        ② Behauptung — /api/render mit dryRun:true. Eine benannte Richtung in
          Prosa, mit dem Weil aus den eigenen Worten des Nutzers, dem Wirkstoff,
          der Zielgruppe und der Palette. KEIN Bild — das Bild beweist erst
          danach. Kostet keinen Render (kein fal.ai-Call).
        ③ Render  — der Beweis, plus Bewegung (leiser/lauter, Nudges).
        Die Richtungs-Rail ist nicht mehr Teil des Weges, sondern liegt hinter
        „andere Richtung?" NACH dem Render — Korrektur, nicht Auswahl.
   v10 — Wolken-Brief (Bakic-Template + Enterprise-Referenz §2/§4). Phase ① ist
        eine Wort-Wolke auf BEDEUTUNGS-Ebene: Haltung · Zielgruppe · Welt/Preis ·
        Wirkstoff. Der Nutzer sagt, WER er ist — nie, wie das Design aussieht
        (Form-Wörter wie „Metallic-Akzent" waren der verbotene Konfigurator).
        Getippte Worte + Freitext = der Brief, den die Ableitung liest.
        Behauptungs-Fix: Wirkstoff kommt aus dem BRIEF des Nutzers, nicht aus
        dem Herkunfts-Tag des Codes (Retinol-Bug).
   v11 — Richtung ändern NUR über Worte. Die Code-Rail ist komplett raus
        (Design-Code-Namen als Karten waren Auswahl, nicht Ableitung). Die
        Wort-Wolke steht in JEDER Phase am Feld: Worte ändern → „Neu ableiten"
        → neue Behauptung → neuer Render. Jeder Render schreibt einen
        Verlaufs-Eintrag (»Worte« → Richtung) in den Commit — persistiert,
        nichts wird überschrieben.
   v12 — Lauf-Modell. Jede Ableitung ist ein EINGEFRORENER Abschnitt im Turn,
        exakt wie Suchblöcke im Chat: »Worte« → Richtung → Bild bleiben stehen,
        für immer. Interaktion gibt es nur im AKTIVEN Bereich ganz unten —
        und der zeigt immer genau EINE Sache: Wolke+Feld ODER Behauptung.
        Details (Palette/Radar/Story) liegen pro Lauf hinter „Details".
        Nudges + Laut-Cursor + Muster hängen am letzten Lauf. Kein Zustand
        wird mehr ersetzt — „Neu ableiten" ERGÄNZT.
   v13 — Atmende Wolke + Live-Lesart. Haltung ist keine Chip-Reihe mehr,
        sondern 12 ANKER-Worte; ein Tap öffnet die Nachbarschaft des Ankers
        (~6 feinere Worte) — progressive Enthüllung statt Formular: ~100
        kuratierte Begriffe, aber nie mehr als ~20 sichtbar. Während der
        Nutzer Worte sammelt, spricht die LIVE-LESART mit (deterministisch,
        Wort→Achsen-Signal, 0 LLM-Kosten): „Ich lese dich: luxuriös-rituell ·
        sehr leise · Vitamin C gibt die Farbwelt." Der Ableiten-Klick
        bestätigt nur noch, was sich aufgebaut hat. Vokabular + Signale sind
        Start-Kuratierung — Alens Handwerk, wächst in den Konstanten.
   v13.1 — Deckungs-Kopplung an die Design_Code-Tabelle. Jedes Wolken-Wort
        wird live gegen die gate-kompatiblen Codes DIESES Teils geprüft
        (Signal → Register/Laut-Region → Anzahl Codes). Region leer → Wort
        gedimmt + ehrlicher Tooltip („leiten zur nächstgelegenen Welt ab").
        Wächst die Tabelle, leuchten die Wörter von selbst auf — die Wolke
        ist der Live-Spiegel der Archiv-Dichte, ohne Deploy, ohne Pflege.
   v14 — Emergentes Vokabular aus der Tabelle. /api/vokabular liefert die
        von Skript 7 aus den Wirkung_Beschreibung-Texten destillierten
        Wörter (Tabelle Wolken_Vokabular); sie erscheinen als zusätzliche
        Nachbarn unter ihren Ankern und tragen eigene Achsen-Signale.
        Kuratiertes Skelett (12 Anker) + emergentes Fleisch: jedes neue
        Referenzprodukt macht die Wolke reicher — ohne Frontend-Deploy.
        Fetch scheitert → Wolke fällt lautlos aufs kuratierte Set zurück.
   v14.1 — Dublettenfreier Brief. Wörter, die im Freitext schon stehen,
        werden nicht noch einmal angehängt („ruhig teuer Vitamin C" + Chip
        „ruhig" ergab „…, ruhig, Luxus, Vitamin C"). Die weil-Zeile zitiert
        den Nutzer, also darf sie sich nicht wiederholen.
   v14.2 — Ehrliche Lesart + Widerspruchs-Warnung. Die Live-Lesart wertete
        nur die getippten Chips aus, der echte Brief enthält aber auch den
        FREITEXT. Stand dort noch „ruhig", während oben „mutig" geklickt war,
        versprach die Lesart „sehr laut" — und die Ableitung lieferte
        „ausgewogen" (Haiku mittelt den Widerspruch). Jetzt scannt die Lesart
        den ganzen Brief, und widersprechen sich Freitext und Chips auf der
        Laut-Achse, sagt ulba es offen, statt still zu mitteln.
   v14.3 — Brief startet leer. Das Freitextfeld war mit der PACKMITTEL-SUCHE
        vorbefüllt („30ml Glas Pump", „Premium anti-aging …"). Damit schleppte
        jeder Design-Brief die Hardfact-Suche mit und überstimmte die Wolke.
        Suche = Hardfacts (welches Teil), Brief = Bedeutung (welche Marke) —
        zwei Ebenen, die nichts miteinander zu tun haben. Das Feld beginnt
        jetzt leer; nur ein bereits gespeicherter Brief wird wiederhergestellt.
   ►►► ZU VERIFIZIEREN gegen die echte /api/search-Antwort ◄◄◄
   Suche nach ANNAHME: — dort stehen die erwarteten Feldnamen.
   ══════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

const RENDER_API = 'https://ulba-vision-renderer.vercel.app/api/render';
const SEARCH_API = 'https://ulba-vision-renderer.vercel.app/api/search';
const VOKAB_API = 'https://ulba-vision-renderer.vercel.app/api/vokabular';

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
  { dim: 'materials', label: 'Material', opt: ['Glass', 'PP', 'PETG', 'Acrylic', 'Aluminium'] },
  { dim: 'sizes', label: 'Volumen', opt: ['15ml', '30ml', '50ml', '75ml', '100ml', '200ml'] },
  { dim: 'closures', label: 'Verschluss', opt: ['ScrewCap', 'Pump', 'Dropper', 'Spray', 'FlipTop'] },
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
    id: string; name: string; umleitung?: string | null;
    laut?: number | null; register?: string | null;
    can_quieter?: boolean; can_louder?: boolean;
    // v27-Backend: Material für die Behauptung.
    beschreibung?: string | null; wirkstoff_welt?: string[]; zielgruppe?: string[];
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

/* ── Achse → Sprache: übersetzt die abgeleitete Identität in einen
   Herleitungssatz. Kein Menü, keine Zahl — die Ableitung, sichtbar gemacht.
   register + laut kommen aus concept.design_code (parseIdentity im Backend). */
const REGISTER_SPRACHE: Record<string, string> = {
  'pharma-klinisch':  'klinisch-präzise',
  'tech-premium':     'technisch-edel',
  'clean-minimal':    'clean-reduziert',
  'natur-erdig':      'natürlich-erdig',
  'luxus-ritual':     'luxuriös-rituell',
  'masse-funktional': 'funktional-laut',
};
function lautWort(l: number): string {
  if (l <= 2) return 'sehr leise';
  if (l <= 4) return 'leise';
  if (l <= 6) return 'ausgewogen';
  if (l <= 8) return 'laut';
  return 'sehr laut';
}
/* Wirkstoff- und Zielgruppen-Tags in Agentursprache. Die Tags sind
   Datenbank-Vokabular (GenZ_DTC, Vitamin_C_Glow) — im Screen darf nur
   stehen, was ein Mensch auch sagen würde. */
const WIRKSTOFF_SPRACHE: Record<string, string> = {
  'Vitamin_C_Glow':      'Vitamin C',
  'Retinol_Anti_Aging':  'Retinol',
  'Hyaluron_Hydration':  'Hyaluron',
  'Sensitiv_Barriere':   'Barrierepflege',
  'Akne_Klaerung':       'Klärung',
  'Botanisch_Natur':     'Botanik',
  'Sonne_Schutz':        'Sonnenschutz',
  'Haar':                'Haarpflege',
  'Duft':                'Duft',
  'Universal':           'universell',
};
const ZIELGRUPPE_SPRACHE: Record<string, string> = {
  'Quiet_Luxury':    'Quiet Luxury',
  'Klinisch_Derma':  'klinische Derma-Käuferin',
  'GenZ_DTC':        'junge DTC-Käuferin',
  'Clean_Botanical': 'Clean-Botanical-Käuferin',
};
const spracheAus = (map: Record<string, string>, tags?: string[]): string[] =>
  (tags || []).map(t => map[t] || t.replace(/_/g, ' '));

/* ── Brief-Vokabular (v10) — die tippbare Wolke der Brief-Phase.
   Struktur folgt dem Bakic-Briefing-Template (Marke → Zielgruppe/Preis →
   Wirkstoff → Kanal) und der Enterprise-Referenz §2: alles Bedeutungs-Ebene.
   HARTE REGEL: hier stehen NIE Form-Wörter (Farben, Finishes, Veredelung) —
   das wäre der Pre-Render-Konfigurator. Der Nutzer beschreibt sich; die
   Form leitet die Engine ab. Kuratierung = Alens Handwerk; das hier ist der
   Start-Satz, parseIdentity versteht jedes dieser Worte als Freitext. */
/* v13 — Haltungs-ANKER mit Nachbarschaften. Ein Anker trägt ein Achsen-
   Signal (welt = Register-Hinweis, laut = Delta auf der Laut-Achse); seine
   Kinder erben es für die Live-Lesart. Immer Bedeutungs-Ebene, nie Form. */
interface BriefAnker { w: string; kinder: string[]; welt?: string; laut?: number }
const HALTUNG_ANKER: BriefAnker[] = [
  { w: 'ruhig',      laut: -3, kinder: ['still', 'zurückhaltend', 'meditativ', 'Understatement', 'Spa-Ruhe', 'Morgenritual'] },
  { w: 'laut',       laut: +3, kinder: ['knallig', 'frech', 'Statement', 'Dopamin', 'Popkultur', 'maximal'] },
  { w: 'warm',                 kinder: ['herzlich', 'sinnlich', 'einladend', 'geborgen', 'mediterran', 'sommerlich'] },
  { w: 'kühl',                 kinder: ['nordisch', 'sachlich', 'distanziert', 'frisch', 'nüchtern', 'technisch-kühl'] },
  { w: 'klinisch',   welt: 'pharma-klinisch', kinder: ['dermatologisch', 'evidenzbasiert', 'Apotheken-Ernst', 'Labor', 'steril', 'wie verschrieben'] },
  { w: 'natürlich',  welt: 'natur-erdig',     kinder: ['erdig', 'botanisch', 'roh', 'handgemacht', 'nachhaltig', 'vom Feld'] },
  { w: 'edel',       welt: 'luxus-ritual', laut: +1, kinder: ['luxuriös', 'rituell', 'zeremoniell', 'Boutique', 'zeitlos', 'exklusiv'] },
  { w: 'verspielt',  laut: +2, kinder: ['humorvoll', 'ironisch', 'süß', 'Pop', 'leichtfüßig', 'Gen-Z-Witz'] },
  { w: 'mutig',      laut: +2, kinder: ['rebellisch', 'unangepasst', 'kompromisslos', 'disruptiv', 'Punk', 'selbstbewusst'] },
  { w: 'reduziert',  welt: 'clean-minimal', laut: -2, kinder: ['minimal', 'essenziell', 'wesentlich', 'clean', 'aufgeräumt', 'leise Präsenz'] },
  { w: 'technisch',  welt: 'tech-premium',  kinder: ['präzise', 'ingenieurhaft', 'futuristisch', 'performant', 'Labor-Chic', 'smart'] },
  { w: 'alltagsnah', welt: 'masse-funktional', kinder: ['ehrlich', 'funktional', 'unkompliziert', 'für jeden Tag', 'Drogerie-nah', 'zugänglich'] },
];
// Kind → Anker und Wort → Signal, einmal beim Laden abgeleitet.
const KINDER_VON: Record<string, string[]> = {};
const WORT_SIGNAL: Record<string, { welt?: string; laut?: number }> = {};
for (const a of HALTUNG_ANKER) {
  KINDER_VON[a.w] = a.kinder;
  WORT_SIGNAL[a.w] = { welt: a.welt, laut: a.laut };
  for (const k of a.kinder) WORT_SIGNAL[k] = { welt: a.welt, laut: a.laut };
}

const BRIEF_VOKABULAR: { lbl: string; worte: string[] }[] = [
  { lbl: 'Zielgruppe',  worte: ['Gen Z', '20–35', 'ab 40', 'all-gender', 'männlich'] },
  { lbl: 'Welt & Preis', worte: ['Apotheke', 'Drugstore', 'Instagram-DTC', 'premium', 'Luxus', 'massentauglich'] },
  { lbl: 'Wirkstoff',   worte: ['Vitamin C', 'Retinol', 'Hyaluron', 'Barrierepflege', 'Klärung', 'Botanik', 'Sonnenschutz'] },
];

/* v14 — emergentes Vokabular aus Wolken_Vokabular (via /api/vokabular).
   Modul-Singleton: einmal pro Session geladen, alle Turns teilen es.
   Fehlschlag → leeres Array → Wolke läuft rein kuratiert weiter. */
interface VokabWort { wort: string; anker: string; register: string | null; laut_delta: number | null }
let VOKAB_CACHE: VokabWort[] | null = null;
let VOKAB_LADEND: Promise<VokabWort[]> | null = null;
function ladeVokabular(): Promise<VokabWort[]> {
  if (VOKAB_CACHE) return Promise.resolve(VOKAB_CACHE);
  if (VOKAB_LADEND) return VOKAB_LADEND;
  VOKAB_LADEND = fetch(VOKAB_API)
    .then(r => r.json())
    .then(d => { VOKAB_CACHE = Array.isArray(d?.worte) ? d.worte : []; return VOKAB_CACHE as VokabWort[]; })
    .catch(() => { VOKAB_CACHE = []; return []; });
  return VOKAB_LADEND;
}

/* Live-Lesart: spricht mit, während Worte gesammelt werden. Deterministisch
   aus WORT_SIGNAL — der Agentur-Move „ich höre zu" kostet nichts und kommt
   sofort. Die echte Ableitung (Haiku) bestätigt danach nur noch. */
/* v13.1 — Deckung eines Wolken-Worts im Archiv, gemessen an den gate-
   kompatiblen Codes des aktuellen Teils. welt-Signal → Codes dieses
   Registers; reines laut-Signal → Codes im Laut-Fenster (±2 um 5+delta).
   null = neutrales Wort (warm/kühl etc.), zählt immer als gedeckt. */
function wortDeckung(w: string, looks: LookMitStatus[], signale: Record<string, { welt?: string; laut?: number }>): number | null {
  const s = signale[w];
  if (!s || (!s.welt && s.laut == null)) return null;
  if (s.welt) return looks.filter(l => l.register === s.welt).length;
  const ziel = 5 + (s.laut || 0);
  return looks.filter(l => l.temp_laut != null && Math.abs((l.temp_laut as number) - ziel) <= 2).length;
}

function liveLesart(worte: string[], freitext: string, signale: Record<string, { welt?: string; laut?: number }>): { text: string | null; konflikt: string | null } {
  // v14.2: Der Brief = Chips + Freitext. Beide zählen — sonst spiegelt die
  // Lesart etwas anderes wider als das, was die Ableitung tatsächlich liest.
  const frei = freitext.toLowerCase();
  const ausFreitext = Object.keys(signale).filter(w => {
    const wl = w.toLowerCase();
    return wl.length > 2 && !worte.includes(w) && new RegExp(`(^|[^a-zäöüß])${wl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zäöüß]|$)`).test(frei);
  });
  const alle = [...worte, ...ausFreitext];
  let laut = 5, lautN = 0, minD = 0, maxD = 0;
  const welten: Record<string, number> = {};
  for (const w of alle) {
    const s = signale[w];
    if (!s) continue;
    if (s.laut != null) {
      laut += s.laut; lautN++;
      if (s.laut < minD) minD = s.laut;
      if (s.laut > maxD) maxD = s.laut;
    }
    if (s.welt) welten[s.welt] = (welten[s.welt] || 0) + 1;
  }
  // Widerspruch: gleichzeitig deutlich leise UND deutlich laute Signale.
  const konflikt = (minD <= -2 && maxD >= 2)
    ? 'Dein Brief sagt leise und laut zugleich — ulba mittelt das aus. Streich eines von beiden für eine klare Richtung.'
    : null;
  const welt = Object.keys(welten).sort((a, b) => welten[b] - welten[a])[0] || null;
  const teile: string[] = [];
  if (welt) teile.push(REGISTER_SPRACHE[welt] || welt);
  if (lautN > 0) teile.push(lautWort(Math.max(0, Math.min(10, laut))));
  const wk = wirkstoffAusBrief(worte.join(' ') + ' ' + freitext);
  if (wk) teile.push(wk + ' gibt die Farbwelt');
  return { text: teile.length ? teile.join(' · ') : null, konflikt };
}

/* Wirkstoff aus dem BRIEF des Nutzers erkennen — für die Behauptung.
   Der Code trägt zwar ein Wirkstoff-Tag, aber das ist seine HERKUNFT
   (das Referenzprodukt), nicht die Welt des Nutzers. Die Behauptung darf
   nur zeigen, was der Nutzer gesagt hat. */
const WIRKSTOFF_ERKENNUNG: [RegExp, string][] = [
  [/vitamin\s*c/i, 'Vitamin C'],
  [/retinol/i, 'Retinol'],
  [/hyaluron/i, 'Hyaluron'],
  [/barriere|sensitiv/i, 'Barrierepflege'],
  [/akne|kl(ä|ae)rung/i, 'Klärung'],
  [/botani|pflanz/i, 'Botanik'],
  [/sonne|spf|\buv\b/i, 'Sonnenschutz'],
];
function wirkstoffAusBrief(brief: string): string | null {
  for (const [re, name] of WIRKSTOFF_ERKENNUNG) if (re.test(brief)) return name;
  return null;
}

function identitaetSatz(register?: string | null, laut?: number | null): string {
  const teile: string[] = [];
  if (register && REGISTER_SPRACHE[register]) teile.push(REGISTER_SPRACHE[register]);
  else if (register) teile.push(register.replace(/-/g, ' '));
  if (laut != null) teile.push(lautWort(laut));
  return teile.join(' · ');
}

/* ── Die Behauptung (Phase ②) ────────────────────────────────────────
   Der Agentur-Moment: EINE benannte Richtung, hergeleitet, in Prosa, ohne
   Bild. Alles hier kommt aus dem dryRun-Concept — es ist derselbe Code, den
   der Render danach benutzt, deshalb kann der Screen nie etwas anderes
   behaupten als das Bild zeigt.
   Bewusst NICHT gezeigt: design_code.beschreibung. Die beschreibt das
   Referenzprodukt des Codes (bei Golden Ritual: goldener Zylinder), nicht
   das gewählte Teil — sie würde ein Gebinde versprechen, das der Nutzer
   nicht gewählt hat. Sie liegt im Payload für die Haiku-Verwebung (Stufe 2). */
function Behauptung({ concept, teilName, briefWorte, onZeigen, laden }: {
  concept: RenderConcept; teilName: string; briefWorte: string;
  onZeigen: () => void; laden: boolean;
}) {
  const dc = concept.design_code;
  // Retinol-Bug-Fix: Wirkstoff kommt aus dem Brief des NUTZERS. Das Tag am
  // Code (dc.wirkstoff_welt) ist Herkunft, nicht Aussage — es bleibt im
  // Payload fürs Ranking, erscheint aber nicht als Behauptung.
  const wirk = wirkstoffAusBrief(briefWorte);
  const ziel = spracheAus(ZIELGRUPPE_SPRACHE, dc?.zielgruppe);
  const hex = concept.palette?.hex || [];
  // Die Umleitung ist keine Fußnote, sondern eine Design-Entscheidung: auf
  // klarem Glas wandert die Farbe in die Formel. Wer das verschweigt, lässt
  // den Nutzer über das Bild rätseln.
  const umgeleitet = !!dc?.umleitung;
  return (
    <div className="behaupt">
      <div className="bh-eyebrow">Unsere Richtung</div>
      <h4 className="bh-titel">{concept.konzept_name}</h4>
      {concept.story && <p className="bh-story">{concept.story}</p>}

      <div className="bh-weil">
        <span className="bh-weil-lbl">weil</span>
        <div className="bh-weil-txt">
          {briefWorte && <>du <b>{briefWorte}</b> gesagt hast</>}
          {ziel.length > 0 && <> · ihr sprecht <b>{ziel.join(' & ')}</b></>}
          {wirk && <> · <b>{wirk}</b> als Wirkstoff-Welt</>}
          {dc?.register && <> · das heißt <b>{identitaetSatz(dc.register, dc.laut)}</b></>}
        </div>
      </div>

      {umgeleitet && (
        <div className="bh-hinweis">
          <b>{teilName}</b> ist klar und nicht einfärbbar — die Farbe legen wir
          deshalb in die Formel statt in die Wand. Das Gebinde bleibt
          transparent, die Flüssigkeit trägt den Ton. Machbarkeit bestätigen
          wir per Muster.
        </div>
      )}

      {hex.length > 0 && (
        <div className="bh-pal">
          {hex.map((h, i) => <span key={i} className="bh-sw" style={{ background: h }} title={h} />)}
          <span className="bh-pal-nm">{concept.palette?.name}</span>
        </div>
      )}

      <button className="bh-cta" onClick={onZeigen} disabled={laden}>
        {laden ? 'Rendert …' : 'Zeig es mir →'}
      </button>
    </div>
  );
}

/* ── Emotions-Balken (animiert, 0–10) — dynamisch statt statisch ──── */
const RADAR_AXES: { key: string; label: string }[] = [
  { key: 'waerme', label: 'Wärme' },
  { key: 'prestige', label: 'Prestige' },
  { key: 'energie', label: 'Energie' },
  { key: 'ruhe', label: 'Ruhe' },
  { key: 'natuerlichkeit', label: 'Natur' },
  { key: 'praezision', label: 'Präzision' },
];
function EmotionBars({ radar }: { radar: Record<string, number> }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(false); const t = setTimeout(() => setOn(true), 80); return () => clearTimeout(t); }, [radar]);
  return (
    <div className="ebars">
      {RADAR_AXES.map((a, i) => {
        const v = Math.max(0, Math.min(100, radar[a.key] ?? 50));
        return (
          <div className="ebar" key={a.key}>
            <span className="eb-lbl">{a.label}</span>
            <span className="eb-track">
              <span className="eb-fill" style={{ width: on ? `${v}%` : '0%', transitionDelay: `${i * 70}ms` }}>
                <span className="eb-dot" />
              </span>
            </span>
            <span className="eb-val">{Math.round(v / 10)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Frame-Headline — Konzeptname als Agentur-Titel ───────────────── */
function FrameHead({ concept }: { concept: RenderConcept }) {
  if (!concept.konzept_name && !concept.story) return null;
  return (
    <div className="frame-head">
      <div className="fh-eyebrow">Design-Direction</div>
      {concept.konzept_name && <div className="fh-title">{concept.konzept_name}</div>}
      {concept.story && <div className="fh-sub">{concept.story}</div>}
    </div>
  );
}

/* ── SpecSheet — Guideline-Footer: Wortmarke · Palette · Emotion ──── */
function SpecSheet({ concept }: { concept: RenderConcept }) {
  const label = concept.label;
  const pal = concept.palette;
  const radar = concept.radar;
  const zp = concept.zielprofil || [];
  if (!label && !(pal && pal.hex?.length) && !radar) return null;
  return (
    <div className="frame-spec">
      {label && (
        <div className="fs-label">
          <div className="fsl-mark">{(label.wortmarke || '—').toUpperCase()}</div>
          <div className="fsl-kat">{label.kategorie}</div>
          {label.ist_platzhalter && <div className="fsl-hint">Platzhalter — eigenen Markennamen unten setzen</div>}
        </div>
      )}

      <div className="fs-grid">
        {pal && pal.hex?.length > 0 && (
          <div className="fs-col">
            <div className="fs-cap">Palette · {pal.name}</div>
            <div className="fs-chips">
              {pal.hex.map((h, i) => (
                <div key={i} className="fs-chip">
                  <span className="fsc-sw" style={{ background: h }} />
                  <span className="fsc-hex">{h}</span>
                  {pal.pantone?.[i] && <span className="fsc-pan">{pal.pantone[i]}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {radar && (
          <div className="fs-col">
            <div className="fs-cap">Emotionales Profil</div>
            <EmotionBars radar={radar} />
            {zp.length > 0 && <div className="fs-tags">{zp.join(' · ')}</div>}
          </div>
        )}
      </div>

      {concept.rationale && <div className="fs-why">{concept.rationale}</div>}
    </div>
  );
}

// ►►► ANNAHME: /api/search liefert results: Result[] mit diesen Feldern.
interface Result {
  id: string; name: string; score: number; reasoning: string;
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
  alleZeigen: boolean;
  status: 'loading' | 'done' | 'error';
  capWall?: CapWall; // Verschluss-Wand aus /api/search (deprioritize_open_dropper)
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

function loadProjects(): Project[] {
  try { const raw = localStorage.getItem(LS_PROJECTS); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
function saveProjects(p: Project[]) { try { localStorage.setItem(LS_PROJECTS, JSON.stringify(p)); } catch {} }
function neueProjektId(): string { return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function loadFavorites(): FavoriteEntry[] {
  try { const raw = localStorage.getItem(LS_FAVORITES); if (raw) return JSON.parse(raw); } catch {}
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
  --serif:'Archivo',system-ui,sans-serif;
  --sans:'Archivo',system-ui,sans-serif;
  --mono:'Archivo',system-ui,sans-serif;
}
.ulba{background:var(--porzellan);color:var(--tinte);height:100dvh;font-family:var(--sans);font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased;display:grid;grid-template-columns:248px 1fr;overflow:hidden}
.ulba *{box-sizing:border-box}
.ulba button{font:inherit;color:inherit;background:none;border:none;cursor:pointer}
.ulba input,.ulba textarea{font:inherit}
.ulba :focus-visible{outline:1.5px solid var(--tinte);outline-offset:2px}
.serif{font-family:var(--serif);font-weight:800;letter-spacing:-.01em} .kursiv{font-family:var(--serif);font-style:normal}
.mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
.nav{border-right:1px solid var(--linie);padding:16px 12px;display:flex;flex-direction:column;gap:3px;overflow-y:auto}
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
.refine{flex:none;border-top:1px solid var(--linie);padding:14px clamp(16px,4vw,54px)}
.refine .feld{max-width:900px;margin:0 auto;border-radius:13px;padding:4px 4px 4px 18px;box-shadow:none}
.grp-titel{font-family:var(--serif);font-size:20px;font-weight:800;letter-spacing:-.01em;margin:28px 0 14px}
.grp-titel:first-child{margin-top:0}
.refine .feld input{padding:11px 4px;font-size:14px}
.msg-user{display:flex;justify-content:flex-end;margin:16px 0}
.msg-user span{background:var(--tinte);color:#fff;padding:11px 17px;border-radius:16px 16px 4px 16px;font-size:14.5px;max-width:78%}
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
.lookturn{border:1px solid var(--linie);border-radius:var(--r);background:var(--panel);max-width:720px;margin:14px 0 6px;padding:0 0 4px;display:flex;flex-direction:column;overflow:hidden}
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
.behaupt{margin:2px 24px 16px;border:1px solid var(--linie);border-radius:var(--r);background:#FFFFFF;padding:22px 24px 20px}
.bh-eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--rouge)}
.bh-titel{font-family:var(--serif);font-weight:800;font-size:29px;line-height:1.05;letter-spacing:-.015em;color:var(--tinte);margin-top:7px}
.bh-story{font-family:var(--serif);font-size:16px;line-height:1.45;color:var(--grau);margin-top:9px;max-width:52ch}
.bh-weil{display:flex;gap:11px;margin-top:17px;padding-top:15px;border-top:1px solid var(--linie2)}
.bh-weil-lbl{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--hell);padding-top:3px;flex:none}
.bh-weil-txt{font-size:14px;line-height:1.55;color:var(--grau);max-width:56ch}
.bh-weil-txt b{font-weight:600;color:var(--tinte)}
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
.lauf-worte{display:inline-block;background:var(--tinte);color:#fff;padding:7px 14px;border-radius:14px 14px 4px 14px;font-size:13px;margin-bottom:9px}
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
  .nav{position:fixed;left:0;top:0;bottom:0;width:248px;z-index:60;transform:translateX(-100%);transition:transform .25s;box-shadow:0 0 40px -10px rgba(0,0,0,.2);background:var(--porzellan)}
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

/* ── Chat-Wolke — der abgeleitete „Welt"-Kopf im Ergebnis-Block.
   Zeigt die Design-Codes als Wolke: Best-Fit groß, Nachbarn mittel, ferne
   ausgegraut. Reiner Ableitungs-/Wow-Moment (kein Render, kostenlos, sofort).
   Klick pinnt die bevorzugte Welt → wird beim Öffnen eines Teils vorgewählt. */
function ChatWolke({ looks, pal, preferred, onPick }: {
  looks: DesignLook[]; pal: string; preferred: string | null; onPick: (id: string) => void;
}) {
  if (!looks || looks.length === 0) return null;
  const sorted = [...looks].sort((a, b) => b.axis_score - a.axis_score);
  const near = sorted.slice(0, 4), far = sorted.slice(4);
  const chip = (l: DesignLook, cls: string) => (
    <button key={l.code_id} type="button"
      className={`cw ${cls}${preferred === l.code_id ? ' an' : ''}`}
      onClick={() => onPick(l.code_id)}
      title={l.register}>
      <span className="cw-dot" style={{ background: l.body_hex || '#eee' }} />{l.code_name}
    </button>
  );
  return (
    <div className="wolke">
      <div className="wolke-read">Ich lese dich als <b>{pal}</b> · deine Welt:</div>
      <div className="wolke-cloud">
        {near.map((l, i) => chip(l, i === 0 ? 'best' : ''))}
        {far.map(l => chip(l, 'far'))}
      </div>
      <div className="wolke-foot">deine Region hervorgehoben · ferne Welten ausgegraut · {looks.length} Welten</div>
    </div>
  );
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

/* ── Detail-Panel rechts: Inspektor. Teil ansehen, Verschluss wählen, Specs.
   Kein Render hier — „Design rendern →" schließt das Panel und öffnet den Look-Turn im Chat. ── */
function DetailPanel({ product, capWall, cap, onCap, isFav, inBoard, onFav, onBoard, onCommit, onClose }: {
  product: Result; capWall?: CapWall; cap: number; onCap: (i: number) => void;
  isFav: boolean; inBoard: boolean; onFav: () => void; onBoard: () => void; onCommit: () => void; onClose: () => void;
}) {
  const { caps, dropperDepri } = capsFuer(product, capWall);
  const istPipette = istPipetteCap;
  const capIdx = Math.min(cap, Math.max(0, caps.length - 1));
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
        <div className="pn-bild" style={{ width: '100%' }}>
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.name} />
            : <span style={{ fontSize: 72, color: '#e2e2e0' }}>◇</span>}
        </div>
      </div>
      <div className="pn-prov" style={{ textAlign: 'center', fontSize: 12, color: '#9a9a97', marginTop: 8, fontFamily: 'var(--mono)', letterSpacing: '.03em' }}>
        blanko · reales Teil · der Look entsteht im Chat
      </div>

      <div className="pn-body">
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
        <button className="cta" onClick={onCommit}>Design rendern →</button>
        <button className={`cta-sek${inBoard ? ' an' : ''}`} onClick={onBoard}>{inBoard ? '✓ im Paket' : '+ Paket'}</button>
      </div>
    </aside>
  );
}

/* ── Look-Turn (v12, Lauf-Modell): eingefrorene Läufe + EIN aktiver Bereich.
   Jeder abgeschlossene Render wird als Lauf an den Commit gehängt und nie
   wieder angefasst — wie ein Suchblock im Chat. Der aktive Bereich unten
   zeigt immer genau eine Sache: Wolke+Feld (Brief) oder die Behauptung. ── */
function LookTurn({ product, allLooks, capWall, initialCap, savedBrief, savedJustier, laeufe, onBrief, onLauf, onSample, onClose }: {
  product: Result; allLooks: DesignLook[]; capWall?: CapWall;
  initialCap: number; savedBrief?: string; savedJustier?: string[];
  laeufe: Lauf[];
  onBrief: (brief: string, justier: string[]) => void;
  onLauf: (l: Lauf) => void;
  onSample: (ctx: SampleContext) => void; onClose: () => void;
}) {
  // v14.3: leer starten — die Packmittel-Suche gehört NICHT in den Design-Brief.
  const [query, setQuery] = useState(savedBrief || '');
  const [justier, setJustier] = useState<string[]>(savedJustier || []);
  const toggleJust = (t: string) => setJustier(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  // v14.1: Chips, deren Wort bereits im Freitext steht, fallen raus —
  // sonst zitiert die weil-Zeile denselben Begriff doppelt.
  const briefText = useMemo(() => {
    const frei = query.trim();
    const freiLower = frei.toLowerCase();
    const extra = justier.filter(w => !freiLower.includes(w.toLowerCase()));
    return [frei, ...extra].filter(Boolean).join(', ');
  }, [query, justier]);

  // Kompatible Richtungen — nur noch Info („kann N Richtungen tragen"). Die
  // Wahl trifft die Ableitung; es gibt keine Code-Auswahl im UI.
  const compatLooks = useMemo(() => looksForBase(product, allLooks || []), [product, allLooks]);
  const { caps } = capsFuer(product, capWall);
  const [cap, setCap] = useState(initialCap);

  const [phase, setPhase] = useState<'brief' | 'behauptung'>('brief');
  const [dryConcept, setDryConcept] = useState<RenderConcept | null>(null);
  const [dryStatus, setDryStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [rstatus, setRstatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [rerror, setRerror] = useState('');
  const [detailsLauf, setDetailsLauf] = useState<number | null>(null);
  const letzt = laeufe.length ? laeufe[laeufe.length - 1] : null;

  // v13: geöffnete Nachbarschaft + Live-Lesart. Anker abwählen räumt auch
  // seine gewählten Kinder ab — halbe Zustände verwirren mehr als sie helfen.
  const [offenAnker, setOffenAnker] = useState<string | null>(null);
  // v14: emergentes Vokabular — einmal laden, dann mergen.
  const [vokab, setVokab] = useState<VokabWort[]>(VOKAB_CACHE || []);
  useEffect(() => { ladeVokabular().then(setVokab); }, []);
  const signale = useMemo(() => {
    const m: Record<string, { welt?: string; laut?: number }> = { ...WORT_SIGNAL };
    for (const v of vokab) m[v.wort] = { welt: v.register || undefined, laut: v.laut_delta ?? undefined };
    return m;
  }, [vokab]);
  const kinderVon = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const a of HALTUNG_ANKER) m[a.w] = [...a.kinder];
    for (const v of vokab) {
      if (!m[v.anker]) continue;
      if (!m[v.anker].includes(v.wort)) m[v.anker].push(v.wort);
    }
    return m;
  }, [vokab]);
  const toggleAnker = (a: string) => {
    if (justier.includes(a)) {
      const kinder = kinderVon[a] || [];
      setJustier(prev => prev.filter(x => x !== a && !kinder.includes(x)));
      if (offenAnker === a) setOffenAnker(null);
    } else {
      setJustier(prev => [...prev, a]);
      setOffenAnker(a);
    }
  };
  const lesart = liveLesart(justier, query, signale);

  useEffect(() => {
    setQuery(savedBrief || '');
    setJustier(savedJustier || []);
    setCap(initialCap);
    setPhase('brief'); setDryConcept(null);
    setDryStatus('idle'); setRstatus('idle'); setRerror('');
    setDetailsLauf(null);
    setOffenAnker(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  /* Brief → Behauptung: gleiche Engine, dryRun — kein Bild, keine Kosten. */
  const ableiten = async () => {
    const q = briefText.trim();
    if (!q) return;
    setDryStatus('loading'); setRerror('');
    try {
      const body: any = { systemId: product.id, query: q, tier: 'lite', dryRun: true };
      const capId = caps[cap]?.id || null;
      if (capId) body.selectedCapId = capId;
      const res = await fetch(RENDER_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Ableitung fehlgeschlagen');
      setDryConcept(data.concept || null);
      setDryStatus('idle');
      setPhase('behauptung');
    } catch (e) {
      setDryStatus('error');
      setRerror(e instanceof Error ? e.message : 'Ableitung fehlgeschlagen');
    }
  };

  /* Render: erzeugt IMMER einen neuen Lauf — nichts wird ersetzt. */
  const rendern = async (worte: string, codeId?: string | null, nudge?: 'quieter' | 'louder') => {
    const q = worte.trim();
    if (!q) return;
    setRstatus('loading'); setRerror('');
    try {
      const body: any = { systemId: product.id, query: q, tier: 'lite' };
      const capId = caps[cap]?.id || null;
      if (capId) body.selectedCapId = capId;
      if (codeId) body.forceCodeId = codeId; // Behauptungs-Code — das Bild darf der Behauptung nicht widersprechen
      if (nudge) body.lautNudge = nudge;
      const res = await fetch(RENDER_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'render failed');
      if (!data.renderingUrl) throw new Error('Kein Bild erhalten');
      onLauf({
        id: Date.now(),
        worte: q + (nudge ? (nudge === 'quieter' ? ' · leiser' : ' · lauter') : ''),
        heroUrl: data.renderingUrl,
        capRenderUrl: data.capRenderingUrl || null,
        lastPrompt: data.renderingPrompt || '',
        concept: data.concept || null,
      });
      setRstatus('idle');
      setPhase('brief'); setDryConcept(null);
    } catch (e) {
      setRstatus('error');
      setRerror(e instanceof Error ? e.message : 'Render fehlgeschlagen');
    }
  };

  const zeigen = () => { onBrief(briefText, justier); rendern(briefText, dryConcept?.design_code?.id || null); };
  const nudge = (n: string) => { if (letzt) rendern(`${letzt.worte}, ${n}`, letzt.concept?.design_code?.id || null); };
  const lautCursor = (dir: 'quieter' | 'louder') => {
    if (letzt?.concept?.design_code?.id) rendern(letzt.worte, letzt.concept.design_code.id, dir);
  };
  const anfrage = (l: Lauf) => onSample({
    product,
    renderUrl: l.heroUrl || '',
    wishValues: produzierbarText(l.concept?.produzierbar || null) || l.lastPrompt,
    capLabel: caps[cap]?.name || '',
    konzept: l.concept,
  });

  return (
    <section className="lookturn">
      <div className="pn-kopf">
        <div><div className="lt-eyebrow">Design · auf dem realen Teil</div><h3 className="serif">{product.name}{caps.length > 0 && caps[cap]?.name ? ` + ${caps[cap].name}` : ''}</h3><span className="pn-spec">{specText(product)}</span></div>
        <div className="pn-akt">
          <button className="pn-zu" onClick={onClose} aria-label="schließen">×</button>
        </div>
      </div>

      {laeufe.length === 0 && phase === 'brief' && (
        <div className="lt-lesart">
          <b>{product.name}</b> kann <b>{compatLooks.length}</b> Richtung{compatLooks.length === 1 ? '' : 'en'} tragen.
          <span className="lt-alt"> Welche es wird, sagt dein Brief.</span>
        </div>
      )}

      {/* ── Eingefrorene Läufe: Worte → Richtung → Bild. Bleiben stehen. ── */}
      {laeufe.map((l, i) => {
        const istLetzt = i === laeufe.length - 1;
        const dc = l.concept?.design_code;
        return (
          <div key={l.id} className={`lauf${istLetzt ? '' : ' lauf-alt'}`}>
            <div className="lauf-worte">»{l.worte}«</div>
            {l.concept && (
              <div className="lauf-kopf">
                <b>{l.concept.konzept_name}</b>
                {dc?.register ? <span className="lauf-ident"> — {identitaetSatz(dc.register, dc.laut)}</span> : null}
              </div>
            )}
            <div className="lauf-stage">
              {caps.length > 0 && (l.capRenderUrl || caps[cap]?.imageUrl) && (
                <img className="lauf-cap" src={(l.capRenderUrl || caps[cap].imageUrl) as string} alt="" onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
              )}
              {l.heroUrl && <img className="lauf-hero" src={l.heroUrl} alt={l.concept?.konzept_name || product.name} />}
            </div>
            <div className="lauf-akt">
              {l.concept && (
                <button className="lauf-btn" onClick={() => setDetailsLauf(detailsLauf === l.id ? null : l.id)}>
                  {detailsLauf === l.id ? 'Details ↑' : 'Details ↓'}
                </button>
              )}
              {istLetzt && dc && dc.laut != null && (
                <>
                  <button className="lauf-btn" disabled={rstatus === 'loading' || !dc.can_quieter} onClick={() => lautCursor('quieter')}>← leiser</button>
                  <button className="lauf-btn" disabled={rstatus === 'loading' || !dc.can_louder} onClick={() => lautCursor('louder')}>lauter →</button>
                </>
              )}
              {istLetzt && ['wärmer', 'kühler', 'edler', 'mehr Kontrast'].map(n => (
                <button key={n} className="lauf-btn" disabled={rstatus === 'loading'} onClick={() => nudge(n)}>{n}</button>
              ))}
              {istLetzt && (
                <button className="lauf-cta" disabled={rstatus === 'loading'} onClick={() => anfrage(l)}>Muster anfragen →</button>
              )}
            </div>
            {detailsLauf === l.id && l.concept && (
              <div className="lauf-details">
                {l.concept.story && <div className="lauf-story">{l.concept.story}</div>}
                <SpecSheet concept={l.concept} />
              </div>
            )}
          </div>
        );
      })}

      {rstatus === 'loading' && (
        <div className="lauf lauf-lade"><span className="pn-lade-sp" /> Rendert deine Richtung …</div>
      )}

      {/* ── Aktiver Bereich: genau EINE Sache. ── */}
      {phase === 'behauptung' && dryConcept && rstatus !== 'loading' && (
        <>
          <Behauptung concept={dryConcept} teilName={product.name} briefWorte={briefText}
            laden={false} onZeigen={zeigen} />
          <div className="lt-abl"><button onClick={() => setPhase('brief')}>← Worte ändern</button></div>
        </>
      )}

      {phase === 'brief' && rstatus !== 'loading' && (
        <div className="pn-body">
          <div className="vis">
            <div className="top">{laeufe.length === 0 ? 'Erzähl uns, wer ihr seid' : 'Richtung ändern — in Worten'}</div>
            {/* v13: Haltung als atmende Wolke — Anker öffnen Nachbarschaften. */}
            <div className="bw">
              <div className="bw-anker-wolke">
                {HALTUNG_ANKER.map(a => {
                  const deck = wortDeckung(a.w, compatLooks, signale);
                  const duenn = deck === 0;
                  return (
                    <button key={a.w} type="button"
                      className={`bw-anker${justier.includes(a.w) ? ' an' : ''}${offenAnker === a.w ? ' offen' : ''}${duenn ? ' duenn' : ''}`}
                      title={duenn ? 'In unserem Archiv noch dünn — wir leiten zur nächstgelegenen Welt ab.' : undefined}
                      onClick={() => toggleAnker(a.w)}>{a.w}</button>
                  );
                })}
              </div>
              {offenAnker && (
                <div className="bw-kinder">
                  <span className="bw-kinder-pfeil">{offenAnker} heißt bei euch eher …</span>
                  {(kinderVon[offenAnker] || []).map(k => {
                    const duenn = wortDeckung(k, compatLooks, signale) === 0;
                    return (
                      <button key={k} type="button"
                        className={`lt-chip${justier.includes(k) ? ' an' : ''}${duenn ? ' duenn' : ''}`}
                        title={duenn ? 'In unserem Archiv noch dünn — wir leiten zur nächstgelegenen Welt ab.' : undefined}
                        onClick={() => toggleJust(k)}>{k}</button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="lt-just">
              {BRIEF_VOKABULAR.map(g => (
                <div className="lt-just-row" key={g.lbl}>
                  <span className="lt-just-lbl">{g.lbl}</span>
                  {g.worte.map(w => (
                    <button key={w} type="button"
                      className={`lt-chip${justier.includes(w) ? ' an' : ''}`}
                      onClick={() => toggleJust(w)}>{w}</button>
                  ))}
                </div>
              ))}
            </div>
            {lesart.text && (
              <div className="bw-lesart">Ich lese dich: <b>{lesart.text}</b></div>
            )}
            {lesart.konflikt && (
              <div className="bw-konflikt">{lesart.konflikt}</div>
            )}
            <div className="row">
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') ableiten(); }}
                placeholder="z. B. ruhig, teuer, Vitamin C, für Frauen ab 40" />
              <button className="gen" onClick={ableiten}
                disabled={dryStatus === 'loading' || !briefText.trim()}>
                {dryStatus === 'loading' ? 'Leitet ab …' : laeufe.length === 0 ? 'Ableiten →' : 'Neu ableiten →'}
              </button>
            </div>
            {(dryStatus === 'error' || rstatus === 'error') && (
              <div style={{ fontSize: 13, color: '#dc2626', marginTop: 10 }}>{rerror || 'Fehler — bitte erneut versuchen.'}</div>
            )}
          </div>
        </div>
      )}
    </section>
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
          renderUrl, wishValues, capLabel,
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

/* ── Ergebniskarte ── */
/* Look-Gate (Client) — spiegelt baseSatisfies/checkAnforderung aus search.ts
   & render.ts: welche Design-Codes kann DIESES reale Teil tragen? Damit die
   Richtungs-Rail im Panel nur Produzierbares zeigt (kein stiller Fehlrender). */
const PLASTIC_RE = /pet|petg|pp|hdpe|acryl|surlyn|kunststoff|plastic/i;
// ── Gate-Angleichung Frontend ↔ Backend ───────────────────────────────────
// Der alte binaere Filter (erfuellt/nicht) war STRENGER als render.ts: das
// Backend leitet Koerper-Farb-Looks auf klarem Material in die Fluessigkeit
// um (Typ B) und haelt sie waehlbar — das Frontend warf sie raus. Ergebnis:
// "3 fuer dieses Teil" angezeigt, Auto rendert F've (Platz 4 von 8). Eine
// Auswahl, an die sich die Engine nicht haelt, ist schlimmer als keine.
// Jetzt: Dreiwege-Status mit exakt derselben Entscheidungslogik.
type LookStatus = 'direkt' | 'umgeleitet' | 'blockiert';
function lookStatusFuerBase(base: Result, look: DesignLook): LookStatus {
  const mat = (base.material || []).map(m => m.toLowerCase());
  const caps = (base.capabilities || []).map(c => c.toLowerCase());
  const isGlas = mat.some(m => m.includes('glas') || m.includes('glass'));
  const isPlastic = mat.some(m => PLASTIC_RE.test(m));
  const capHas = (t: string) => caps.some(c => c.includes(t));
  const koerperFaerbbar = isPlastic || capHas('einfaerb') || capHas('lackierbar');
  let umgeleitet = false;
  for (const aRaw of look.anforderungen || []) {
    const a = aRaw.toLowerCase();
    if (a.includes('klarglas') && !isGlas) return 'blockiert';
    if (a.includes('frost') && !(isPlastic || capHas('mattierbar'))) return 'blockiert';
    if ((a.includes('einfaerb') || a.includes('einfärb') || a.includes('opak')) && !koerperFaerbbar) umgeleitet = true;
  }
  // Backend-Trigger ist, was der Code TUT, nicht nur die Anforderungs-Liste:
  // getoenter/gefaerbter Koerper + Farbort 'koerper' braucht Faerbbarkeit.
  const beh = (look.body_behandlung || '').toLowerCase();
  if (['getönt', 'getoent', 'opak_recolor'].includes(beh)
    && (look.farbort || 'koerper') === 'koerper' && !koerperFaerbbar) umgeleitet = true;
  return umgeleitet ? 'umgeleitet' : 'direkt';
}
/* Tragbare Looks fuer ein Teil (direkt + umgeleitet), nach Fit sortiert. */
// ── Look-Vorschau: schematisch, sofort, ohne Render ───────────────────────
// Farbkreise sagten nur, WELCHE Welt — nie, wie sie aussieht. Bei Pink Liquid
// war der Punkt sogar #FFFFFF (das Glas, nicht das Serum): die Wahl war blind.
// Diese Silhouette liest dieselben Felder wie render.ts (Body_Behandlung +
// Farbort + Hex) und zeigt den Unterschied, BEVOR gerendert wird. Bewusst
// schematisch gehalten — es ist eine Richtungsanzeige, kein Render-Versprechen.
const istHex = (h?: string | null) => /^#?[0-9a-fA-F]{6}$/.test((h || '').trim());
const hexOder = (h: string | null | undefined, fb: string) => (istHex(h) ? (h as string) : fb);

function LookVorschau({ look, umgeleitet }: { look: DesignLook; umgeleitet?: boolean }) {
  const beh = (look.body_behandlung || 'opak_recolor').toLowerCase();
  const bodyHex = hexOder(look.body_hex, '#E8E8E6');
  const capHex = hexOder(look.cap_hex, '#D9D9D6');
  // Bei Farbort 'liquid' ist Body_Hex haeufig das Glas (#FFF) — die echte
  // Farbe steht dann im Akzent. Gleiche Ableitung wie in render.ts.
  const farblos = (h: string) => {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(h.trim());
    if (!m) return true;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx === 0 ? true : (mx - mn) / mx < 0.15;
  };
  const fuellHex = farblos(bodyHex)
    ? (istHex(look.akzent_hex) && !farblos(look.akzent_hex) ? look.akzent_hex
      : !farblos(capHex) ? capHex : bodyHex)
    : bodyHex;

  const glasKante = '#C9CBC8';
  let bodyFill = bodyHex, bodyOp = 1, bodyStroke = 'rgba(0,0,0,.14)';
  let liquid: string | null = null;
  if (umgeleitet) {
    // Typ-B-Umleitung: der Look-Koerper ist auf diesem Teil nicht faerbbar,
    // die Farbe wandert in die Fluessigkeit. Vorschau zeigt das ehrlich —
    // klares Gebinde, gefuellt — statt einen opaken Koerper zu versprechen.
    bodyFill = '#FFFFFF'; bodyOp = 0.35; bodyStroke = glasKante;
    liquid = fuellHex as string;
  } else if (beh === 'klar') {
    bodyFill = '#FFFFFF'; bodyOp = 0.35; bodyStroke = glasKante;
    if (look.farbort === 'liquid' || farblos(bodyHex)) liquid = fuellHex as string;
  } else if (beh === 'klar_liquid_farbe') {
    bodyFill = '#FFFFFF'; bodyOp = 0.35; bodyStroke = glasKante; liquid = fuellHex as string;
  } else if (beh === 'frosted') {
    bodyOp = 0.55; bodyStroke = glasKante;
  } else if (beh === 'getoent' || beh === 'getönt') {
    bodyOp = 0.62; bodyStroke = glasKante;
  }

  const bodyPfad = 'M8 15 q0 -3 3 -4 l4 -1.4 h10 l4 1.4 q3 1 3 4 v34 q0 3 -3 3 h-18 q-3 0 -3 -3 z';
  const uid = look.code_id.slice(-6);
  return (
    <svg viewBox="0 0 40 56" className="lv-svg" aria-hidden focusable="false">
      <defs>
        <clipPath id={`lv-${uid}`}><path d={bodyPfad} /></clipPath>
      </defs>
      <rect x="14" y="1.5" width="12" height="7.5" rx="1.6" fill={capHex} stroke="rgba(0,0,0,.14)" strokeWidth=".6" />
      <path d={bodyPfad} fill={bodyFill} fillOpacity={bodyOp} stroke={bodyStroke} strokeWidth=".9" />
      {liquid && (
        <g clipPath={`url(#lv-${uid})`}>
          <rect x="0" y="22" width="40" height="34" fill={liquid} fillOpacity=".9" />
        </g>
      )}
      {look.finish_body === 'glanz' && (
        <g clipPath={`url(#lv-${uid})`}>
          <rect x="11" y="17" width="2.4" height="28" rx="1.2" fill="#fff" fillOpacity=".55" />
        </g>
      )}
    </svg>
  );
}

export type LookMitStatus = DesignLook & { _umgeleitet?: boolean };
function looksForBase(base: Result, all: DesignLook[]): LookMitStatus[] {
  const seen = new Set<string>();
  const out: LookMitStatus[] = [];
  for (const l of all) {
    if (seen.has(l.code_id)) continue;
    seen.add(l.code_id);
    const st = lookStatusFuerBase(base, l);
    if (st === 'blockiert') continue;
    out.push(st === 'umgeleitet' ? { ...l, _umgeleitet: true } : l);
  }
  return out.sort((a, b) => b.axis_score - a.axis_score);
}


function Karte({ r, selected, isFav, isLead, onOpen, onFav }: {
  r: Result; selected: boolean; isFav: boolean; isLead?: boolean; onOpen: () => void; onFav: (e: React.MouseEvent) => void;
}) {
  return (
    <div className={`ek${selected ? ' an' : ''}${isLead ? ' lead' : ''}`}>
      <button className={`favherz${isFav ? ' an' : ''}`} onClick={onFav} aria-label="Favorit">{isFav ? '♥' : '♡'}</button>
      <button className="ek-klick" onClick={onOpen}>
        <div className="ek-bild">{r.imageUrl ? <img src={r.imageUrl} alt={r.name} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.15'; }} /> : <span className="ek-ph">◇</span>}</div>
        <div className="ek-info"><span className="ek-nm">{r.name}</span><span className="ek-spec">{specText(r)}</span></div>
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
  const [selected, setSelected] = useState<Result | null>(null); // Detail-Panel (Inspektor)
  const [selectedCap, setSelectedCap] = useState(0); // im Panel gewählter Verschluss
  const [scrollToCommit, setScrollToCommit] = useState<number | null>(null); // frisch angelegter Look-Turn → hinscrollen
  const [preferredCode, setPreferredCode] = useState<string | null>(null); // im Chat gewählte Welt → Panel-Vorwahl
  const [sampleCtx, setSampleCtx] = useState<SampleContext | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setProjects(loadProjects());
    setFavorites(loadFavorites());
    setSentRequests(loadRequests());
  }, []);

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

  const runSearch = useCallback(async (projectId: string, query: string, filters: ParsedFilters, intro: string, removed?: ParsedFilters) => {
    const rem = removed || emptyFilters();
    let id = 0;
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      id = p.blockSeq + 1;
      return { ...p, blockSeq: id, blocks: [...p.blocks, { id, intro, query, filters, removed: rem, results: [], looks: [], categoryMatch: '', alleZeigen: false, status: 'loading' }] };
    }));
    try {
      const body: any = { query };
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
        ...p, blocks: p.blocks.map(b => b.id === id ? { ...b, results: data.results || [], looks: data.design_looks || [], categoryMatch: data.categoryMatch || '', filters: serverFilters, capWall: data.cap_wall || undefined, status: 'done' } : b),
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

  useEffect(() => {
    if (scrollToCommit == null) return;
    const t = setTimeout(() => {
      document.getElementById(`commit-${scrollToCommit}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setScrollToCommit(null);
    }, 260);
    return () => clearTimeout(t);
  }, [scrollToCommit]);

  // Teil ins Design legen: Commit unter den Block, in dem das Teil steht (persistiert im Projekt).
  const commitTeil = (product: Result, cap: number) => {
    if (!active) return;
    const blk = active.blocks.find(b => b.results.some(r => r.id === product.id)) || active.blocks[active.blocks.length - 1];
    if (!blk) return;
    const id = Date.now();
    patchProject(active.id, p => ({ ...p, blocks: p.blocks.map(b => b.id === blk.id ? { ...b, commits: [...(b.commits || []), { id, productId: product.id, cap, ts: id }] } : b) }));
    setScrollToCommit(id);
  };
  // v12: Läufe eines Commits — mit Migration alter Commits (ein Render in
  // Einzelfeldern) zu genau einem Lauf. Nichts geht verloren.
  const laeufeVon = (c: LookCommit): Lauf[] => {
    if (c.laeufe && c.laeufe.length) return c.laeufe;
    if (c.heroUrl) return [{ id: c.ts, worte: c.brief || '', heroUrl: c.heroUrl, capRenderUrl: c.capRenderUrl || null, lastPrompt: c.lastPrompt || '', concept: c.concept || null }];
    return [];
  };
  const patchCommit = (commitId: number, patch: Partial<LookCommit>) => {
    if (!active) return;
    patchProject(active.id, p => ({ ...p, blocks: p.blocks.map(b => b.commits?.some(c => c.id === commitId) ? { ...b, commits: b.commits!.map(c => c.id === commitId ? { ...c, ...patch } : c) } : b) }));
  };
  const removeCommit = (commitId: number) => {
    if (!active) return;
    patchProject(active.id, p => ({ ...p, blocks: p.blocks.map(b => b.commits?.some(c => c.id === commitId) ? { ...b, commits: b.commits!.filter(c => c.id !== commitId) } : b) }));
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

          {view === 'chat' && active && (
            <div className={`chat${selected ? ' split' : ''}`}>
              <main className="cs-main">
                <div className="thread" ref={threadRef}>
                  <div className="thread-inner">
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
                            {b.status === 'loading' && <ScanBar />}
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
                                <ChatWolke looks={b.looks} pal={pal} preferred={preferredCode} onPick={setPreferredCode} />
                                <div className="eb-kopf"><span className="ebk-h">{zeige.length} Systeme für dich</span><span className="ebk-s">von ulba kuratiert · gelesen als {pal}</span></div>
                                {liste.length === 0
                                  ? <div className="leer"><div className="gr">Keine Treffer.</div>Versuch eine breitere Suche.</div>
                                  : <div className={`eb-grid${selected ? ' schmal' : ''}`}>
                                    {zeige.map((r, i) => <Karte key={r.id} r={r} selected={selected?.id === r.id} isFav={isFav(r.id)} isLead={i === 0 && !selected} onOpen={() => { setSelected(r); setSelectedCap(0); }} onFav={e => { e.stopPropagation(); quickFav(r); }} />)}
                                  </div>}
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
                            {(b.commits || []).map(c => {
                              const prod = b.results.find(r => r.id === c.productId) || board.find(r => r.id === c.productId);
                              if (!prod) return null;
                              return (
                                <div key={c.id} id={`commit-${c.id}`} className="msg-commit">
                                  <div className="msg-user"><span>Design rendern → {prod.name}</span></div>
                                  <LookTurn product={prod} allLooks={b.looks}
                                    capWall={b.capWall} initialCap={c.cap} savedBrief={c.brief} savedJustier={c.justier}
                                    laeufe={laeufeVon(c)}
                                    onBrief={(brief, justier) => patchCommit(c.id, { brief, justier })}
                                    onLauf={l => patchCommit(c.id, { laeufe: [...laeufeVon(c), l] })}
                                    onSample={setSampleCtx} onClose={() => removeCommit(c.id)} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="refine">
                  <div className="feld">
                    <input value={refineInput} onChange={e => setRefineInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { verfeinereText(refineInput); setRefineInput(''); } }} placeholder={'Verfeinern in Worten — „wärmer“, „nur Glas“, „30 ml“'} />
                    <button className="go" onClick={() => { verfeinereText(refineInput); setRefineInput(''); }} aria-label="senden">↑</button>
                  </div>
                </div>
              </main>
              {selected && (
                <DetailPanel product={selected} capWall={blocks.find(b => b.results.some(r => r.id === selected.id))?.capWall}
                  cap={selectedCap} onCap={setSelectedCap}
                  isFav={isFav(selected.id)} inBoard={board.some(x => x.id === selected.id)}
                  onFav={() => quickFav(selected)} onBoard={() => toggleBoard(selected)}
                  onCommit={() => { commitTeil(selected, selectedCap); setSelected(null); }}
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
