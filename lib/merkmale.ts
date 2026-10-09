/* ══════════════════════════════════════════════════════════════════════
   ulba · lib/merkmale.ts
   Am Foto belegte Merkmale eines Teils (aus der Attribut_Bibliothek):
   Körper vom System-Tagging, Kappe von allen Caps des Systems.
   Eine Quelle für Datenblatt, Detail-Panel und Eingrenz-Chips.
   Client- und Server-sicher (keine Airtable-Zugriffe).
   ══════════════════════════════════════════════════════════════════════ */

export interface Merkmal { kat: string; wert: string; label: string }

/** Deutscher Kurztext aus dem Bibliotheks-Untertitel ("Kubisch · gerade Kanten" → "Kubisch"). */
export function merkmalLabel(name: string, untertitel?: string): string {
  const kurz = (untertitel || '').split('·')[0].trim();
  return kurz && kurz.length <= 28 ? kurz : name;
}

export const merkmalKey = (m: { kat: string; wert: string }) => `${m.kat}::${m.wert}`;

/* Eingrenz-Gruppen über den Ergebnissen. Nur, was Einkäufer wirklich
   unterscheiden: Form, Proportion, Wandung, Optik, Oberfläche, Farbe, Kappe. */
export const MERKMAL_GRUPPEN: { id: string; label: string; kats: string[] }[] = [
  { id: 'form', label: 'Form', kats: ['A1_Body_Geometry'] },
  { id: 'proportion', label: 'Proportion', kats: ['A2_Body_Proportion'] },
  { id: 'wand', label: 'Wandung', kats: ['A5_Body_Wall'] },
  { id: 'optik', label: 'Optik', kats: ['E3_Translucency', 'E4_Light_Refraction'] },
  { id: 'oberflaeche', label: 'Oberfläche', kats: ['E5_Body_Surface'] },
  { id: 'farbe', label: 'Farbe', kats: ['E1_Body_Color', 'D1_Body_Material'] },
  { id: 'kappe', label: 'Kappe', kats: ['E2_Cap_Color', 'D2_Cap_Material'] },
];

/* Datenblatt-Zeilen: Körper · Optik · Kappe. Doppelte Labels fallen weg. */
const ZEILEN: [string, RegExp][] = [
  ['Körper', /^A\d|^C\d/],
  ['Optik', /^D1_|^E[13457]_/],
  ['Kappe', /^B\d|^D2_|^E[26]_/],
];
export function merkmalZeilen(ms: Merkmal[] | undefined): [string, string][] {
  if (!ms?.length) return [];
  return ZEILEN.map(([titel, re]) => {
    const labels = Array.from(new Set(ms.filter(m => re.test(m.kat)).map(m => m.label)));
    return [titel, labels.join(' · ')] as [string, string];
  }).filter(([, v]) => v);
}

/** Passt ein Teil zur Auswahl? ODER innerhalb einer Gruppe, UND zwischen Gruppen. */
export function passtZuWahl(ms: Merkmal[] | undefined, wahl: string[]): boolean {
  if (!wahl.length) return true;
  const hat = new Set((ms || []).map(merkmalKey));
  return MERKMAL_GRUPPEN.every(g => {
    const inGruppe = wahl.filter(k => g.kats.some(kat => k.startsWith(kat + '::')));
    return inGruppe.length === 0 || inGruppe.some(k => hat.has(k));
  });
}

/** Chips pro Gruppe: nur Werte, die die Liste wirklich teilen (nicht 0, nicht alle). */
export function merkmalFacetten(listen: (Merkmal[] | undefined)[], wahl: string[]) {
  const n = listen.length;
  return MERKMAL_GRUPPEN.map(g => {
    const zaehl = new Map<string, { m: Merkmal; n: number }>();
    for (const ms of listen) {
      const gesehen = new Set<string>();
      for (const m of ms || []) {
        if (!g.kats.includes(m.kat)) continue;
        const k = merkmalKey(m);
        if (gesehen.has(k)) continue;
        gesehen.add(k);
        const z = zaehl.get(k) || { m, n: 0 };
        z.n++; zaehl.set(k, z);
      }
    }
    const werte = Array.from(zaehl.entries())
      .filter(([k, z]) => wahl.includes(k) || (z.n > 0 && z.n < n))
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 5)
      .map(([k, z]) => ({ key: k, label: z.m.label, n: z.n, an: wahl.includes(k) }));
    return { ...g, werte };
  }).filter(g => g.werte.length > 0);
}
