'use client';
/* ulba · Entwurf bestätigen: Cards anhaken, Look wählen, Lookbook erstellen. */
import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { lookbookErstellen } from './actions';
import './neu.css';

export type ECard = { id: string; name: string; spec: string; bild: string | null; capId: string | null };
export type ELook = { id: string; name: string; hex: string };

export function Entwurf({ q, erkannt, url, stil, treffer, weitere, looks }: { q: string; erkannt: string[]; url: string | null; stil: string; treffer: ECard[]; weitere: ECard[]; looks: ELook[] }) {
  const router = useRouter();
  const [wahl, setWahl] = useState<Set<string>>(new Set(treffer.slice(0, 3).map((c) => c.id)));
  const [alle, setAlle] = useState(treffer.length === 0);
  const [suche, setSuche] = useState('');
  const [lookWahl, setLookWahl] = useState<Set<string>>(new Set());
  const [ausText, setAusText] = useState(!!stil && !url);
  const [ausMarke, setAusMarke] = useState(!!url);
  const [fehler, setFehler] = useState(false);
  const [laeuft, start] = useTransition();
  const umschalten = (s: Set<string>, id: string) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; };
  const gefiltert = useMemo(() => { const w = suche.trim().toLowerCase().split(/\s+/).filter(Boolean); return weitere.filter((c) => w.every((x) => `${c.name} ${c.spec}`.toLowerCase().includes(x))); }, [weitere, suche]);
  const karten = new Map([...treffer, ...weitere].map((c) => [c.id, c]));

  const erstellen = () => start(async () => {
    setFehler(false);
    const cards = Array.from(wahl).map((id) => karten.get(id)).filter((c): c is ECard => !!c).map((c) => ({ teilId: c.id, capId: c.capId }));
    const id = await lookbookErstellen({ titel: q, anlass: ausMarke ? 'marke' : ausText ? 'trend' : 'neuheit', cards, looks: Array.from(lookWahl) });
    if (!id) { setFehler(true); return; }
    const p = ausMarke && url ? `?start=marke&idee=${encodeURIComponent(url)}` : ausText && stil ? `?start=look&idee=${encodeURIComponent(stil)}` : '';
    router.push(`/studio/p/${id}${p}`);
  });

  const Kachel = ({ c }: { c: ECard }) => {
    const an = wahl.has(c.id);
    return (
      <button type="button" className={`en-card${an ? ' an' : ''}`} aria-pressed={an} onClick={() => setWahl((s) => umschalten(s, c.id))}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="en-bild">{c.bild && <img src={c.bild} alt="" loading="lazy" />}<i aria-hidden="true">{an ? '✓' : '+'}</i></span>
        <b>{c.name}</b><span>{c.spec}</span>
      </button>
    );
  };

  return (
    <div className="en">
      <Link href="/studio" className="en-zurueck">← Andere Eingabe</Link>
      <h1>{q ? `«${q}»` : 'Neues Lookbook'}</h1>
      {(erkannt.length > 0 || url || stil) && (
        <p className="en-erkannt">Verstanden:
          {erkannt.map((e) => <span key={e}>{e}</span>)}
          {url && <span>Marke {url}</span>}
          {stil && <span>Look «{stil}»</span>}
        </p>
      )}

      <section>
        <h2>1 · Cards <small>{treffer.length ? `${treffer.length} passende Teile aus deinem Katalog` : q && erkannt.length ? 'Kein Teil passt genau – hier ist dein ganzer Katalog' : 'Welche Teile möchtest du zeigen?'}</small></h2>
        {treffer.length > 0 && <div className="en-raster">{treffer.map((c) => <Kachel key={c.id} c={c} />)}</div>}
        {treffer.length > 0 && !alle && weitere.length > 0 && <button type="button" className="en-link" onClick={() => setAlle(true)}>Weitere Teile aus dem Katalog zeigen</button>}
        {alle && (
          <>
            <input className="en-suche" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Katalog durchsuchen: Name, Typ, Material, ml" aria-label="Katalog durchsuchen" />
            <div className="en-raster">{gefiltert.slice(0, 24).map((c) => <Kachel key={c.id} c={c} />)}</div>
            {!gefiltert.length && <p className="en-hilfe">Nichts gefunden.</p>}
          </>
        )}
      </section>

      <section>
        <h2>2 · Look <small>Wie sollen die Cards aussehen? Du kannst das auch später festlegen.</small></h2>
        <div className="en-looks">
          {url && <button type="button" className={`en-look breit${ausMarke ? ' an' : ''}`} aria-pressed={ausMarke} onClick={() => { setAusMarke(!ausMarke); if (!ausMarke) setAusText(false); }}><b>Im Look von {url}</b><span>ulba liest die Website und legt den Markenlook an.</span></button>}
          {stil && <button type="button" className={`en-look breit${ausText ? ' an' : ''}`} aria-pressed={ausText} onClick={() => { setAusText(!ausText); if (!ausText) setAusMarke(false); }}><b>Aus deiner Beschreibung: «{stil}»</b><span>ulba entwirft drei Spielarten, du wählst aus.</span></button>}
          {looks.map((l) => <button key={l.id} type="button" className={`en-look${lookWahl.has(l.id) ? ' an' : ''}`} aria-pressed={lookWahl.has(l.id)} onClick={() => setLookWahl((s) => umschalten(s, l.id))}><i style={{ background: l.hex }} /><b>{l.name}</b></button>)}
        </div>
        {!url && !stil && !looks.length && <p className="en-hilfe">Noch keine gespeicherten Looks. Du legst den ersten gleich im Lookbook an.</p>}
      </section>

      <div className="en-fuss">
        <span>{wahl.size} {wahl.size === 1 ? 'Card' : 'Cards'}{lookWahl.size + Number(ausText) + Number(ausMarke) ? ` · ${lookWahl.size ? `${lookWahl.size} ${lookWahl.size === 1 ? 'Look' : 'Looks'}` : ''}${lookWahl.size && (ausText || ausMarke) ? ' + ' : ''}${ausMarke ? 'Markenlook' : ausText ? 'Look-Entwürfe' : ''}` : ' · Look später'}</span>
        {fehler && <span className="en-fehler" role="alert">Das hat nicht geklappt.</span>}
        <button type="button" className="en-los" disabled={laeuft || wahl.size === 0} onClick={erstellen}>{laeuft ? 'Wird erstellt …' : 'Lookbook erstellen'}</button>
      </div>
    </div>
  );
}
