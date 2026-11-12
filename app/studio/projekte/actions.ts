'use server';
/* ulba · Projekte: anlegen, wählen, umbenennen, Teile, Designs, Marke, Link. RLS prüft die Rechte. */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ladeKontext, supabaseServer } from '../../../lib/supabase/server';
import { backend } from '../../../lib/backend';
import { projektMerken, projektSync, STANDARD_TITEL } from '../../../lib/projekt';

const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const pfad = (id: string) => `/studio/p/${id}`;

export async function projektAnlegen(titel?: string): Promise<string | null> {
  const k = await ladeKontext();
  if (!k?.firma) return null;
  const { data } = await supabaseServer().from('vorschlaege').insert({ firma_id: k.firma.id, erstellt_von: k.userId, titel: (titel || STANDARD_TITEL).slice(0, 120) }).select('id').single();
  const id = (data as { id: string } | null)?.id ?? null;
  if (id) projektMerken(id);
  revalidatePath('/studio', 'layout');
  return id;
}

export async function neuesProjekt() {
  const id = await projektAnlegen();
  redirect(id ? pfad(id) : '/studio');
}

export async function projektWaehlen(id: string) {
  projektMerken(id);
  revalidatePath('/studio', 'layout');
}

export async function umbenennen(f: FormData) {
  const id = s(f, 'id'), titel = s(f, 'titel').slice(0, 120);
  if (titel) await supabaseServer().from('vorschlaege').update({ titel, aktualisiert_am: new Date().toISOString() }).eq('id', id);
  revalidatePath('/studio', 'layout');
}

export async function archivieren(f: FormData) {
  await supabaseServer().from('vorschlaege').update({ status: 'archiviert' }).eq('id', s(f, 'id'));
  revalidatePath('/studio', 'layout');
  redirect('/studio');
}

/* Teil ins Projekt legen bzw. herausnehmen. */
export async function teilUmschalten(projektId: string, teilId: string): Promise<boolean> {
  const sb = supabaseServer();
  const { data: alt } = await sb.from('vorschlag_positionen').select('id').eq('vorschlag_id', projektId).eq('teil_id', teilId);
  if (alt?.length) {
    await sb.from('vorschlag_positionen').delete().in('id', (alt as { id: string }[]).map((a) => a.id));
    revalidatePath(pfad(projektId));
    return false;
  }
  const { count } = await sb.from('vorschlag_positionen').select('id', { count: 'exact', head: true }).eq('vorschlag_id', projektId);
  await sb.from('vorschlag_positionen').insert({ vorschlag_id: projektId, teil_id: teilId, reihenfolge: count ?? 0 });
  await sb.from('vorschlaege').update({ aktualisiert_am: new Date().toISOString() }).eq('id', projektId);
  revalidatePath(pfad(projektId));
  return true;
}

export async function teilEntfernen(f: FormData) {
  const id = s(f, 'id');
  await supabaseServer().from('vorschlag_positionen').delete().eq('vorschlag_id', id).eq('teil_id', s(f, 'teil'));
  revalidatePath(pfad(id));
}

export async function designEntfernen(f: FormData) {
  const id = s(f, 'id');
  await supabaseServer().from('studio_renders').update({ projekt_id: null }).eq('id', s(f, 'design'));
  revalidatePath(pfad(id));
}

export type MarkeStatus = { fehler?: string; ok?: boolean };
export async function markeLesen(_v: MarkeStatus, f: FormData): Promise<MarkeStatus> {
  const id = s(f, 'id');
  let url = s(f, 'url').replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(url)) return { fehler: 'Bitte die Website der Marke eingeben, z. B. marke.ch' };
  url = `https://${url}`;
  const sb = supabaseServer();
  await sb.from('vorschlaege').update({ marken_url: url, marke_id: null }).eq('id', id);
  const r = await backend('/api/vorschlag', { aufgabe: 'marke', vorschlagId: id });
  if (!r.ok) return { fehler: r.json?.error ? `Die Marke konnte nicht gelesen werden: ${r.json.error}` : 'Die Marke konnte nicht gelesen werden.' };
  const { data: v } = await sb.from('vorschlaege').select('titel, marken ( name )').eq('id', id).single();
  const vv = v as unknown as { titel: string; marken: { name: string } | null } | null;
  if (vv?.marken?.name && vv.titel === STANDARD_TITEL) await sb.from('vorschlaege').update({ titel: vv.marken.name }).eq('id', id);
  revalidatePath('/studio', 'layout');
  return { ok: true };
}

export async function linkErstellen(f: FormData) {
  const id = s(f, 'id');
  const email = s(f, 'email').toLowerCase();
  const sb = supabaseServer();
  await projektSync(sb, id);
  await sb.from('empfaenger').insert({ vorschlag_id: id, name: s(f, 'name').slice(0, 120) || null,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null, nachricht: s(f, 'nachricht').slice(0, 1000) || null });
  await sb.from('vorschlaege').update({ status: 'geteilt', aktualisiert_am: new Date().toISOString() }).eq('id', id);
  revalidatePath(pfad(id));
}

export async function linkWiderrufen(f: FormData) {
  await supabaseServer().from('empfaenger').update({ widerrufen_am: new Date().toISOString() }).eq('id', s(f, 'empfaenger'));
  revalidatePath(pfad(s(f, 'id')));
}
