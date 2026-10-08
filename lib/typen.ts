/* ulba · lib/typen.ts — Anzeige-Namen der Packmittel-Typen (Airtable-Schlüssel
   wie "Bottle_ScrewCap" bleiben intern und in den URLs; sichtbar wird Deutsch).
   Kurz: Karten, Datenblatt, Reiter. Plural: Kategorie-Titel (SEO). */
export const TYP_KURZ: Record<string, string> = {
  Jar_ScrewCap: 'Tiegel · Schraub', Bottle_ScrewCap: 'Flasche · Schraub',
  Bottle_DispenserPump: 'Flasche · Pumpe', Airless_Bottle: 'Airless',
  Airless_Jar: 'Airless Tiegel', Bottle_FlipTop: 'Flasche · Flip',
  Bottle_Dropper: 'Flasche · Pipette', Bottle_Spray: 'Flasche · Spray',
  Tube_FlipTop: 'Tube · Flip', Tube_ScrewCap: 'Tube · Schraub',
  Bottle_TriggerPump: 'Flasche · Trigger',
};
const TYP_PLURAL: Record<string, string> = {
  Jar_ScrewCap: 'Tiegel mit Schraubdeckel', Bottle_ScrewCap: 'Flaschen mit Schraubverschluss',
  Bottle_DispenserPump: 'Pumpflaschen', Airless_Bottle: 'Airless-Flaschen',
  Airless_Jar: 'Airless-Tiegel', Bottle_FlipTop: 'Flaschen mit Klappdeckel',
  Bottle_Dropper: 'Pipettenflaschen', Bottle_Spray: 'Sprühflaschen',
  Tube_FlipTop: 'Tuben mit Klappdeckel', Tube_ScrewCap: 'Tuben mit Schraubdeckel',
  Bottle_TriggerPump: 'Triggerflaschen',
};
const lesbar = (k: string) => (k || '').replace(/_/g, ' ');
export const typKurz = (k: string) => TYP_KURZ[k] || lesbar(k);
export const typPlural = (k: string) => TYP_PLURAL[k] || lesbar(k);
