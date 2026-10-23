/* ══════════════════════════════════════════════════════════════════════
   ulba · lib/partner.ts — Lieferanten-Portal (v81), Server-seitig.
   Ein Lieferant verwaltet sein eigenes Profil: wer darf (Portal_Nutzer =
   Clerk-IDs), was er sieht (eigene Teile, Musteranfragen), was er ändert
   (Profil-Felder). Alles per Feld-ID, kein Cache (Portal zeigt immer live).
   Vertrauens-Regel beim Übernehmen: E-Mail-Domain = Website-Domain →
   sofort «verifiziert» + Status «bestätigt»; sonst «beansprucht» → Alen prüft.
   ══════════════════════════════════════════════════════════════════════ */

const BASE = 'app0QFyInfhvk66MC';
const T_LIEFERANT = 'tblsy3CHZbAo6GraB';
const T_SYSTEM = 'tblB1kWay9TvX3rGv';
const T_ANFRAGE = 'tblIZnKIrr81MYSzr';

/* Lieferant */
export const L = {
  name: 'fldq27U7UQU6NZU7P', land: 'fldSfiG1p9Qe9Wvrh', website: 'fldDfEAJQjKB3ei0G',
  email: 'fldGoERkTCPu7Mjlw', eu: 'fld9E9qzdoKR2HtlQ', zertifikat: 'fldUr7qqcOGqQ3qPU',
  moq: 'fldCgaxQ5U1VKcPBY', lieferzeit: 'fldkxlvTUYx6I4gDg', systeme: 'fldkZRbHhgrvnEhAp',
  anfragen: 'fld5ef2lIjb3X0SZv', logo: 'fldSHKbcxAAsvGMxO', titelbild: 'fldQwnRGToqPPkeci',
  beschreibung: 'fldKTjCZjihhtgrXk', standort: 'fldEspF57M7TMgapI', status: 'flddhjCq9c3NDC0cZ',
  portalNutzer: 'fld9dQm3hDI7fM4N7', portalStatus: 'fldCyEtM2ux5SAZas', portalLog: 'fldVQXVZzihpZtb6G',
} as const;
/* System (nur fürs Portal nötige Felder) */
const S = {
  name: 'fld6MYHRyYtfVatBe', typ: 'fldeBw1fv6FrXwwHZ', material: 'fldxgloSGbw6lvIOX',
  published: 'fldGKpVG4bIAKnrl9', sync: 'fldVtDEyUSRo9lsuH', bild: 'fldGcXPHX1jpg40r4', bildRoh: 'fldAZGaS0aliZRejK',
  pipeline: 'fldvtMpA2QWVn1Y8R', lieferant: 'fldbQyAyAoKEcR42J', groessen: 'fldtT7Rdb5itaJlJg',
} as const;
/* Musteranfrage */
const M = {
  name: 'fldGNGNcdTP37umjZ', email: 'fldcxIabIhWs2vwse', firma: 'fld1C7W9B95YxQGPo',
  system: 'fldz4eI0w86Nd2XgW', status: 'fldlVebHyqiN3yMXI', datum: 'fldfd6b4zxhnI68F2',
  notiz: 'fldapwhmIssHbYCd1', render: 'fldOnX3P2IjsMWt3f', wunsch: 'fldMJV1m2aSY7PX8b',
  cap: 'fldTqWJoVSEt0avN6', konzept: 'fld66jW5ljin6A3Zt',
} as const;

import { LAENDER } from './partnerKonst';
export { LAENDER };

export interface PartnerLieferant {
  id: string; name: string; land: string; website: string; email: string;
  beschreibung: string; standort: string; zertifikat: string; eu: boolean;
  moq: number | null; lieferzeit: number | null;
  logoUrl: string | null; titelbildUrl: string | null;
  status: string; portalStatus: string; nutzer: string[];
  systemIds: string[]; anfrageIds: string[];
  /** Darf Profil bearbeiten: verifiziert oder von Alen bestätigt. */
  freigegeben: boolean;
}
export interface PartnerTeil {
  id: string; name: string; typ: string; material: string[]; groessen: string[];
  bild: string | null; veroeffentlicht: boolean; sync: string; pipeline: string;
}
export interface PartnerAnfrage {
  id: string; name: string; email: string; firma: string; status: string; datum: string;
  notiz: string; teilName: string; teilId: string | null; render: string; wunsch: string; cap: string; konzept: string;
}

/* ── Airtable-Grundlagen ─────────────────────────────────────────────── */
const sel = (v: any): string => (typeof v === 'string' ? v : v?.name || '').trim();
const multi = (v: any): string[] => Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : x?.name || '').trim()).filter(Boolean) : [];
const img = (v: any): string | null => (Array.isArray(v) && v[0]?.url ? v[0].url : null);

