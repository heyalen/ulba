'use server';
/* ulba · Studio-Werkbank: rendern (Einzelteil, Farbvarianten, vertikale Linie),
   Stand abfragen, frühere Designs, als Vorschlag teilen. Rechte prüft die RLS. */
import { ladeKontext, supabaseServer, bildLinks } from '../../../lib/supabase/server';
import { backend } from '../../../lib/backend';
import { projektAnlegen } from '../projekte/actions';

export type RenderAuftrag = { teilId: string; capId: string | null; weltArt: 'welt' | 'look'; weltId: string; weltName: string; hex?: string | null };
export type RenderStand = { id: string; teilId: string; capId: string | null; weltArt: 'welt' | 'look'; weltId: string; weltName: string; hex: string | null; gruppe: string | null; status: string; log: string | null; bild: string | null };

type Zeile = { id: string; teil_id: string; cap_id: string | null; welt_art: 'welt' | 'look'; welt_id: string; welt_name: string | null; hex: string | null; gruppe: string | null; status: string; log: string | null; bild_pfad: string | null; erstellt_am: string };

async function stand(zeilen: Zeile[]): Promise<RenderStand[]> {
  const links = await bildLinks(zeilen.map((z) => z.bild_pfad), 'renders');
  return zeilen.map((z) => ({ id: z.id, teilId: z.teil_id, capId: z.cap_id, weltArt: z.welt_art, weltId: z.welt_id, weltName: z.welt_name || '', hex: z.hex,
    gruppe: z.gruppe, status: z.status, log: z.log, bild: z.bild_pfad ? links.get(z.bild_pfad) ?? null : null }));
}

export async function rendernStarten(auftraege: RenderAuftrag[], gruppe: string | null, projektId: string | null): Promise<{ ids?: string[]; projektId?: string; fehler?: string }> {
  const k = await ladeKontext();
  if (!k?.firma) return { fehler: 'Nicht angemeldet.' };
  // Ohne offenes Projekt legen wir still eins an — jedes Design hat ein Zuhause
  const pid = projektId || (await projektAnlegen());
  const liste = auftraege.slice(0, 12);
  if (!liste.length) return { fehler: 'Nichts zu rendern.' };
  const { data, error } = await supabaseServer().from('studio_renders').insert(liste.map((a) => ({
    firma_id: k.firma!.id, teil_id: a.teilId, cap_id: a.capId, welt_art: a.weltArt, welt_id: a.weltId, welt_name: a.weltName.slice(0, 120),
    hex: a.hex && /^#[0-9a-f]{6}$/i.test(a.hex) ? a.hex : null, gruppe: gruppe || null, projekt_id: pid,
  }))).select('id');
  if (error || !data) return { fehler: 'Das Rendern konnte nicht gestartet werden.' };
  const ids = (data as { id: string }[]).map((d) => d.id);
  const r = await backend('/api/vorschlag', { aufgabe: 'studio', ids }, 15_000);
  if (!r.ok && r.status !== 504) {
    await supabaseServer().from('studio_renders').update({ status: 'fehler', log: r.json?.error || 'Backend nicht erreichbar' }).in('id', ids);
    return { fehler: r.json?.error || 'Das Rendern konnte nicht gestartet werden.' };
  }
  if (pid) await supabaseServer().from('vorschlaege').update({ aktualisiert_am: new Date().toISOString() }).eq('id', pid);
  return { ids, projektId: pid ?? undefined };
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
