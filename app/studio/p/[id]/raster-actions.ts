'use server';
/* ulba · Raster eines Vorschlags: Zeilen (Teile), Spalten (Richtungen), Zellen (Designs).
   Rechte prüft die RLS; die Firma kommt aus der Sitzung. */
import { revalidatePath } from 'next/cache';
import { ladeKontext, supabaseServer } from '../../../../lib/supabase/server';
import { backend } from '../../../../lib/backend';
import { verfeinern as verfeinernFelder, type Chip, type Felder } from '../../../../lib/richtung';
import { projektMerken, STANDARD_TITEL } from '../../../../lib/projekt';

const pfad = (vid: string) => `/studio/p/${vid}`;
const jetzt = () => new Date().toISOString();
async function beruehrt(vid: string) {
  await supabaseServer().from('vorschlaege').update({ aktualisiert_am: jetzt() }).eq('id', vid);
  revalidatePath(pfad(vid));
}
async function firma() { const k = await ladeKontext(); if (!k?.firma) throw new Error('Nicht angemeldet'); return k.firma.id; }

/* ── Zeilen ── */
export async function zeileHinzufuegen(vid: string, teilId: string, capId: string | null) {
  const sb = supabaseServer();
  const { data: da } = await sb.from('vorschlag_positionen').select('id').eq('vorschlag_id', vid).eq('teil_id', teilId).maybeSingle();
  if (!da) {
    const { count } = await sb.from('vorschlag_positionen').select('id', { count: 'exact', head: true }).eq('vorschlag_id', vid);
    await sb.from('vorschlag_positionen').insert({ vorschlag_id: vid, teil_id: teilId, cap_id: capId, reihenfolge: count ?? 0 });
    // Erster Inhalt: aus «Neuer Vorschlag» wird ein sprechender Name (bleibt frei änderbar)
    if (!count) {
      const { data: t } = await sb.from('teile').select('name').eq('id', teilId).maybeSingle();
      const name = (t as { name: string } | null)?.name;
      if (name) { const { data: u } = await sb.from('vorschlaege').update({ titel: name.slice(0, 120) }).eq('id', vid).eq('titel', STANDARD_TITEL).select('id'); if (u?.length) revalidatePath('/studio', 'layout'); }
    }
  }
  await beruehrt(vid);
}
export async function zeileCap(vid: string, posId: string, capId: string | null) {
  await supabaseServer().from('vorschlag_positionen').update({ cap_id: capId }).eq('id', posId);
  await beruehrt(vid);
}
export async function zeileEntfernen(vid: string, posId: string) {
  await supabaseServer().from('vorschlag_positionen').delete().eq('id', posId);
  await beruehrt(vid);
}

/* ── Spalten / Richtungen ── */
type Neu = { name: string; beschreibung?: string | null; felder: Felder; quelle: string; bild_pfad?: string | null; basis_welt_id?: string | null; version_von?: string | null };
async function richtungAnlegen(n: Neu): Promise<string> {
  const { data, error } = await supabaseServer().from('richtungen').insert({ firma_id: await firma(), name: n.name.slice(0, 60), beschreibung: n.beschreibung?.slice(0, 300) ?? null,
    felder: n.felder, quelle: n.quelle, bild_pfad: n.bild_pfad ?? null, basis_welt_id: n.basis_welt_id ?? null, version_von: n.version_von ?? null }).select('id').single();
  if (error || !data) throw new Error('Richtung konnte nicht gespeichert werden');
  return (data as { id: string }).id;
}
async function spalteAnlegen(vid: string, richtungId: string) {
  const sb = supabaseServer();
  const { data: da } = await sb.from('vorschlag_richtungen').select('id').eq('vorschlag_id', vid).eq('richtung_id', richtungId).maybeSingle();
  if (da) return;
  const { count } = await sb.from('vorschlag_richtungen').select('id', { count: 'exact', head: true }).eq('vorschlag_id', vid);
  await sb.from('vorschlag_richtungen').insert({ vorschlag_id: vid, richtung_id: richtungId, reihenfolge: count ?? 0 });
}

export async function spalteAusBibliothek(vid: string, richtungId: string) { await spalteAnlegen(vid, richtungId); await beruehrt(vid); }
export async function spalteEntfernen(vid: string, spalteId: string) {
  await supabaseServer().from('vorschlag_richtungen').delete().eq('id', spalteId);
  await beruehrt(vid);
}

