/* ulba · Bibliothek der Design-Richtungen — wächst mit jedem Vorschlag. */
import { revalidatePath } from 'next/cache';
import { supabaseServer, bildLinks } from '../../../lib/supabase/server';

async function archivieren(f: FormData) {
  'use server';
  await supabaseServer().from('richtungen').update({ archiviert: true }).eq('id', String(f.get('id')));
  revalidatePath('/studio/richtungen');
}
const QUELLE: Record<string, string> = { beschreibung: 'Beschrieben', welt: 'Welt', referenz: 'Referenzbild', marke: 'Marke', verfeinert: 'Verfeinert', manuell: 'Eigene' };
const hex = (v: unknown) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null);

export default async function Richtungen() {
  const { data } = await supabaseServer().from('richtungen').select('id, name, beschreibung, felder, quelle, bild_pfad, version_von').eq('archiviert', false).order('erstellt_am', { ascending: false });
  const alle = (data ?? []) as { id: string; name: string; beschreibung: string | null; felder: Record<string, unknown>; quelle: string; bild_pfad: string | null; version_von: string | null }[];
  const ersetzt = new Set(alle.map((r) => r.version_von).filter(Boolean));
  const liste = alle.filter((r) => !ersetzt.has(r.id));
  const bilder = await bildLinks(liste.map((r) => r.bild_pfad), 'referenzen');
  return (
    <>
      <div className="st-titelzeile"><h1>Richtungen</h1></div>
      <p className="st-hilfe" style={{ marginTop: -8, marginBottom: 18 }}>Jede Design-Richtung, die du in einem Vorschlag anlegst, landet hier — und lässt sich in jedem neuen Vorschlag wiederverwenden.</p>
      {liste.length === 0 ? (
        <div className="pj-leer"><h2>Noch keine Richtungen</h2><p>Öffne einen Vorschlag und füg eine Richtung hinzu: beschreiben, Welt wählen, Referenzbild oder Marke.</p></div>
      ) : (
        <div className="pj-raster">
          {liste.map((r) => (
            <figure key={r.id} className="pj-karte">
              <div className="pj-bild" style={{ aspectRatio: '16 / 9', background: hex(r.felder.Body_Hex) ?? '#EEE', padding: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.bild_pfad && bilder.get(r.bild_pfad) && <img src={bilder.get(r.bild_pfad)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'normal' }} />}
              </div>
              <figcaption>
                <b>{r.name}</b>
                <span>{[r.felder.Body_Hex, r.felder.Cap_Hex, r.felder.Akzent_Hex].map(hex).filter(Boolean).map((h, i) => <i key={i} className="pj-tupf" style={{ background: h! }} />)}{QUELLE[r.quelle] ?? r.quelle}</span>
                {r.beschreibung && <span style={{ display: 'block' }}>{r.beschreibung}</span>}
              </figcaption>
              <form action={archivieren}><input type="hidden" name="id" value={r.id} /><button className="pj-x" type="submit" aria-label="Archivieren" title="Archivieren">×</button></form>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}
