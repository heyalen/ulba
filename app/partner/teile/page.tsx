import { redirect } from 'next/navigation';
import { ladeKontext } from '../_kontext';
import { teileVonLieferant } from '@/lib/partner';
import { Leer } from '../_ui';
import { teilSlug } from '@/lib/slug';

export default async function TeileSeite() {
  const k = await ladeKontext();
  if (!k.userId || !k.lieferant) redirect('/partner');
  const teile = await teileVonLieferant(k.lieferant).catch(() => []);
  const live = teile.filter((t) => t.veroeffentlicht && t.sync !== 'nicht mehr im Katalog');
  const sonst = teile.filter((t) => !live.includes(t));
  return (
    <div>
      <h1 className="pa-h1 klein">Meine Teile</h1>
      <p className="pa-lead">{live.length} {live.length === 1 ? 'Teil ist' : 'Teile sind'} auf ulba sichtbar{sonst.length ? `, ${sonst.length} in Vorbereitung oder archiviert` : ''}. Fehlt etwas? <a href="/partner/katalog">Katalog einreichen</a>.</p>
      {teile.length === 0 && <Leer text="Noch keine Teile verknüpft. Reiche deinen Katalog ein — wir übernehmen die Teile für dich." />}
      {live.length > 0 && <Raster teile={live} />}
      {sonst.length > 0 && (
        <details className="pa-details">
          <summary>In Vorbereitung oder archiviert ({sonst.length})</summary>
          <Raster teile={sonst} />
        </details>
      )}
    </div>
  );
}

function Raster({ teile }: { teile: Awaited<ReturnType<typeof teileVonLieferant>> }) {
  return (
    <div className="pa-raster">
      {teile.map((t) => (
        <a key={t.id} className="pa-teil" href={`/teil/${teilSlug(t.name, t.id)}`} target="_blank" rel="noopener">
          <div className="pa-teil-bild">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {t.bild ? <img src={`/api/bild?r=${t.id}`} alt="" loading="lazy" /> : <span>◇</span>}
          </div>
          <b>{t.name}</b>
          <span>{[t.typ, t.material.join('/'), t.groessen.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</span>
          <em className={t.veroeffentlicht ? 'live' : ''}>{t.sync === 'nicht mehr im Katalog' ? 'Archiviert' : t.veroeffentlicht ? 'Sichtbar' : (t.pipeline || 'In Vorbereitung')}</em>
        </a>
      ))}
    </div>
  );
}