export async function spalteAusWelt(vid: string, weltId: string) {
  const { data: w } = await supabaseServer().from('design_welten').select('id, name, felder').eq('id', weltId).single();
  if (!w) return;
  const f = { ...((w as { felder: Felder }).felder) }; delete f.Referenz_Bild; delete f.Status;
  const id = await richtungAnlegen({ name: (w as { name: string }).name, beschreibung: String(f.Wirkung_Keywords ?? ''), felder: f, quelle: 'welt', basis_welt_id: weltId });
  await spalteAnlegen(vid, id); await beruehrt(vid);
}

export type Entwurf = { name: string; beschreibung: string; felder: Felder };
export async function richtungBeschreiben(text: string): Promise<{ entwuerfe?: Entwurf[]; fehler?: string }> {
  const t = text.trim();
  if (t.length < 3) return { fehler: 'Beschreib die Idee in ein paar Worten.' };
  const r = await backend('/api/vorschlag', { aufgabe: 'richtung', text: t.slice(0, 1500) }, 90_000);
  if (!r.ok || !Array.isArray(r.json?.richtungen)) return { fehler: r.json?.error || 'Die Richtung konnte nicht erzeugt werden.' };
  return { entwuerfe: r.json.richtungen as Entwurf[] };
}
export async function entwuerfeUebernehmen(vid: string, liste: Entwurf[], quelle: 'beschreibung' | 'referenz' = 'beschreibung', bildPfad: string | null = null) {
  for (const e of liste.slice(0, 3)) await spalteAnlegen(vid, await richtungAnlegen({ name: e.name, beschreibung: e.beschreibung, felder: e.felder, quelle, bild_pfad: bildPfad }));
  await beruehrt(vid);
}

export async function richtungAusReferenz(vid: string, bildBase64: string, hinweis: string): Promise<{ fehler?: string }> {
  if (!/^[A-Za-z0-9+/=]+$/.test(bildBase64) || bildBase64.length > 4_000_000) return { fehler: 'Das Bild konnte nicht gelesen werden.' };
  const fid = await firma();
  const bildPfad = `${fid}/${crypto.randomUUID()}.jpg`;
  await supabaseServer().storage.from('referenzen').upload(bildPfad, Buffer.from(bildBase64, 'base64'), { contentType: 'image/jpeg' });
  const r = await backend('/api/vorschlag', { aufgabe: 'richtung', bild: bildBase64, text: hinweis.trim().slice(0, 500) || undefined }, 90_000);
  if (!r.ok || !Array.isArray(r.json?.richtungen)) return { fehler: r.json?.error || 'Aus dem Bild liess sich keine Richtung lesen.' };
  await entwuerfeUebernehmen(vid, r.json.richtungen as Entwurf[], 'referenz', bildPfad);
  return {};
}

export async function richtungAusMarke(vid: string, url: string): Promise<{ fehler?: string }> {
  let u = url.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(u)) return { fehler: 'Bitte die Website der Marke eingeben, z. B. marke.ch' };
  u = `https://${u}`;
  const sb = supabaseServer();
  await sb.from('vorschlaege').update({ marken_url: u, marke_id: null }).eq('id', vid);
  const r = await backend('/api/vorschlag', { aufgabe: 'marke', vorschlagId: vid });
  if (!r.ok) return { fehler: r.json?.error ? `Die Marke konnte nicht gelesen werden: ${r.json.error}` : 'Die Marke konnte nicht gelesen werden.' };
  const { data: v } = await sb.from('vorschlaege').select('marke_id, marken ( name )').eq('id', vid).single();
  const vv = v as unknown as { marke_id: string | null; marken: { name: string } | null } | null;
  if (!vv?.marke_id) return { fehler: 'Keine Produktlinien erkannt.' };
  const { data: looks } = await sb.from('marken_looks').select('linie_name, design_komponenten').eq('marke_id', vv.marke_id).limit(3);
  for (const l of (looks ?? []) as { linie_name: string; design_komponenten: Felder }[]) {
    const { beschreibung, ...felder } = l.design_komponenten as Felder & { beschreibung?: string };
    await spalteAnlegen(vid, await richtungAnlegen({ name: `${vv.marken?.name ?? 'Marke'} · ${l.linie_name}`, beschreibung: beschreibung ?? '', felder, quelle: 'marke' }));
  }
  await beruehrt(vid);
  return {};
}

