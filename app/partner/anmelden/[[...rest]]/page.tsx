/* ulba · /partner/anmelden — Anmeldung/Registrierung fürs Lieferanten-Portal.
   Gleiche Clerk-Karte wie die Marken-Seite, aber mit Partner-Text; nach dem
   Login geht es immer nach /partner (dort: Firma übernehmen oder Cockpit). */
import { SignIn } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { ladeKontext, CLERK_AKTIV } from '../../_kontext';

export default async function PartnerAnmelden() {
  if (!CLERK_AKTIV) redirect('/partner');
  const k = await ladeKontext();
  if (k.userId) redirect('/partner');
  return (
    <div className="pa-eng pa-anmelden">
      <h1 className="pa-h1 klein">Anmelden als Lieferant</h1>
      <p className="pa-lead">Mit deiner Firmen-E-Mail geht es am schnellsten: Passt die Domain zur Website deiner Firma, ist dein Profil sofort bestätigt.</p>
      <SignIn forceRedirectUrl="/partner" signUpForceRedirectUrl="/partner" path="/partner/anmelden" routing="path" />
    </div>
  );
}
