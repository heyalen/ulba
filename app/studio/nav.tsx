'use client';
/* ulba · Seitenleiste (v5, Stil Luma/erstes ulba): schwebende Karte, Firma oben, Suche,
   Bereiche mit Icons, Vorschläge mit «…»-Menü (Umbenennen, Löschen), Konto unten.
   Eigene Klassen (sb-), unabhängig von den alten .st-nav-Regeln. Mobil: Schublade. */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ProjektKurz } from '../../lib/projekt';
import { NeuKnopf } from './neu-knopf';
import { vorschlagLoeschen, vorschlagUmbenennen } from './projekte/actions';

const I = {
  plus: 'M12 5v14M5 12h14',
  suche: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  raster: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  richtung: 'M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.6 0-1.3-1-1.6-1-2.9 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3ZM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
  anfragen: 'M4 6h16v12H4zM4 7l8 6 8-6',
  datenbank: 'M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3ZM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  einst: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  mehr: 'M5 12h.01M12 12h.01M19 12h.01',
  menue: 'M4 7h16M4 12h16M4 17h16',
  zu: 'M6 6l12 12M18 6 6 18',
};
const Ic = ({ d }: { d: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;

const BEREICHE = [
  { href: '/studio', text: 'Alle Vorschläge', d: I.raster, genau: true },
  { href: '/studio/richtungen', text: 'Richtungen', d: I.richtung },
  { href: '/studio/anfragen', text: 'Anfragen', d: I.anfragen },
  { href: '/studio/datenbank', text: 'Katalog', d: I.datenbank },
  { href: '/studio/einstellungen', text: 'Einstellungen', d: I.einst },
];

function Eintrag({ p, an, onNav, onWeg }: { p: ProjektKurz; an: boolean; onNav: () => void; onWeg: (id: string) => void }) {
  const [menue, setMenue] = useState(false);
  const [frage, setFrage] = useState(false);
  const [edit, setEdit] = useState(false);
  const [titel, setTitel] = useState(p.titel);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setTitel(p.titel), [p.titel]);
  useEffect(() => {
    if (!menue) return;
    const zu = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) { setMenue(false); setFrage(false); } };
    document.addEventListener('mousedown', zu); document.addEventListener('keydown', zu);
    return () => { document.removeEventListener('mousedown', zu); document.removeEventListener('keydown', zu); };
  }, [menue]);
  const speichern = () => { setEdit(false); const t = titel.trim(); if (t && t !== p.titel) vorschlagUmbenennen(p.id, t); else setTitel(p.titel); };

  return (
    <div ref={ref} className={`sb-proj${an ? ' an' : ''}${menue ? ' offen' : ''}`}>
      {edit ? (
        <input className="sb-proj-edit" value={titel} autoFocus maxLength={120} aria-label="Neuer Name"
          onChange={(e) => setTitel(e.target.value)} onBlur={speichern}
          onKeyDown={(e) => { if (e.key === 'Enter') speichern(); if (e.key === 'Escape') { setTitel(p.titel); setEdit(false); } }} />
      ) : (
        <Link href={`/studio/p/${p.id}`} onClick={onNav} className="sb-proj-link" title={titel}>
          <span className="sb-proj-t">{titel}</span>
          <span className="sb-proj-s">{p.teile} {p.teile === 1 ? 'Teil' : 'Teile'}{p.marke ? ` · ${p.marke}` : ''}</span>
        </Link>
      )}
      {!edit && <button type="button" className="sb-mehr" aria-label={`Optionen für ${titel}`} aria-expanded={menue} onClick={() => { setMenue((m) => !m); setFrage(false); }}><Ic d={I.mehr} /></button>}
      {menue && (
        <div className="sb-pop" role="menu">
          {!frage ? (
            <>
              <button role="menuitem" onClick={() => { setMenue(false); setEdit(true); }}>Umbenennen</button>
              <button role="menuitem" className="rot" onClick={() => setFrage(true)}>Löschen</button>
            </>
          ) : (
            <div className="sb-frage">
              <b>«{titel}» löschen?</b>
              <span>Geteilte Links funktionieren danach nicht mehr.</span>
              <div>
                <button className="sb-ja" onClick={() => { setMenue(false); onWeg(p.id); }}>Löschen</button>
                <button onClick={() => setFrage(false)}>Abbrechen</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StudioNav({ projekte, firma }: { projekte: ProjektKurz[]; firma: string }) {
  const pfad = usePathname() ?? '';
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [q, setQ] = useState('');
  const [weg, setWeg] = useState<Set<string>>(new Set());
  const zu = () => setOffen(false);
  useEffect(() => { setOffen(false); }, [pfad]);
  useEffect(() => { document.body.style.overflow = offen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [offen]);

  const liste = useMemo(() => {
    const w = q.trim().toLowerCase();
    return projekte.filter((p) => !weg.has(p.id) && (!w || `${p.titel} ${p.marke ?? ''}`.toLowerCase().includes(w)));
  }, [projekte, q, weg]);
  const hier = pfad === '/studio' ? 'Alle Vorschläge' : projekte.find((p) => pfad.startsWith(`/studio/p/${p.id}`))?.titel ?? BEREICHE.find((b) => !b.genau && pfad.startsWith(b.href))?.text ?? 'Studio';

  const loeschen = async (id: string) => {
    setWeg((s) => new Set(s).add(id));
    if (pfad.startsWith(`/studio/p/${id}`)) router.push('/studio');
    const ok = await vorschlagLoeschen(id);
    if (!ok) setWeg((s) => { const n = new Set(s); n.delete(id); return n; });
  };

  return (
    <aside className={`sb${offen ? ' offen' : ''}`} aria-label="Navigation">
      <div className="sb-mobil">
        <button type="button" onClick={() => setOffen(true)} aria-expanded={offen} aria-label="Menü öffnen"><Ic d={I.menue} /></button>
        <span>{hier}</span>
        <NeuKnopf className="sb-mobil-neu"><Ic d={I.plus} /></NeuKnopf>
      </div>
      <div className="sb-schleier" onClick={zu} />
      <div className="sb-karte">
        <div className="sb-kopf">
          <Link href="/studio" onClick={zu} className="sb-logo" aria-label="ulba – alle Vorschläge">ulba</Link>
          <button type="button" className="sb-zu" onClick={zu} aria-label="Menü schliessen"><Ic d={I.zu} /></button>
        </div>
        <NeuKnopf className="sb-neu" onNav={zu}><Ic d={I.plus} /><span>Neuer Vorschlag</span></NeuKnopf>

        <nav className="sb-bereiche">
          {BEREICHE.map((b) => {
            const an = b.genau ? pfad === b.href : pfad.startsWith(b.href);
            return <Link key={b.href} href={b.href} onClick={zu} className={`sb-item${an ? ' an' : ''}`} aria-current={an ? 'page' : undefined}><Ic d={b.d} />{b.text}</Link>;
          })}
        </nav>

        <div className="sb-trenner" />
        <div className="sb-lbl">Vorschläge</div>
        {projekte.length > 6 && (
          <label className="sb-suche"><Ic d={I.suche} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen" aria-label="Vorschläge suchen" /></label>
        )}
        <div className="sb-liste">
          {liste.map((p) => <Eintrag key={p.id} p={p} an={pfad.startsWith(`/studio/p/${p.id}`)} onNav={zu} onWeg={loeschen} />)}
          {!liste.length && <div className="sb-leer">{q ? 'Nichts gefunden' : 'Noch kein Vorschlag'}</div>}
        </div>

        <div className="sb-fuss">
          <div className="sb-konto">
            <span className="sb-avatar" aria-hidden>{firma.charAt(0).toUpperCase()}</span>
            <span className="sb-firma" title={firma}>{firma}</span>
            <form action="/auth/abmelden" method="post"><button type="submit">Abmelden</button></form>
          </div>
          <div className="sb-recht"><a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a> · <a href="/agb">AGB</a></div>
        </div>
      </div>
    </aside>
  );
}
