'use server';
/* ulba · Studio-Werkbank: rendern (Einzelteil, Farbvarianten, vertikale Linie),
   Stand abfragen, frühere Designs, als Vorschlag teilen. Rechte prüft die RLS. */
import { redirect } from 'next/navigation';
import { ladeKontext, supabaseServer, bildLinks } from '../../../lib/supabase/server';
import { backend } from '../../../lib/backend';

export type RenderAuftrag = { teilId: string; capId: string | null; weltArt: 'welt' | 'look'; weltId: string; weltName: string; hex?: string | null };
export type RenderStand = { id: string; teilId: string; capId: string | null; weltArt: 'welt' | 'look'; weltId: string; weltName: string; hex: string | null; gruppe: string | null; status: string; log: string | null; bild: string | null };

type Zeile = { id: string; teil_id: string; cap_id: string | null; welt_art: 'welt' | 'look'; welt_id: string; welt_name: string | null; hex: string | null; gruppe: string | null; status: string; log: string | null; bild_pfad: string | null; erstellt_am: string };

async function stand(zeilen: Zeile[]): Promise<RenderStand[]> {
  const links = await bildLinks(zeilen.map((z) => z.bild_pfad), 'renders');
  return zeilen.map((z) => ({ id: z.id, teilId: z.teil_id, capId: z.cap_id, weltArt: z.welt_art, weltId: z.welt_id, weltName: z.welt_name || '', hex: z.hex,
    gruppe: z.gruppe, status: z.status, log: z.log, bild: z.bild_pfad ? links.get(z.bild_pfad) ?? null : null }));
}

export async function rendernStarten(auftraege: RenderAuftrag[], gruppe?: string | null): Promise<{ ids?: string[]; fehler?: string }> {
  const k = await ladeKontext();
  if (!k?.firma) return { fehler: 'Nicht angemeldet.' };
  const liste = auftraege.slice(0, 12);
  if (!liste.length) return { fehler: 'Nichts zu rendern.' };
  const { data, error } = await supabaseServer().from('studio_renders').insert(liste.map((a) => ({
    firma_id: k.firma!.id, teil_id: a.teilId, cap_id: a.capId, welt_art: a.weltArt, welt_id: a.weltId, welt_name: a.weltName.slice(0, 120),
    hex: a.hex && /^#[0-9a-f]{6}$/i.test(a.hex) ? a.hex : null, gruppe: gruppe || null,
  }))).select('id');
  if (error || !data) return { fehler: 'Das Rendern konnte nicht gestartet werden.' };
  const ids = (data as { id: string }[]).map((d) => d.id);
  const r = await backend('/api/vorschlag', { aufgabe: 'studio', ids }, 15_000);
  if (!r.ok && r.status !== 504) {
    await supabaseServer().from('studio_renders').update({ status: 'fehler', log: r.json?.error || 'Backend nicht erreichbar' }).in('id', ids);
    return { fehler: r.json?.error || 'Das Rendern konnte nicht gestartet werden.' };
  }
  return { ids };
}

export async function renderStand(ids: string[]): Promise<RenderStand[]> {
  if (!ids.length) return [];
  const { data } = await supabaseServer().from('studio_renders').select('*').in('id', ids.slice(0, 40));
  return stand((data ?? []) as Zeile[]);
}

export async function teilDesigns(teilId: string): Promise<RenderStand[]> {
  const { data } = await supabaseServer().from('studio_renders').select('*').eq('teil_id', teilId).eq('status', 'fertig')
    .order('erstellt_am', { ascending: false }).limit(12);
  return stand((data ?? []) as Zeile[]);
}

/* Fertige Studio-Renders → Vorschlag (Teile × Welten), danach Teilen-Bereich. */
export async function alsVorschlag(ids: string[], titel: string) {
  const k = await ladeKontext();
  if (!k?.firma) redirect('/login');
  const sb = supabaseServer();
  const { data } = await sb.from('studio_renders').select('*').in('id', ids.slice(0, 40)).eq('status', 'fertig');
  const rs = (data ?? []) as Zeile[];
  if (!rs.length) return;
  const { data: v } = await sb.from('vorschlaege').insert({ firma_id: k.firma.id, erstellt_von: k.userId, titel: titel.slice(0, 120) || 'Neuer Vorschlag' }).select('id').single();
  const vid = (v as { id: string }).id;

  const posKey = (r: Zeile) => `${r.teil_id}|${r.cap_id || ''}`;
  const weltKey = (r: Zeile) => `${r.welt_art}|${r.welt_id}`;
  const posKeys = Array.from(new Set(rs.map(posKey)));
  const weltKeys = Array.from(new Set(rs.map(weltKey)));
  const { data: pos } = await sb.from('vorschlag_positionen').insert(posKeys.map((p, i) => {
    const [teil, cap] = p.split('|');
    return { vorschlag_id: vid, teil_id: teil, cap_id: cap || null, reihenfolge: i };
  })).select('id, teil_id, cap_id');
  const { data: ri } = await sb.from('vorschlag_richtungen').insert(weltKeys.map((w, i) => {
    const [art, id] = w.split('|');
    return { vorschlag_id: vid, reihenfolge: i, ...(art === 'welt' ? { design_welt_id: id } : { marken_look_id: id }) };
  })).select('id, design_welt_id, marken_look_id');

  const posId = new Map(((pos ?? []) as { id: string; teil_id: string; cap_id: string | null }[]).map((p) => [`${p.teil_id}|${p.cap_id || ''}`, p.id]));
  const riId = new Map(((ri ?? []) as { id: string; design_welt_id: string | null; marken_look_id: string | null }[])
    .map((r) => [r.design_welt_id ? `welt|${r.design_welt_id}` : `look|${r.marken_look_id}`, r.id]));
  const gesehen = new Set<string>();
  const renders = rs.filter((r) => { const key = `${posKey(r)}#${weltKey(r)}`; if (gesehen.has(key)) return false; gesehen.add(key); return true; })
    .map((r) => ({ vorschlag_id: vid, position_id: posId.get(posKey(r))!, richtung_id: riId.get(weltKey(r))!, bild_pfad: r.bild_pfad, cap_pfad: null, status: 'fertig', render_version: 'studio-v1' }));
  if (renders.length) await sb.from('renders').insert(renders);
  redirect(`/studio/vorschlaege/${vid}#teilen-titel`);
}
