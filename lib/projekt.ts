/* ulba · Projekte (technisch: Tabelle vorschlaege). Ein Projekt = ein Kunde
   oder Anlass: Teile, Designs, Link, Anfragen. Das offene Projekt steht im
   Cookie, damit Katalog und Projekt zusammenarbeiten. Nur Server-Code. */
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from './supabase/server';

export const PROJEKT_COOKIE = 'ulba_projekt';
export const STANDARD_TITEL = 'Neuer Vorschlag';
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

/* Raster → Freigabe-Struktur der Vorschlagsseite /v.
   Zeilen = vorschlag_positionen, Spalten = vorschlag_richtungen (mit richtung_id),
   Zellen = neuestes fertiges Studio-Render je Teil × Richtung. */
export async function projektSync(sb: SupabaseClient, vid: string): Promise<number> {
  const [{ data: cols }, { data: pos }, { data: d }, { data: alt }] = await Promise.all([
    sb.from('vorschlag_richtungen').select('id, richtung_id').eq('vorschlag_id', vid).not('richtung_id', 'is', null),
    sb.from('vorschlag_positionen').select('id, teil_id').eq('vorschlag_id', vid),
    sb.from('studio_renders').select('teil_id, welt_id, bild_pfad, cap_pfad').eq('projekt_id', vid).eq('welt_art', 'richtung').eq('status', 'fertig').order('erstellt_am'),
    sb.from('renders').select('id, position_id, richtung_id').eq('vorschlag_id', vid),
  ]);
  const colVon = new Map(((cols ?? []) as { id: string; richtung_id: string }[]).map((c) => [c.richtung_id, c.id]));
  const posVon = new Map(((pos ?? []) as { id: string; teil_id: string }[]).map((p) => [p.teil_id, p.id]));
  const zeilen = new Map<string, Record<string, unknown>>();
  for (const x of (d ?? []) as { teil_id: string; welt_id: string; bild_pfad: string; cap_pfad: string | null }[]) {
    const p = posVon.get(x.teil_id), c = colVon.get(x.welt_id);
    if (p && c) zeilen.set(`${p}|${c}`, { vorschlag_id: vid, position_id: p, richtung_id: c, bild_pfad: x.bild_pfad, cap_pfad: x.cap_pfad, status: 'fertig', render_version: 'studio-v2' });
  }
  const weg = ((alt ?? []) as { id: string; position_id: string; richtung_id: string }[]).filter((a) => !zeilen.has(`${a.position_id}|${a.richtung_id}`)).map((a) => a.id);
  if (weg.length) await sb.from('renders').delete().in('id', weg);
  if (zeilen.size) await sb.from('renders').upsert(Array.from(zeilen.values()), { onConflict: 'position_id,richtung_id' });
  return zeilen.size;
}
