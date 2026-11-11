'use client';
/* ulba · Vorschlagsseite für die Marke: Looks umschalten, Gefällt mir, Musterliste, Anfrage. */
import { useState, useTransition } from 'react';
import type { Ansicht } from './daten';
import { ereignis, musterAnfragen } from './actions';

const knopf = (aktiv: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '0 16px', minHeight: 44, borderRadius: 999, cursor: 'pointer',
  color: '#1A1A1A', background: aktiv ? '#F3F2EE' : '#FFFFFF', border: aktiv ? '1.5px solid #1A1A1A' : '1px solid #DAD7D0' });

export function VorschlagAnsicht({ token, a }: { token: string; a: Ansicht }) {
  const [look, setLook] = useState(a.looks[0]?.id ?? '');
  const [gefaellt, setGefaellt] = useState<Record<string, boolean>>({});
  const [liste, setListe] = useState<Record<string, boolean>>({});
  const [gesendet, setGesendet] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<'zu' | 'offen' | 'fertig'>('zu');
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, start] = useTransition();
  const aktLook = a.looks.find((l) => l.id === look);
  const gewaehlt = Object.keys(liste).filter((k) => liste[k] && !gesendet[k]);

  function senden(f: FormData) {
    setFehler(null);
    start(async () => {
      const r = await musterAnfragen(token, gewaehlt, look || null, String(f.get('email') ?? ''), String(f.get('nachricht') ?? ''));
      if (!r.ok) { setFehler(r.fehler ?? 'Fehler'); return; }
      setGesendet((g) => ({ ...g, ...Object.fromEntries(gewaehlt.map((k) => [k, true])) }));
      setListe({}); setForm('fertig');
    });
  }

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: '#FFFFFF', color: '#1A1A1A' }}>
      <header style={{ borderBottom: '1px solid #E7E5E0' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 9, background: '#23324A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{a.lieferant.charAt(0)}</div>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{a.lieferant}</span>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 24px 120px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {a.nachricht && (
          <div style={{ padding: 18, borderRadius: 16, background: '#F7F6F3', maxWidth: 720 }}>
            <span style={{ fontSize: 13, color: '#4A4A4A' }}><b style={{ color: '#1A1A1A' }}>{a.lieferant}</b> schreibt:</span>
            <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.55, whiteSpace: 'pre-line' }}>{a.nachricht}</p>
          </div>
        )}
        <div>
          <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.15, fontWeight: 700, letterSpacing: '-.02em' }}>{a.marke ? `Ideen für ${a.marke}` : a.titel}</h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: '#4A4A4A' }}>{a.teile.length} Teile · {a.looks.length} Look{a.looks.length === 1 ? '' : 's'} · alle Teile sind bei {a.lieferant} lieferbar</p>
        </div>

        {a.looks.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Welcher Look passt zu Ihnen?</h2>
            <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {a.looks.map((l) => (
                <button key={l.id} role="tab" aria-selected={l.id === look} style={knopf(l.id === look)}
                  onClick={() => { setLook(l.id); ereignis(token, 'richtung_gewaehlt', l.id); }}>{l.name}</button>
              ))}
            </div>
            {aktLook?.beschreibung && <p style={{ margin: 0, fontSize: 13, color: '#4A4A4A' }}>{aktLook.beschreibung}</p>}
          </div>
        )}

        <section aria-label="Teile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {a.teile.map((t) => {
            const bild = t.renders[look];
            const auf = !!liste[t.teilId], weg = !!gesendet[t.teilId], mag = !!gefaellt[t.teilId];
            return (
              <article key={t.posId} style={{ border: auf ? '1.5px solid #1A1A1A' : '1px solid #E7E5E0', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', aspectRatio: '1 / 1', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {bild ? <img src={bild} alt={`${t.name} im Look ${aktLook?.name ?? ''}`} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#FFFFFF' }} /> : <span style={{ fontSize: 13, color: '#6B6B6B' }}>Bild folgt</span>}
                  <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, color: '#4A4A4A', background: '#FFFFFF', padding: '4px 8px', borderRadius: 999 }}>KI-Visualisierung</span>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{t.name}</h3>
                  <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '8px 14px', fontSize: 13 }}>
                    {t.material && <div><dt style={{ color: '#4A4A4A' }}>Material</dt><dd style={{ margin: '2px 0 0' }}>{t.material}</dd></div>}
                    {t.volumen && <div><dt style={{ color: '#4A4A4A' }}>Volumen</dt><dd style={{ margin: '2px 0 0' }}>{t.volumen} ml</dd></div>}
                    {t.mindestmenge && <div><dt style={{ color: '#4A4A4A' }}>Ab Menge</dt><dd style={{ margin: '2px 0 0' }}>{t.mindestmenge.toLocaleString('de-CH')} Stk.</dd></div>}
                    {t.deko && <div style={{ gridColumn: 'span 2' }}><dt style={{ color: '#4A4A4A' }}>Möglich</dt><dd style={{ margin: '2px 0 0' }}>{t.deko}</dd></div>}
                  </dl>
                  <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                    <button aria-pressed={mag} onClick={() => { setGefaellt((g) => ({ ...g, [t.teilId]: !mag })); if (!mag) ereignis(token, 'gefaellt', t.teilId); }}
                      style={{ minHeight: 44, padding: '0 14px', borderRadius: 10, fontSize: 14, cursor: 'pointer', background: mag ? '#F3F2EE' : '#FFFFFF', border: mag ? '1px solid #1A1A1A' : '1px solid #DAD7D0', color: '#1A1A1A' }}>
                      {mag ? '♥' : '♡'} Gefällt mir
                    </button>
                    {weg ? (
                      <span style={{ flex: 1, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: '#EEF5EE', color: '#24492A', fontSize: 14, fontWeight: 500 }}>✓ Angefragt</span>
                    ) : (
                      <button aria-pressed={auf} onClick={() => setListe((l) => ({ ...l, [t.teilId]: !auf }))}
                        style={{ flex: 1, minHeight: 44, borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', ...(auf ? { background: '#FFFFFF', color: '#1A1A1A', border: '1.5px solid #1A1A1A' } : { background: '#1A1A1A', color: '#FFFFFF', border: 0 }) }}>
                        {auf ? 'Auf der Musterliste' : 'Muster anfragen'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <p style={{ fontSize: 12, lineHeight: 1.5, color: '#4A4A4A', maxWidth: 620 }}>
          Datenschutz: {a.lieferant} sieht, wann Sie diesen Vorschlag öffnen, welchen Look Sie wählen und was Sie anfragen. Keine Werbe-Tracker.
          Bilder sind KI-Visualisierungen echter Teile, kein finales Design. · <span>made with ulba</span>
        </p>
      </main>

      {gewaehlt.length > 0 && form === 'zu' && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, borderTop: '1px solid #E7E5E0', background: 'rgba(255,255,255,.97)' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', padding: '14px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, flex: 1 }}><b>{gewaehlt.length} Muster</b> auf Ihrer Liste</span>
            <button onClick={() => setForm('offen')} style={{ minHeight: 46, padding: '0 22px', borderRadius: 10, border: 0, background: '#1A1A1A', color: '#FFFFFF', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Kostenlose Muster anfragen</button>
          </div>
        </div>
      )}

      {form !== 'zu' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,26,.35)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '12vh 16px 16px', overflowY: 'auto' }}>
          <div role="dialog" aria-modal="true" aria-labelledby="anfrage-titel" style={{ width: 460, maxWidth: '100%', background: '#FFFFFF', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {form === 'offen' ? (
              <form action={senden} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h2 id="anfrage-titel" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Muster anfragen</h2>
                <p style={{ margin: 0, fontSize: 14, color: '#4A4A4A' }}>{a.teile.filter((t) => gewaehlt.includes(t.teilId)).map((t) => t.name).join(', ')}{aktLook ? ` im Look «${aktLook.name}»` : ''}</p>
                <label htmlFor="m-mail" style={{ fontSize: 13, fontWeight: 500 }}>Ihre E-Mail</label>
                <input id="m-mail" name="email" type="email" autoComplete="email" required style={{ minHeight: 46, padding: '0 12px', fontSize: 15, border: '1px solid #DAD7D0', borderRadius: 10, marginTop: -6 }} />
                <label htmlFor="m-text" style={{ fontSize: 13, fontWeight: 500 }}>Nachricht <span style={{ fontWeight: 400, color: '#4A4A4A' }}>(optional)</span></label>
                <textarea id="m-text" name="nachricht" rows={2} placeholder="z. B. geplante Menge, Termin" style={{ padding: 12, fontSize: 15, border: '1px solid #DAD7D0', borderRadius: 10, marginTop: -6, fontFamily: 'inherit' }} />
                {fehler && <p role="alert" style={{ margin: 0, fontSize: 14, color: '#A3261B' }}>{fehler}</p>}
                <button type="submit" disabled={laeuft} style={{ minHeight: 46, borderRadius: 10, border: 0, background: '#1A1A1A', color: '#FFFFFF', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{laeuft ? 'Wird gesendet …' : 'Anfrage senden'}</button>
                <button type="button" onClick={() => setForm('zu')} style={{ minHeight: 40, border: 0, background: 'none', textDecoration: 'underline', fontSize: 14, cursor: 'pointer', color: '#1A1A1A' }}>Abbrechen</button>
              </form>
            ) : (
              <>
                <h2 id="anfrage-titel" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Anfrage ist bei {a.lieferant}</h2>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#4A4A4A' }}>{a.lieferant} meldet sich per E-Mail bei Ihnen.</p>
                <button onClick={() => setForm('zu')} style={{ minHeight: 46, borderRadius: 10, border: 0, background: '#1A1A1A', color: '#FFFFFF', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Fertig</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
