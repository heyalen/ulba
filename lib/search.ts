export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export const DIMS = [
  'Emotion','Ritual','Ästhetik','Zielgruppe','Prestige',
  'Feminin','Maskulin','Archetyp','Sensorik','Werte',
  'Produkt-Fit','Kultur','Psychografik','Zeitgeist','Persona'
];
