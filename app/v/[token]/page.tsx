/* ulba · Vorschlagsseite für Marken — nur mit gültigem Link erreichbar, nie in Suchmaschinen. */
import type { Metadata } from 'next';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { empfaengerPruefen, ladeAnsicht } from './daten';
import { VorschlagAnsicht } from './ansicht';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Vorschlag', robots: { index: false, follow: false, nocache: true } };

export default async function Vorschlag({ params }: { params: { token: string } }) {
  const e = await empfaengerPruefen(params.token);
  const a = e ? await ladeAnsicht(e) : null;
  if (!e || !a) {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div><h1 style={{ fontSize: 24, marginBottom: 8 }}>Dieser Link ist nicht mehr gültig</h1><p style={{ color: '#4A4A4A' }}>Bitte fragen Sie beim Absender einen neuen Link an.</p></div>
      </main>
    );
  }
  await supabaseAdmin().from('ereignisse').insert({ empfaenger_id: e.id, art: 'geoeffnet' });
  return <VorschlagAnsicht token={params.token} a={a} />;
}