function kopf(): Record<string, string> {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) throw new Error('AIRTABLE_PAT fehlt im Frontend-Projekt');
  return { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' };
}
async function liste(table: string, fields: string[], formel?: string, max = 200): Promise<any[]> {
  const records: any[] = [];
  let offset = '';
  do {
    const p = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true' });
    fields.forEach((f) => p.append('fields[]', f));
    if (formel) p.set('filterByFormula', formel);
    if (offset) p.set('offset', offset);
    const r = await fetch(`https://api.airtable.com/v0/${BASE}/${table}?${p}`, { headers: kopf(), cache: 'no-store' });
    if (!r.ok) throw new Error(`Airtable ${table}: ${r.status}`);
    const j = await r.json();
    records.push(...(j.records || []));
    offset = j.offset || '';
  } while (offset && records.length < max);
  return records;
}
async function holeRecord(table: string, id: string): Promise<any | null> {
  const r = await fetch(`https://api.airtable.com/v0/${BASE}/${table}/${id}?returnFieldsByFieldId=true`, { headers: kopf(), cache: 'no-store' });
  if (!r.ok) return null;
  return r.json();
}
async function schreibe(table: string, id: string | null, fields: Record<string, unknown>): Promise<any> {
  const url = id ? `https://api.airtable.com/v0/${BASE}/${table}/${id}` : `https://api.airtable.com/v0/${BASE}/${table}`;
  const r = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: kopf(), body: JSON.stringify({ fields, typecast: true }) });
  if (!r.ok) throw new Error(`Airtable schreiben ${table}: ${r.status} ${await r.text()}`);
  return r.json();
}

function mapLieferant(rec: any): PartnerLieferant {
  const f = rec.fields || {};
  const status = sel(f[L.status]); const portalStatus = sel(f[L.portalStatus]);
  return {
    id: rec.id, name: String(f[L.name] || '').trim(), land: sel(f[L.land]), website: String(f[L.website] || ''),
    email: String(f[L.email] || ''), beschreibung: String(f[L.beschreibung] || ''), standort: String(f[L.standort] || ''),
    zertifikat: String(f[L.zertifikat] || ''), eu: f[L.eu] === true,
    moq: typeof f[L.moq] === 'number' ? f[L.moq] : null, lieferzeit: typeof f[L.lieferzeit] === 'number' ? f[L.lieferzeit] : null,
    logoUrl: img(f[L.logo]), titelbildUrl: img(f[L.titelbild]),
    status, portalStatus,
    nutzer: String(f[L.portalNutzer] || '').split(/\s+/).map((s) => s.trim()).filter(Boolean),
    systemIds: (f[L.systeme] || []) as string[], anfrageIds: (f[L.anfragen] || []) as string[],
    freigegeben: status === 'bestätigt' || portalStatus === 'verifiziert',
  };
}

/* ── Lesen ───────────────────────────────────────────────────────────── */

