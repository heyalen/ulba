/* ulba · Design-Richtungen: Verfeinern ohne KI (sofort, deterministisch).
   Ändert die Renderer-Felder UND hält Design_Komponenten/design_dna konsistent,
   damit der Prompt keine widersprüchlichen Angaben bekommt. */
export type Felder = Record<string, unknown>;

export const CHIPS = [
  ['waermer', 'wärmer'], ['kuehler', 'kühler'], ['heller', 'heller'], ['dunkler', 'dunkler'],
  ['matter', 'matter'], ['glaenzender', 'glänzender'], ['leiser', 'leiser'], ['lauter', 'lauter'],
  ['weniger_deko', 'weniger Deko'], ['mehr_deko', 'mehr Deko'],
] as const;
export type Chip = (typeof CHIPS)[number][0];

const hexZuHsl = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0.5];
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const hslZuHex = (h: number, s: number, l: number) => {
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return `#${[f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};
const klemm = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const zahl = (v: unknown, d: number) => (isNaN(Number(v)) || v === null || v === '' ? d : Number(v));
/* Farbton um 'schritt' Grad Richtung Ziel drehen (kürzester Weg) */
const drehe = (h: number, ziel: number, schritt: number) => { const d = ((ziel - h + 540) % 360) - 180; return (h + Math.sign(d) * Math.min(Math.abs(d), schritt) + 360) % 360; };

export function komponenten(f: Felder): Record<string, any> {
  const k = f.Design_Komponenten;
  if (!k) return {};
  if (typeof k === 'string') { try { return JSON.parse(k); } catch { return {}; } }
  return { ...(k as Record<string, any>) };
}

export function verfeinern(f: Felder, chip: Chip | { hex: string }): { felder: Felder; zusatz: string } {
  const n: Felder = { ...f };
  const k = komponenten(f);
  const body = typeof f.Body_Hex === 'string' ? f.Body_Hex : '#E8E4DC';
  let [h, s, l] = hexZuHsl(body);
  const notiz: string[] = [];
  let zusatz = '';
  const farbe = () => { const hex = hslZuHex(h, s, l); n.Body_Hex = hex; if (k.behaelter) k.behaelter = { ...k.behaelter, farbe: hex }; notiz.push(`body colour ${hex}`); };

  if (typeof chip === 'object') {
    n.Body_Hex = chip.hex.toUpperCase(); if (k.behaelter) k.behaelter = { ...k.behaelter, farbe: n.Body_Hex };
    if (n.Body_Behandlung === 'klar') n.Body_Behandlung = 'getoent';
    notiz.push(`body colour ${n.Body_Hex}`); zusatz = n.Body_Hex as string;
  } else switch (chip) {
    case 'waermer': h = drehe(h, 32, 16); s = klemm(s + 0.04); farbe(); n.Farbtemp = klemm(zahl(f.Farbtemp, 5) + 2, 0, 10); zusatz = 'wärmer'; break;
    case 'kuehler': h = drehe(h, 210, 16); farbe(); n.Farbtemp = klemm(zahl(f.Farbtemp, 5) - 2, 0, 10); zusatz = 'kühler'; break;
    case 'heller': l = klemm(l + 0.12, 0.05, 0.97); farbe(); zusatz = 'heller'; break;
    case 'dunkler': l = klemm(l - 0.12, 0.04, 0.95); farbe(); zusatz = 'dunkler'; break;
    case 'matter': n.Finish_Body = 'matt'; n.Cap_Finish = 'matt'; if (k.behaelter) k.behaelter = { ...k.behaelter, finish: 'matt' }; if (k.verschluss) k.verschluss = { ...k.verschluss, finish: 'matt' }; notiz.push('matte finish on body and cap'); zusatz = 'matt'; break;
    case 'glaenzender': n.Finish_Body = 'glossy'; n.Cap_Finish = 'glossy'; if (k.behaelter) k.behaelter = { ...k.behaelter, finish: 'glossy' }; if (k.verschluss) k.verschluss = { ...k.verschluss, finish: 'glossy' }; notiz.push('high-gloss finish on body and cap'); zusatz = 'glänzend'; break;
    case 'leiser': s = klemm(s - 0.18); l = klemm(l + (0.72 - l) * 0.3); farbe(); n.Temp_Laut = klemm(zahl(f.Temp_Laut, 5) - 2, 0, 10); n.Deko_Dichte = klemm(zahl(f.Deko_Dichte, 4) - 2, 0, 10); notiz.push('calmer, more restrained overall'); zusatz = 'leiser'; break;
    case 'lauter': s = klemm(s + 0.2); farbe(); n.Temp_Laut = klemm(zahl(f.Temp_Laut, 5) + 2, 0, 10); n.Deko_Dichte = klemm(zahl(f.Deko_Dichte, 4) + 2, 0, 10); notiz.push('bolder, more expressive overall'); zusatz = 'lauter'; break;
    case 'weniger_deko': n.Deko_Dichte = klemm(zahl(f.Deko_Dichte, 4) - 3, 0, 10); n.Typo_Haltung = 'minimal_klein'; if (k.grafik) k.grafik = { ...k.grafik, vorhanden: false, abdeckung: 'keine' }; notiz.push('minimal decoration, small discreet typography, no graphics'); zusatz = 'reduziert'; break;
    case 'mehr_deko': n.Deko_Dichte = klemm(zahl(f.Deko_Dichte, 4) + 3, 0, 10); notiz.push('richer decoration and a more prominent label'); zusatz = 'mehr Deko'; break;
  }
  if (notiz.length) k.design_dna = `${String(k.design_dna || '').trim()} Adjustment (overrides earlier details): ${notiz.join('; ')}.`.trim();
  if (Object.keys(k).length) n.Design_Komponenten = k;
  return { felder: n, zusatz };
}