/* Verfeinern: neue Version der Richtung, Spalte zeigt ab jetzt auf sie. */
export async function spalteVerfeinern(vid: string, spalteId: string, chip: Chip | { hex: string }): Promise<{ richtungId?: string }> {
  const sb = supabaseServer();
  const { data: s } = await sb.from('vorschlag_richtungen').select('richtung_id, richtungen ( id, name, beschreibung, felder, bild_pfad, basis_welt_id )').eq('id', spalteId).single();
  const alt = (s as unknown as { richtungen: { id: string; name: string; beschreibung: string | null; felder: Felder; bild_pfad: string | null; basis_welt_id: string | null } } | null)?.richtungen;
  if (!alt) return {};
  const { felder, zusatz } = verfeinernFelder(alt.felder, chip);
  const basisName = alt.name.replace(/ · [^·]+$/, (m) => (/(wärmer|kühler|heller|dunkler|matt|glänzend|leiser|lauter|reduziert|mehr Deko|#[0-9A-F]{6})$/.test(m) ? '' : m));
  const id = await richtungAnlegen({ name: `${basisName} · ${zusatz}`, beschreibung: alt.beschreibung, felder, quelle: 'verfeinert', bild_pfad: alt.bild_pfad, basis_welt_id: alt.basis_welt_id, version_von: alt.id });
  await sb.from('vorschlag_richtungen').update({ richtung_id: id }).eq('id', spalteId);
  await beruehrt(vid);
  return { richtungId: id };
}

export async function richtungUmbenennen(vid: string, richtungId: string, name: string) {
  if (name.trim()) await supabaseServer().from('richtungen').update({ name: name.trim().slice(0, 60) }).eq('id', richtungId);
  await beruehrt(vid);
}

/* ── Zellen rendern ── */
export type Zelle = { teilId: string; capId: string | null; richtungId: string; name: string };
export async function zellenRendern(vid: string, zellen: Zelle[]): Promise<{ ids?: string[]; fehler?: string }> {
  const fid = await firma();
  const liste = zellen.slice(0, 48);
  if (!liste.length) return { fehler: 'Nichts zu rendern.' };
  const sb = supabaseServer();
  const { data, error } = await sb.from('studio_renders').insert(liste.map((z) => ({ firma_id: fid, projekt_id: vid, teil_id: z.teilId, cap_id: z.capId,
    welt_art: 'richtung', welt_id: z.richtungId, welt_name: z.name.slice(0, 120) }))).select('id');
  if (error || !data) return { fehler: 'Das Rendern konnte nicht gestartet werden.' };
  const ids = (data as { id: string }[]).map((d) => d.id);
  // je 8 Zellen ein eigener Backend-Lauf → läuft parallel
  const laeufe = [];
  for (let i = 0; i < ids.length; i += 8) laeufe.push(backend('/api/vorschlag', { aufgabe: 'studio', ids: ids.slice(i, i + 8) }, 15_000));
  const erg = await Promise.all(laeufe);
  if (erg.every((r) => !r.ok && r.status !== 504)) {
    await sb.from('studio_renders').update({ status: 'fehler', log: 'Backend nicht erreichbar' }).in('id', ids);
    return { fehler: 'Das Rendern konnte nicht gestartet werden.' };
  }
  projektMerken(vid);
  await beruehrt(vid);
  return { ids };
}

export async function zellenStand(ids: string[]) {
  const sb = supabaseServer();
  const { data } = await sb.from('studio_renders').select('id, teil_id, welt_id, cap_id, status, log, bild_pfad, erstellt_am').in('id', ids.slice(0, 60));
  const zeilen = (data ?? []) as { id: string; teil_id: string; welt_id: string; cap_id: string | null; status: string; log: string | null; bild_pfad: string | null; erstellt_am: string }[];
  // hängengebliebene Renders (> 8 Min.) ehrlich als Fehler zeigen, damit man neu starten kann
  const alt = zeilen.filter((z) => z.status === 'laeuft' && Date.now() - new Date(z.erstellt_am).getTime() > 8 * 60_000);
  if (alt.length) {
    await sb.from('studio_renders').update({ status: 'fehler', log: 'Zeitüberschreitung — bitte neu rendern' }).in('id', alt.map((z) => z.id));
    alt.forEach((z) => { z.status = 'fehler'; z.log = 'Zeitüberschreitung — bitte neu rendern'; });
  }
  const { bildLinks } = await import('../../../../lib/supabase/server');
  const links = await bildLinks(zeilen.map((z) => z.bild_pfad), 'renders');
  return zeilen.map((z) => ({ id: z.id, teilId: z.teil_id, richtungId: z.welt_id, capId: z.cap_id, status: z.status, log: z.log, bild: z.bild_pfad ? links.get(z.bild_pfad) ?? null : null }));
}

export async function zelleEntfernen(vid: string, renderId: string) {
  await supabaseServer().from('studio_renders').update({ projekt_id: null }).eq('id', renderId);
  await beruehrt(vid);
}

/* ── Sitz des Verschlusses (Montage) ── */
export type KalGeo = {
  cap: { w: number; h: number; cropBox: { x: number; y: number; w: number; h: number }; cropRatio: number };
  body: { w: number; h: number; neckTopPct: number; silhouetteBox?: { x: number; y: number; w: number; h: number } };
  auto: { skala: number; versatzY: number };
  gespeichert: { skala: number; versatzY: number | null } | null;
};
export async function geometrieLaden(teilId: string, capId: string): Promise<{ geo?: KalGeo; fehler?: string }> {
  await firma();
  const r = await backend('/api/vorschlag', { aufgabe: 'geometrie', teilId, capId }, 45_000);
  if (!r.ok || !r.json?.cap) return { fehler: r.json?.error || 'Die Form konnte nicht gemessen werden.' };
  return { geo: r.json as KalGeo };
}
export async function kalibrierungSpeichern(vid: string, teilId: string, capId: string, skala: number, versatzY: number): Promise<{ neu?: number; fehler?: string }> {
  if (!(skala > 0 && skala <= 2) || !(versatzY >= -60 && versatzY <= 90)) return { fehler: 'Ungültige Werte.' };
  const { error } = await supabaseServer().from('teil_verschluesse').update({ montage_skala: skala, montage_versatz_y: versatzY, montage_am: jetzt() }).eq('teil_id', teilId).eq('verschluss_id', capId);
  if (error) return { fehler: 'Konnte nicht gespeichert werden.' };
  const r = await backend('/api/vorschlag', { aufgabe: 'montieren', teilId, capId }, 120_000);
  await beruehrt(vid);
  return { neu: r.ok ? Number(r.json?.neu ?? 0) : 0 };
}

/* ── Seite: Anlass, Einleitung, Verkaufssatz ── */
const EINLEITUNG: Record<string, string> = {
  neuheit: 'Wir stellen Ihnen unsere Neuheit vor – hier in verschiedenen Looks, alle auf Basis echter Teile aus unserem Sortiment.',
  marke: 'Wir haben uns gefragt, wie Ihre Marke in unseren Verpackungen aussehen könnte. Hier ein paar Ideen.',
  trend: 'Eine Idee für eine neue Linie – umgesetzt mit lieferbaren Teilen aus unserem Sortiment.',
};
export async function anlassSetzen(vid: string, anlass: 'neuheit' | 'marke' | 'trend') {
  const sb = supabaseServer();
  await sb.from('vorschlaege').update({ anlass }).eq('id', vid);
  await sb.from('vorschlaege').update({ einleitung: EINLEITUNG[anlass] }).eq('id', vid).is('einleitung', null);
  await beruehrt(vid);
}
export async function seiteTextSpeichern(vid: string, einleitung: string) {
  await supabaseServer().from('vorschlaege').update({ einleitung: einleitung.trim().slice(0, 600) || null, aktualisiert_am: jetzt() }).eq('id', vid);
  revalidatePath(pfad(vid));
}
export async function verkaufssatzSpeichern(vid: string, posId: string, text: string) {
  await supabaseServer().from('vorschlag_positionen').update({ verkaufssatz: text.trim().slice(0, 300) || null }).eq('id', posId).eq('vorschlag_id', vid);
  revalidatePath(pfad(vid));
}
