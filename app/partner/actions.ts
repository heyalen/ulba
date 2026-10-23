'use server';
/* ulba · app/partner/actions.ts — Server-Aktionen des Lieferanten-Portals (v81).
   Jede Aktion prüft selbst: angemeldet? gehört das Profil diesem Nutzer?
   Rückgabe immer { ok, fehler? } — die Seiten zeigen den Text direkt an. */
import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  lieferantVonNutzer, profilUebernehmen, firmaAnlegen, profilSpeichern,
  katalogEinreichen, anfrageStatusSetzen, type ProfilEingabe,
} from '@/lib/partner';

type Antwort = { ok: boolean; fehler?: string };

async function wer(): Promise<{ userId: string; email: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error('Bitte zuerst anmelden.');
  const u = await currentUser();
  const email = u?.primaryEmailAddress?.emailAddress || u?.emailAddresses?.[0]?.emailAddress || '';
  return { userId, email };
}
const text = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
function fehler(e: unknown): Antwort {
  return { ok: false, fehler: e instanceof Error ? e.message : 'Das hat nicht geklappt. Versuch es noch einmal.' };
}

export async function uebernehmenAction(_: Antwort | null, fd: FormData): Promise<Antwort> {
  try {
    const { userId, email } = await wer();
    if (await lieferantVonNutzer(userId)) return { ok: true };
    const id = text(fd, 'lieferantId');
    if (id === 'neu') {
      await firmaAnlegen({ name: text(fd, 'name'), website: text(fd, 'website'), land: text(fd, 'land') }, userId, email);
    } else if (/^rec[A-Za-z0-9]{14}$/.test(id)) {
      await profilUebernehmen(id, userId, email);
    } else return { ok: false, fehler: 'Bitte eine Firma wählen.' };
    revalidatePath('/partner', 'layout');
    return { ok: true };
  } catch (e) { return fehler(e); }
}

export async function profilAction(_: Antwort | null, fd: FormData): Promise<Antwort> {
  try {
    const { userId, email } = await wer();
    const l = await lieferantVonNutzer(userId);
    if (!l) return { ok: false, fehler: 'Kein Profil verknüpft.' };
    if (!l.freigegeben) return { ok: false, fehler: 'Dein Profil wird noch geprüft — Änderungen sind danach möglich.' };
    const e: ProfilEingabe = {
      beschreibung: text(fd, 'beschreibung'), standort: text(fd, 'standort'), land: text(fd, 'land'),
      website: text(fd, 'website'), email: text(fd, 'email'), zertifikat: text(fd, 'zertifikat'),
      eu: fd.get('eu') === 'on', moq: text(fd, 'moq'), lieferzeit: text(fd, 'lieferzeit'),
      logoUrl: text(fd, 'logoUrl'), titelbildUrl: text(fd, 'titelbildUrl'),
    };
    await profilSpeichern(l, e, email);
    revalidatePath('/partner', 'layout');
    return { ok: true };
  } catch (e) { return fehler(e); }
}

export async function katalogAction(_: Antwort | null, fd: FormData): Promise<Antwort> {
  try {
    const { userId, email } = await wer();
    const l = await lieferantVonNutzer(userId);
    if (!l) return { ok: false, fehler: 'Kein Profil verknüpft.' };
    await katalogEinreichen(l, text(fd, 'link'), text(fd, 'notiz'), email);
    revalidatePath('/partner/katalog');
    return { ok: true };
  } catch (e) { return fehler(e); }
}

export async function anfrageAction(_: Antwort | null, fd: FormData): Promise<Antwort> {
  try {
    const { userId } = await wer();
    const l = await lieferantVonNutzer(userId);
    if (!l) return { ok: false, fehler: 'Kein Profil verknüpft.' };
    const status = text(fd, 'status');
    if (status !== 'Weitergeleitet' && status !== 'Erledigt' && status !== 'Abgebrochen') return { ok: false, fehler: 'Unbekannter Status.' };
    await anfrageStatusSetzen(l, text(fd, 'anfrageId'), status);
    revalidatePath('/partner/anfragen');
    return { ok: true };
  } catch (e) { return fehler(e); }
}
