/* ulba · Projekte (technisch: Tabelle vorschlaege). Ein Projekt = ein Kunde
   oder Anlass: Teile, Designs, Link, Anfragen. Das offene Projekt steht im
   Cookie, damit Katalog und Projekt zusammenarbeiten. Nur Server-Code. */
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from './supabase/server';

export const PROJEKT_COOKIE = 'ulba_projekt';
export const STANDARD_TITEL = 'Unbenanntes Projekt';
export type ProjektKurz = { id: string; titel: string; marke: string | null };

export const ladeProjekte = cache(async (): Promise<ProjektKurz[]> => {
  const { data } = await supabaseServer().from('vorschlaege').select('id, titel, marken ( name )').neq('status', 'archiviert').order('aktualisiert_am', { ascending: false });
  return ((data ?? []) as unknown as { id: string; titel: string; marken: { name: string } | null }[]).map((p) => ({ id: p.id, titel: p.titel, marke: p.marken?.name ?? null }));
});

export function aktivesProjektId(liste: ProjektKurz[]): string | null {
  const id = cookies().get(PROJEKT_COOKIE)?.value;
  return id && liste.some((p) => p.id === id) ? id : null;
}

export function projektMerken(id: string) {
  cookies().set(PROJEKT_COOKIE, id, { path: '/', httpOnly: true, sameSite: 'lax', secure: true, maxAge: 60 * 60 * 24 * 180 });
}

/* Studio-Designs → Freigabe-Struktur der Vorschlagsseite /v
   (Positionen = Teile, Richtungen = Welt + Ton, Renders = fertige Designs). */
export async function projektSync(sb: SupabaseClient, vid: string): Promise<number> {
  const [{ data: d }, { data: pos }, { data: ri }] = await Promise.all([
    sb.from('studio_renders').select('id, teil_id, welt_art, welt_id, hex, bild_pfad, erstellt_am').eq('projekt_id', vid).eq('status', 'fertig').order('erstellt_am'),
    sb.from('vorschlag_positionen').select('id, teil_id, reihenfolge').eq('vorschlag_id', vid),
    sb.from('vorschlag_richtungen').select('id, design_welt_id, marken_look_id, hex').eq('vorschlag_id', vid),
  ]);
  const designs = (d ?? []) as { id: string; teil_id: string; welt_art: string; welt_id: string; hex: string | null; bild_pfad: string }[];
  const posVon = new Map(((pos ?? []) as { id: string; teil_id: string }[]).map((p) => [p.teil_id, p.id]));
  const rKey = (art: string, id: string, hex: string | null) => `${art}|${id}|${hex || ''}`;
  const riVon = new Map(((ri ?? []) as { id: string; design_welt_id: string | null; marken_look_id: string | null; hex: string | null }[])
    .map((r) => [r.design_welt_id ? rKey('welt', r.design_welt_id, r.hex) : rKey('look', r.marken_look_id!, r.hex), r.id]));

  const neuePos = Array.from(new Set(designs.map((x) => x.teil_id))).filter((t) => !posVon.has(t));
  if (neuePos.length) {
    const { data } = await sb.from('vorschlag_positionen').insert(neuePos.map((t, i) => ({ vorschlag_id: vid, teil_id: t, reihenfolge: posVon.size + i }))).select('id, teil_id');
    ((data ?? []) as { id: string; teil_id: string }[]).forEach((p) => posVon.set(p.teil_id, p.id));
  }
  const neueRi = Array.from(new Map(designs.map((x) => [rKey(x.welt_art, x.welt_id, x.hex), x])).values()).filter((x) => !riVon.has(rKey(x.welt_art, x.welt_id, x.hex)));
  if (neueRi.length) {
    const { data } = await sb.from('vorschlag_richtungen').insert(neueRi.map((x, i) => ({ vorschlag_id: vid, reihenfolge: riVon.size + i, hex: x.hex,
      ...(x.welt_art === 'welt' ? { design_welt_id: x.welt_id } : { marken_look_id: x.welt_id }) }))).select('id, design_welt_id, marken_look_id, hex');
    ((data ?? []) as { id: string; design_welt_id: string | null; marken_look_id: string | null; hex: string | null }[])
      .forEach((r) => riVon.set(r.design_welt_id ? rKey('welt', r.design_welt_id, r.hex) : rKey('look', r.marken_look_id!, r.hex), r.id));
  }
  // je Teil × Richtung das neueste Design
  const zeilen = new Map<string, { vorschlag_id: string; position_id: string; richtung_id: string; bild_pfad: string; status: string; render_version: string }>();
  for (const x of designs) {
    const p = posVon.get(x.teil_id), r = riVon.get(rKey(x.welt_art, x.welt_id, x.hex));
    if (p && r) zeilen.set(`${p}|${r}`, { vorschlag_id: vid, position_id: p, richtung_id: r, bild_pfad: x.bild_pfad, status: 'fertig', render_version: 'studio-v1' });
  }
  // nur Studio-Renders verwalten — ältere Vorschlags-Renders bleiben unberührt
  const { data: alt } = await sb.from('renders').select('id, position_id, richtung_id, render_version').eq('vorschlag_id', vid);
  const altListe = (alt ?? []) as { id: string; position_id: string; richtung_id: string; render_version: string | null }[];
  const weg = altListe.filter((a) => a.render_version === 'studio-v1' && !zeilen.has(`${a.position_id}|${a.richtung_id}`)).map((a) => a.id);
  if (weg.length) await sb.from('renders').delete().in('id', weg);
  if (zeilen.size) await sb.from('renders').upsert(Array.from(zeilen.values()), { onConflict: 'position_id,richtung_id' });
  // Richtungen ohne Design entfernen (Anfragen behalten ihre Teile)
  const genutzt = new Set([...Array.from(zeilen.values()).map((z) => z.richtung_id), ...altListe.filter((a) => a.render_version !== 'studio-v1').map((a) => a.richtung_id)]);
  const leer = designs.length ? Array.from(riVon.values()).filter((id) => !genutzt.has(id)) : [];
  if (leer.length) await sb.from('vorschlag_richtungen').delete().in('id', leer);
  return zeilen.size;
}
