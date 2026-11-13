'use server';
/* ulba · Lookbook aus dem Entwurf anlegen: Cards (mit Verschluss) und gespeicherte Looks in einem Schritt. */
import { revalidatePath } from 'next/cache';
import { ladeKontext, supabaseServer } from '../../../lib/supabase/server';
import { STANDARD_TITEL } from '../../../lib/projekt';

const UUID = /^[0-9a-f-]{36}$/i;
const EINLEITUNG: Record<string, string> = {
  neuheit: 'Hier eine Auswahl aus unserem Sortiment, passend zu Ihrer Anfrage – alle Teile sind lieferbar.',
  marke: 'Wir haben uns gefragt, wie Ihre Marke in unseren Verpackungen aussehen könnte. Hier ein paar Ideen.',
  trend: 'Eine Idee für eine neue Linie – umgesetzt mit lieferbaren Teilen aus unserem Sortiment.',
};

export async function lookbookErstellen(e: { titel: string; anlass: 'neuheit' | 'marke' | 'trend'; cards: { teilId: string; capId: string | null }[]; looks: string[] }): Promise<string | null> {
  const k = await ladeKontext();
  if (!k?.firma) return null;
  const sb = supabaseServer();
  const cards = e.cards.filter((c) => UUID.test(c.teilId) && (!c.capId || UUID.test(c.capId))).slice(0, 12);
  const looks = e.looks.filter((x) => UUID.test(x)).slice(0, 6);
  let titel = e.titel.trim().slice(0, 120);
  if (!titel && cards[0]) { const { data: t } = await sb.from('teile').select('name').eq('id', cards[0].teilId).maybeSingle(); titel = (t as { name: string } | null)?.name ?? ''; }
  const { data } = await sb.from('vorschlaege').insert({ firma_id: k.firma.id, erstellt_von: k.userId, titel: titel || STANDARD_TITEL, anlass: e.anlass, einleitung: EINLEITUNG[e.anlass] }).select('id').single();
  const id = (data as { id: string } | null)?.id;
  if (!id) return null;
  if (cards.length) await sb.from('vorschlag_positionen').insert(cards.map((c, i) => ({ vorschlag_id: id, teil_id: c.teilId, cap_id: c.capId, reihenfolge: i })));
  if (looks.length) await sb.from('vorschlag_richtungen').insert(looks.map((r, i) => ({ vorschlag_id: id, richtung_id: r, reihenfolge: i })));
  revalidatePath('/studio', 'layout');
  return id;
}
