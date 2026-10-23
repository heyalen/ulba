/* ulba · app/partner/_kontext.ts — wer ist da, und welches Profil gehört ihm. */
import { auth, currentUser } from '@clerk/nextjs/server';
import { lieferantVonNutzer, type PartnerLieferant } from '@/lib/partner';

export const CLERK_AKTIV = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

export interface Kontext { userId: string | null; email: string; lieferant: PartnerLieferant | null }

export async function ladeKontext(): Promise<Kontext> {
  if (!CLERK_AKTIV) return { userId: null, email: '', lieferant: null };
  const { userId } = await auth();
  if (!userId) return { userId: null, email: '', lieferant: null };
  const [u, lieferant] = await Promise.all([currentUser(), lieferantVonNutzer(userId).catch(() => null)]);
  const email = u?.primaryEmailAddress?.emailAddress || u?.emailAddresses?.[0]?.emailAddress || '';
  return { userId, email, lieferant };
}
