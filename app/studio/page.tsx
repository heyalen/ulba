/* ulba · Studio-Start: alle Vorschläge. Ein Vorschlag = Raster aus Teilen × Design-Richtungen. */
import Link from 'next/link';
import { supabaseServer, bildLinks } from '../../lib/supabase/server';
import { ladeProjekte } from '../../lib/projekt';
import { StartFeld } from './start-feld';

export default async function Studio() {
  const sb = supabaseServer();
  const projekte = await ladeProjekte();
  const ids = projekte.map((p) => p.id);
  const [{ data: d }, { data: pos }] = ids.length ? await Promise.all([
    sb.from('studio_renders').select('projekt_id, bild_pfad').in('projekt_id', ids).eq('status', 'fertig').order('erstellt_am', { ascending: false }).limit(400),
    sb.from('vorschlag_positionen').select('vorschlag_id').in('vorschlag_id', ids),
  ]) : [{ data: [] }, { data: [] }];
  const bilder = new Map<string, string[]>();
  for (const r of (d ?? []) as { projekt_id: string; bild_pfad: string }[]) { const l = bilder.get(r.projekt_id) ?? []; if (l.length < 3) bilder.set(r.projekt_id, [...l, r.bild_pfad]); }
  const n = new Map<string, number>();
  for (const r of (d ?? []) as { projekt_id: string }[]) n.set(r.projekt_id, (n.get(r.projekt_id) ?? 0) + 1);
  const teile = new Map<string, number>();
  for (const r of (pos ?? []) as { vorschlag_id: string }[]) teile.set(r.vorschlag_id, (teile.get(r.vorschlag_id) ?? 0) + 1);
  const links = await bildLinks(Array.from(bilder.values()).flat(), 'renders');

  return (
    <>
      <StartFeld />
      {projekte.length > 0 && (<>
        <h2 className="sf-zuletzt">Zuletzt</h2>
        <div className="pj-raster" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {projekte.slice(0, 8).map((p) => {
            const b = (bilder.get(p.id) ?? []).map((x) => links.get(x)).filter(Boolean) as string[];
            return (
              <Link key={p.id} href={`/studio/p/${p.id}`} className="pj-karte" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="pj-bild" style={{ aspectRatio: '4 / 3', display: 'grid', gridTemplateColumns: b.length > 1 ? '2fr 1fr' : '1fr', gap: 4, padding: b.length ? 6 : 10 }}>
                  {b.length === 0 ? <span className="st-hilfe" style={{ alignSelf: 'center', justifySelf: 'center' }}>Noch keine Designs</span> : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', gridRow: b.length > 1 ? 'span 2' : undefined }} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {b.slice(1).map((x, i) => <img key={i} src={x} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />)}
                    </>
                  )}
                </div>
                <figcaption><b>{p.titel}</b><span>{teile.get(p.id) ?? 0} Cards · {n.get(p.id) ?? 0} Designs</span></figcaption>
              </Link>
            );
          })}
        </div>
      </>)}
    </>
  );
}
