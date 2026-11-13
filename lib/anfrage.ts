/* ulba · Eine Anfrage in einem Satz zerlegen: WAS (Teil), FÜR WEN (Website), WIE (Look).
   Bewusst ohne KI: schnell, nachvollziehbar, und der Lieferant sieht sofort, was erkannt wurde. */
const WAS: [string, string, 'typ' | 'material' | 'verschluss'][] = [
  ['flasche', 'Flasche', 'typ'], ['bottle', 'Flasche', 'typ'], ['flakon', 'Flakon', 'typ'], ['tiegel', 'Tiegel', 'typ'], ['jar', 'Tiegel', 'typ'],
  ['tube', 'Tube', 'typ'], ['airless', 'Airless', 'typ'], ['spender', 'Spender', 'typ'], ['dose', 'Dose', 'typ'], ['stick', 'Stick', 'typ'], ['roll-on', 'Roll-on', 'typ'], ['rollon', 'Roll-on', 'typ'],
  ['refill', 'Refill', 'typ'], ['nachfüll', 'Refill', 'typ'],
  ['glas', 'Glas', 'material'], ['glass', 'Glas', 'material'], ['pet', 'PET', 'material'], ['hdpe', 'HDPE', 'material'], ['alu', 'Aluminium', 'material'], ['pcr', 'PCR', 'material'], ['kunststoff', 'Kunststoff', 'material'], ['holz', 'Holz', 'material'],
  ['pipette', 'Pipette', 'verschluss'], ['dropper', 'Pipette', 'verschluss'], ['pumpe', 'Pumpe', 'verschluss'], ['pump', 'Pumpe', 'verschluss'], ['spray', 'Spray', 'verschluss'], ['sprüh', 'Spray', 'verschluss'],
];
const STOPP = new Set(['ein', 'eine', 'einen', 'einer', 'für', 'fuer', 'mit', 'in', 'im', 'und', 'oder', 'der', 'die', 'das', 'den', 'dem', 'neue', 'neuer', 'neues', 'neuen', 'brauche', 'brauchen', 'suche', 'suchen', 'wir', 'ich', 'kunde', 'kundin', 'marke', 'look', 'looks', 'von', 'aus', 'ml', 'bitte', 'zeigen', 'zeig', 'als', 'wie', 'the', 'for', 'with', 'a', 'an', 'drei', 'zwei', 'vier', 'lookbook', 'idee', 'ideen', 'linie', 'serum', 'serum-linie', 'produkt', 'produkte', 'verpackung']);

export type Anfrage = { volumen: number | null; was: { wort: string; label: string; art: 'typ' | 'material' | 'verschluss' }[]; url: string | null; stil: string };

export function anfrageLesen(q: string): Anfrage {
  let rest = ` ${q.toLowerCase()} `;
  const urlM = rest.match(/(?:https?:\/\/)?((?:[\w-]+\.)+(?:com|ch|de|at|fr|it|co\.uk|net|org|io|eu|shop|bio|store|kr|us))(?:\/\S*)?/);
  const url = urlM ? urlM[1] : null;
  if (urlM) rest = rest.replace(urlM[0], ' ');
  const volM = rest.match(/(\d{1,4})\s*ml\b/);
  const volumen = volM ? Number(volM[1]) : null;
  if (volM) rest = rest.replace(volM[0], ' ');
  const was: Anfrage['was'] = [];
  const tokens = rest.split(/[^a-zäöüß0-9-]+/).filter(Boolean);
  const uebrig: string[] = [];
  for (const t of tokens) {
    const treffer = WAS.filter(([w]) => (w.length <= 3 ? t === w : t.includes(w)));
    if (treffer.length) { for (const [wort, label, art] of treffer) if (!was.some((x) => x.label === label)) was.push({ wort, label, art }); continue; }
    if (!STOPP.has(t) && t.length > 2 && !/^\d+$/.test(t)) uebrig.push(t);
  }
  return { volumen, was, url, stil: uebrig.join(' ') };
}

export type Kandidat = { name: string; typ: string | null; material: string | null; volumen: number | null; kollektion?: string | null };
/* Wie gut passt ein Teil? 0 = gar nicht. */
export function passung(a: Anfrage, t: Kandidat): number {
  const heu = `${t.name} ${t.typ ?? ''} ${t.material ?? ''} ${t.kollektion ?? ''}`.toLowerCase();
  let p = 0;
  if (a.volumen && t.volumen) {
    const d = Math.abs(t.volumen - a.volumen) / a.volumen;
    p += d < 0.01 ? 6 : d <= 0.2 ? 3 : d <= 0.5 ? 0 : -4;
  }
  for (const w of a.was) {
    if (w.art === 'verschluss') continue;
    const da = heu.includes(w.wort) || heu.includes(w.label.toLowerCase());
    p += da ? 4 : w.art === 'typ' ? -3 : -1;
  }
  return p;
}
