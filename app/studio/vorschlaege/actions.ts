'use server';
/* ulba · Vorschlag erstellen und bearbeiten (Design-Maske). Rechte prüft die RLS. */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ladeKontext, supabaseServer } from '../../../lib/supabase/server';
import { backend } from '../../../lib/backend';

const pfad = (id: string) => `/studio/vorschlaege/${id}`;
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

export async function neuerVorschlag() {
  const k = await ladeKontext();
  if (!k?.firma) redirect('/login');
  const { data } = await supabaseServer().from('vorschlaege').insert({ firma_id: k.firma.id, erstellt_von: k.userId, titel: 'Neuer Vorschlag' }).select('id').single();
  redirect(pfad((data as { id: string }).id));
}

export type MarkeStatus = { fehler?: string };
export async function markeSetzen(_v: MarkeStatus, f: FormData): Promise<MarkeStatus> {
  const id = s(f, 'id');
  let url = s(f, 'url').replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(url)) return { fehler: 'Bitte die Website der Marke eingeben, z. B. marke.ch' };
  url = `https://${url}`;
  const sb = supabaseServer();
  // Looks der alten Marke aus diesem Vorschlag entfernen
  await sb.from('vorschlag_richtungen').delete().eq('vorschlag_id', id);
  await sb.from('vorschlaege').update({ marken_url: url, marke_id: null }).eq('id', id);
  const r = await backend('/api/vorschlag', { aufgabe: 'marke', vorschlagId: id });
  if (!r.ok) return { fehler: r.json?.error ? `Die Marke konnte nicht gelesen werden: ${r.json.error}` : 'Die Marke konnte nicht gelesen werden.' };
  const { data: v } = await sb.from('vorschlaege').select('marke_id, marken ( name )').eq('id', id).single();
  const name = (v as any)?.marken?.name;
  if (name) await sb.from('vorschlaege').update({ titel: `Vorschlag für ${name}` }).eq('id', id);
  // Alle erkannten Linien der Marke direkt als Looks übernehmen
  const { data: looks } = await sb.from('marken_looks').select('id').eq('marke_id', (v as any)?.marke_id).is('firma_id', null);
  if (looks?.length) await sb.from('vorschlag_richtungen').insert(looks.map((l: any, i: number) => ({ vorschlag_id: id, marken_look_id: l.id, reihenfolge: i })));
  revalidatePath(pfad(id));
  return {};
}

export async function teilUmschalten(f: FormData) {
  const id = s(f, 'id'), teil = s(f, 'teil');
  const sb = supabaseServer();
  const { data: alt } = await sb.from('vorschlag_positionen').select('id').eq('vorschlag_id', id).eq('teil_id', teil).maybeSingle();
  if (alt) await sb.from('vorschlag_positionen').delete().eq('id', (alt as any).id);
  else {
    // Standard-Verschluss: der erste vom Hersteller zugeordnete
    const { data: v } = await sb.from('teil_verschluesse').select('verschluss_id').eq('teil_id', teil).limit(1);
    const { count } = await sb.from('vorschlag_positionen').select('id', { count: 'exact', head: true }).eq('vorschlag_id', id);
    await sb.from('vorschlag_positionen').insert({ vorschlag_id: id, teil_id: teil, cap_id: (v as any)?.[0]?.verschluss_id ?? null, reihenfolge: count ?? 0 });
  }
  revalidatePath(pfad(id));
}

export async function capSetzen(f: FormData) {
  const id = s(f, 'id'), pos = s(f, 'pos'), cap = s(f, 'cap');
  const sb = supabaseServer();
  await sb.from('vorschlag_positionen').update({ cap_id: cap || null }).eq('id', pos);
  await sb.from('renders').delete().eq('position_id', pos); // anderer Verschluss → neu rendern
  revalidatePath(pfad(id));
}

export async function lookUmschalten(f: FormData) {
  const id = s(f, 'id'), look = s(f, 'look');
  const sb = supabaseServer();
  const { data: alt } = await sb.from('vorschlag_richtungen').select('id').eq('vorschlag_id', id).eq('marken_look_id', look).maybeSingle();
  if (alt) await sb.from('vorschlag_richtungen').delete().eq('id', (alt as any).id);
  else {
    const { count } = await sb.from('vorschlag_richtungen').select('id', { count: 'exact', head: true }).eq('vorschlag_id', id);
    await sb.from('vorschlag_richtungen').insert({ vorschlag_id: id, marken_look_id: look, reihenfolge: count ?? 0 });
  }
  revalidatePath(pfad(id));
}

export async function weltHinzufuegen(f: FormData) {
  const id = s(f, 'id'), welt = s(f, 'welt');
  if (!welt) return;
  const k = await ladeKontext();
  const sb = supabaseServer();
  const [{ data: v }, { data: w }] = await Promise.all([
    sb.from('vorschlaege').select('marke_id').eq('id', id).single(),
    sb.from('design_welten').select('id, name, felder').eq('id', welt).single(),
  ]);
  if (!(v as any)?.marke_id || !w || !k?.firma) return;
  const { data: look } = await sb.from('marken_looks').insert({ marke_id: (v as any).marke_id, firma_id: k.firma.id, linie_name: `Neu: ${(w as any).name}`,
    quelle: 'welt', welt_id: (w as any).id, design_komponenten: (w as any).felder }).select('id').single();
  const { count } = await sb.from('vorschlag_richtungen').select('id', { count: 'exact', head: true }).eq('vorschlag_id', id);
  if (look) await sb.from('vorschlag_richtungen').insert({ vorschlag_id: id, marken_look_id: (look as any).id, reihenfolge: count ?? 0 });
  revalidatePath(pfad(id));
}

export async function briefingSpeichern(f: FormData) {
  const id = s(f, 'id');
  const sb = supabaseServer();
  await sb.from('vorschlaege').update({ briefing_text: s(f, 'briefing').slice(0, 500) || null }).eq('id', id);
  await sb.from('renders').delete().eq('vorschlag_id', id); // neues Briefing → alles neu rendern
  revalidatePath(pfad(id));
}

export async function rendernStarten(f: FormData) {
  const id = s(f, 'id');
  await backend('/api/vorschlag', { aufgabe: 'rendern', vorschlagId: id }, 20_000);
  // kurz warten, bis das Backend die Platzhalter angelegt hat
  await new Promise((z) => setTimeout(z, 1500));
  revalidatePath(pfad(id));
}
