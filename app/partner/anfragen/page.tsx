import { redirect } from 'next/navigation';
import { ladeKontext } from '../_kontext';
import { anfragenVonLieferant } from '@/lib/partner';
import { Leer } from '../_ui';
import { StatusKnoepfe } from './status';

export default async function AnfragenSeite() {
  const k = await ladeKontext();
  if (!k.userId || !k.lieferant) redirect('/partner');
  const anfragen = await anfragenVonLieferant(k.lieferant).catch(() => []);
  return (
    <div>
      <h1 className="pa-h1 klein">Musteranfragen</h1>
      <p className="pa-lead">Jede Anfrage kommt von einer Marke, die dein Teil in ihrem Design gesehen hat. Antworte direkt per E-Mail und halte den Status hier aktuell.</p>
      {anfragen.length === 0 && <Leer text="Noch keine Musteranfragen. Sobald eine Marke ein Muster deines Teils anfragt, erscheint sie hier." />}
      <div className="pa-anfragen">
        {anfragen.map((a) => (
          <article key={a.id} className={`pa-anfrage${a.status === 'Neu' ? ' neu' : ''}`}>
            <header>
              <div>
                <b>{a.firma || a.name || 'Anfrage'}</b>
                <span>{[a.name, a.datum].filter(Boolean).join(' · ')}</span>
              </div>
              <span className={`pa-status s-${a.status.toLowerCase()}`}>{a.status}</span>
            </header>
            <dl className="pa-dl">
              {a.teilName && <><dt>Teil</dt><dd>{a.teilId ? <a href={`/teil/${slugTeil(a.teilName, a.teilId)}`} target="_blank" rel="noopener">{a.teilName} ↗</a> : a.teilName}</dd></>}
              {a.cap && <><dt>Verschluss</dt><dd>{a.cap}</dd></>}
              {a.konzept && <><dt>Designwelt</dt><dd>{a.konzept}</dd></>}
              {a.wunsch && <><dt>Wunsch</dt><dd>{a.wunsch}</dd></>}
              {a.notiz && <><dt>Nachricht</dt><dd>{a.notiz}</dd></>}
              {a.email && <><dt>Kontakt</dt><dd><a href={`mailto:${a.email}?subject=${encodeURIComponent(`Ihre Musteranfrage über ulba${a.teilName ? ` — ${a.teilName}` : ''}`)}`}>{a.email}</a></dd></>}
            </dl>
            {a.render && (
              <a className="pa-render" href={a.render} target="_blank" rel="noopener">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.render} alt="Wunsch-Render" loading="lazy" />
                <span>Wunsch-Render der Marke</span>
              </a>
            )}
            <StatusKnoepfe anfrageId={a.id} status={a.status} />
          </article>
        ))}
      </div>
    </div>
  );
}

function slugTeil(name: string, id: string) {
  const s = name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${s}-${id.slice(3, 9).toLowerCase()}`;
}