/** Der Lieferant, den dieser Clerk-Nutzer verwaltet (oder null). */
export async function lieferantVonNutzer(userId: string): Promise<PartnerLieferant | null> {
  if (!userId) return null;
  const sauber = userId.replace(/['"\\]/g, '');
  const recs = await liste(T_LIEFERANT, Object.values(L), `FIND('${sauber}', {Portal_Nutzer})`, 5);
  const rec = recs.find((r) => String(r.fields?.[L.portalNutzer] || '').split(/\s+/).includes(userId));
  return rec ? mapLieferant(rec) : null;
}

/** Alle sichtbaren Lieferanten (fürs Übernehmen: Name + ob schon jemand das Profil hält). */
export async function lieferantenZurAuswahl(): Promise<{ id: string; name: string; land: string; website: string; belegt: boolean }[]> {
  const recs = await liste(T_LIEFERANT, [L.name, L.land, L.website, L.status, L.portalNutzer]);
  return recs
    .filter((r) => sel(r.fields?.[L.status]) !== 'entfernt' && String(r.fields?.[L.name] || '').trim())
    .map((r) => ({
      id: r.id, name: String(r.fields[L.name]).trim(), land: sel(r.fields[L.land]), website: String(r.fields[L.website] || ''),
      belegt: !!String(r.fields[L.portalNutzer] || '').trim(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

export async function teileVonLieferant(l: PartnerLieferant): Promise<PartnerTeil[]> {
  const recs = await liste(T_SYSTEM, Object.values(S), `FIND('${l.id}', ARRAYJOIN({Lieferant}))`, 500)
    .catch(() => [] as any[]);
  // ARRAYJOIN liefert Namen, nicht IDs → zur Sicherheit über die Link-Liste des Lieferanten filtern.
  const ids = new Set(l.systemIds);
  const quelle = recs.length ? recs.filter((r) => ids.size === 0 || ids.has(r.id)) : [];
  const fehlend = l.systemIds.filter((id) => !quelle.some((r) => r.id === id));
  if (fehlend.length) {
    const nach = await Promise.all(fehlend.slice(0, 60).map((id) => holeRecord(T_SYSTEM, id)));
    quelle.push(...nach.filter(Boolean));
  }
  return quelle.map((r) => {
    const f = r.fields || {};
    return {
      id: r.id, name: String(f[S.name] || '').trim() || r.id, typ: sel(f[S.typ]), material: multi(f[S.material]),
      groessen: multi(f[S.groessen]), bild: img(f[S.bild]) || img(f[S.bildRoh]),
      veroeffentlicht: f[S.published] === true, sync: sel(f[S.sync]), pipeline: sel(f[S.pipeline]),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

export async function anfragenVonLieferant(l: PartnerLieferant): Promise<PartnerAnfrage[]> {
  if (!l.anfrageIds.length) return [];
  const recs = (await Promise.all(l.anfrageIds.slice(0, 100).map((id) => holeRecord(T_ANFRAGE, id)))).filter(Boolean);
  const teilIds = Array.from(new Set(recs.flatMap((r) => (r.fields?.[M.system] || []) as string[])));
  const teilNamen = new Map<string, string>();
  await Promise.all(teilIds.slice(0, 60).map(async (id) => {
    const t = await holeRecord(T_SYSTEM, id);
    if (t) teilNamen.set(id, String(t.fields?.[S.name] || '').trim() || id);
  }));
  return recs.map((r) => {
    const f = r.fields || {};
    const teilId = ((f[M.system] || []) as string[])[0] || null;
    return {
      id: r.id, name: String(f[M.name] || ''), email: String(f[M.email] || ''), firma: String(f[M.firma] || ''),
      status: sel(f[M.status]) || 'Neu', datum: String(f[M.datum] || ''), notiz: String(f[M.notiz] || ''),
      teilName: teilId ? (teilNamen.get(teilId) || '') : '', teilId,
      render: String(f[M.render] || ''), wunsch: String(f[M.wunsch] || ''), cap: String(f[M.cap] || ''), konzept: String(f[M.konzept] || ''),
    };
  }).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
}

/* ── Schreiben ───────────────────────────────────────────────────────── */

const heute = () => new Date().toISOString().slice(0, 10);
function logZeile(alt: string, text: string, email: string): string {
  return `${heute()} · ${email || 'ohne E-Mail'} · ${text}\n${alt || ''}`.trim();
}
export function domainVon(s: string): string {
  const roh = String(s || '').trim().toLowerCase();
  if (!roh) return '';
  const host = roh.includes('@') ? roh.split('@').pop() || '' : roh.replace(/^https?:\/\//, '').split(/[/?#]/)[0];
  return host.replace(/^www\./, '').replace(/:\d+$/, '');
}
/** Gleiche Firma? Website-Domain und E-Mail-Domain müssen übereinstimmen (Subdomains zählen). */
export function domainPasst(email: string, website: string): boolean {
  const a = domainVon(email), b = domainVon(website);
  if (!a || !b) return false;
  return a === b || a.endsWith('.' + b) || b.endsWith('.' + a);
}

/** Bestehendes Profil übernehmen. */
export async function profilUebernehmen(lieferantId: string, userId: string, email: string): Promise<PartnerLieferant> {
  const rec = await holeRecord(T_LIEFERANT, lieferantId);
  if (!rec) throw new Error('Lieferant nicht gefunden');
  const l = mapLieferant(rec);
  if (l.nutzer.length && !l.nutzer.includes(userId)) throw new Error('Dieses Profil wird bereits von jemandem verwaltet. Schreib uns an hallo@ulba.ai, wenn du dazugehörst.');
  const verifiziert = domainPasst(email, l.website);
  const fields: Record<string, unknown> = {
    [L.portalNutzer]: Array.from(new Set([...l.nutzer, userId])).join('\n'),
    [L.portalStatus]: verifiziert ? 'verifiziert' : 'beansprucht',
    [L.portalLog]: logZeile(String(rec.fields?.[L.portalLog] || ''), verifiziert ? 'Profil übernommen — E-Mail-Domain passt zur Website (automatisch bestätigt)' : 'Profil beansprucht — E-Mail-Domain passt NICHT zur Website, bitte prüfen', email),
  };
  if (verifiziert) fields[L.status] = 'bestätigt';
  if (!l.email && email) fields[L.email] = email;
  return mapLieferant(await schreibe(T_LIEFERANT, lieferantId, fields));
}

/** Neue Firma anlegen, die noch nicht auf ulba ist. */
export async function firmaAnlegen(d: { name: string; website: string; land: string }, userId: string, email: string): Promise<PartnerLieferant> {
  const name = d.name.trim().slice(0, 120);
  if (name.length < 2) throw new Error('Bitte den Firmennamen angeben.');
  const website = d.website.trim() ? (/^https?:\/\//i.test(d.website.trim()) ? d.website.trim() : `https://${d.website.trim()}`) : '';
  const verifiziert = domainPasst(email, website);
  const fields: Record<string, unknown> = {
    [L.name]: name, [L.email]: email || undefined,
    [L.status]: verifiziert ? 'bestätigt' : 'eingeladen',
    [L.portalNutzer]: userId, [L.portalStatus]: verifiziert ? 'verifiziert' : 'beansprucht',
    [L.portalLog]: logZeile('', verifiziert ? 'Firma im Portal angelegt (E-Mail-Domain = Website, automatisch bestätigt)' : 'Firma im Portal angelegt — bitte prüfen', email),
  };
  if (website) fields[L.website] = website;
  if (d.land && LAENDER.includes(d.land)) fields[L.land] = d.land;
  return mapLieferant(await schreibe(T_LIEFERANT, null, fields));
}

export interface ProfilEingabe {
  beschreibung: string; standort: string; land: string; website: string; email: string;
  zertifikat: string; eu: boolean; moq: string; lieferzeit: string; logoUrl: string; titelbildUrl: string;
}
export async function profilSpeichern(l: PartnerLieferant, e: ProfilEingabe, email: string): Promise<void> {
  const zahl = (s: string) => { const n = parseInt(String(s).replace(/[^\d]/g, ''), 10); return Number.isFinite(n) && n > 0 ? n : null; };
  const url = (s: string) => { const t = s.trim(); return t ? (/^https?:\/\//i.test(t) ? t : `https://${t}`) : ''; };
  const fields: Record<string, unknown> = {
    [L.beschreibung]: e.beschreibung.trim().slice(0, 1200),
    [L.standort]: e.standort.trim().slice(0, 120),
    [L.website]: url(e.website) || null,
    [L.email]: e.email.trim() || null,
    [L.zertifikat]: e.zertifikat.trim().slice(0, 200),
    [L.eu]: !!e.eu,
    [L.moq]: zahl(e.moq), [L.lieferzeit]: zahl(e.lieferzeit),
    [L.portalLog]: logZeile('', 'Profil bearbeitet', email),
  };
  if (e.land && LAENDER.includes(e.land)) fields[L.land] = e.land;
  const logo = url(e.logoUrl); const titel = url(e.titelbildUrl);
  if (logo && logo !== l.logoUrl) fields[L.logo] = [{ url: logo }];
  if (titel && titel !== l.titelbildUrl) fields[L.titelbild] = [{ url: titel }];
  // Log anhängen statt überschreiben
  const rec = await holeRecord(T_LIEFERANT, l.id);
  fields[L.portalLog] = logZeile(String(rec?.fields?.[L.portalLog] || ''), 'Profil bearbeitet', email);
  await schreibe(T_LIEFERANT, l.id, fields);
}

/** Katalog-Link oder Hinweis einreichen → landet im Portal_Log, Alen zieht die Teile per Engine. */
export async function katalogEinreichen(l: PartnerLieferant, link: string, notiz: string, email: string): Promise<void> {
  const t = link.trim(); const n = notiz.trim().slice(0, 500);
  if (!t && !n) throw new Error('Bitte einen Katalog-Link oder eine Notiz angeben.');
  const rec = await holeRecord(T_LIEFERANT, l.id);
  await schreibe(T_LIEFERANT, l.id, {
    [L.portalLog]: logZeile(String(rec?.fields?.[L.portalLog] || ''), `KATALOG eingereicht: ${t || '—'}${n ? ` · «${n}»` : ''}`, email),
  });
}

/** Anfrage-Status setzen (nur eigene Anfragen). */
export async function anfrageStatusSetzen(l: PartnerLieferant, anfrageId: string, status: 'Weitergeleitet' | 'Erledigt' | 'Abgebrochen'): Promise<void> {
  if (!l.anfrageIds.includes(anfrageId)) throw new Error('Diese Anfrage gehört nicht zu deinem Profil.');
  await schreibe(T_ANFRAGE, anfrageId, { [M.status]: status });
}
