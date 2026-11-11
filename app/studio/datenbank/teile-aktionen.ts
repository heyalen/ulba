'use server';
/* ulba · Datenbank: Teile freigeben, verwerfen, bearbeiten. Rechte prüft die RLS. */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '../../../lib/supabase/server';
import { DEKO_OPTIONEN } from './deko';

const ROLLEN = ['behaelter', 'system', 'verschluss'];

export async function statusSetzen(form: FormData) {
  const status = String(form.get('status') ?? '');
  if (!['aktiv', 'verworfen', 'in_pruefung'].includes(status)) return;
  const alle = form.get('alle') === '1';
  const sb = supabaseServer();
  if (alle) await sb.from('teile').update({ status }).eq('status', 'in_pruefung');
  else {
    const id = String(form.get('id') ?? '');
    if (id) await sb.from('teile').update({ status }).eq('id', id);
  }
  revalidatePath('/studio/datenbank');
  const zurueck = String(form.get('zurueck') ?? '');
  if (zurueck.startsWith('/studio/')) redirect(zurueck);
}

const text = (f: FormData, k: string, max = 200) => { const v = String(f.get(k) ?? '').trim().slice(0, max); return v || null; };
const zahl = (f: FormData, k: string) => { const v = String(f.get(k) ?? '').replace(/['’\s]/g, '').replace(',', '.'); const n = Number(v); return v && Number.isFinite(n) && n >= 0 ? n : null; };

export async function teilSpeichern(form: FormData) {
  const id = String(form.get('id') ?? '');
  if (!id) return;
  const rolle = String(form.get('rolle') ?? '');
  const deko = DEKO_OPTIONEN.filter((d) => form.get(`deko_${d}`) === 'on');
  const einf = String(form.get('einfaerbbar') ?? '');
  const sb = supabaseServer();
  await sb.from('teile').update({
    name: text(form, 'name') ?? 'Teil',
    artikelnummer: text(form, 'artikelnummer', 80),
    kollektion: text(form, 'kollektion', 120),
    rolle: ROLLEN.includes(rolle) ? rolle : 'behaelter',
    material: text(form, 'material', 120),
    volumen_ml: zahl(form, 'volumen_ml'),
    hals: text(form, 'hals', 100),
    mindestmenge: (() => { const n = zahl(form, 'mindestmenge'); return n === null ? null : Math.round(n); })(),
    kurzbeschreibung: text(form, 'kurzbeschreibung', 400),
    deko_faehigkeiten: deko,
    einfaerbbar: einf === 'ja' ? true : einf === 'nein' ? false : null,
    sichtbarkeit: form.get('sichtbarkeit') === 'oeffentlich' ? 'oeffentlich' : 'privat',
  }).eq('id', id);
  revalidatePath('/studio/datenbank');
  redirect(`/studio/datenbank/${id}?gespeichert=1`);
}
