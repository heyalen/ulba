import { notFound } from 'next/navigation';
import { bildLinks, supabaseServer } from '../../../../lib/supabase/server';
import { statusSetzen, teilSpeichern } from '../teile-aktionen';
import { DEKO_OPTIONEN } from '../deko';

type Teil = {
  id: string; name: string; artikelnummer: string | null; kollektion: string | null; rolle: string; typ: string | null;
  material: string | null; volumen_ml: number | null; hals: string | null; mindestmenge: number | null; kurzbeschreibung: string | null;
  deko_faehigkeiten: string[] | null; einfaerbbar: boolean | null; verschluss_art: string | null; sichtbarkeit: string; status: string;
  bild_pfad: string | null; bild_roh_pfad: string | null; quelle_url: string | null; pipeline: string; pipeline_log: string | null;
};

const DEKO_TEXT: Record<string, string> = {
  einfaerbung_masse: 'In Masse einfärbbar',
  direktdruck: 'Direktdruck (z. B. Siebdruck)',
  etikett: 'Etikett',
  sleeve: 'Sleeve',
  spruehlackierung: 'Sprühlackierung',
  farbe_fix: 'Materialfarbe ist fest (z. B. Braunglas)',
};
const STATUS: Record<string, string> = { in_pruefung: 'In Prüfung', aktiv: 'Aktiv', verworfen: 'Verworfen', nicht_mehr_im_katalog: 'Nicht mehr im Katalog' };

export default async function TeilDetail({ params, searchParams }: { params: { id: string }; searchParams: { gespeichert?: string } }) {
  const sb = supabaseServer();
  const { data } = await sb.from('teile').select('*').eq('id', params.id).maybeSingle();
  if (!data) notFound();
  const t = data as Teil;
  const { data: v } = await sb.from('teil_verschluesse').select('verschluss_id, teile:verschluss_id ( id, name )').eq('teil_id', t.id);
  const { data: b } = await sb.from('teil_verschluesse').select('teil_id, teile:teil_id ( id, name )').eq('verschluss_id', t.id);
  const verbunden = [...((v ?? []) as any[]), ...((b ?? []) as any[])].map((x) => x.teile).filter(Boolean) as { id: string; name: string }[];
  const links = await bildLinks([t.bild_pfad ?? t.bild_roh_pfad]);
  const bild = links.get(t.bild_pfad ?? t.bild_roh_pfad ?? '');
  const deko = new Set(t.deko_faehigkeiten ?? []);
  const zurueck = `/studio/datenbank/${t.id}`;

  return (
    <>
      <p style={{ marginBottom: 12 }}><a href="/studio/datenbank" style={{ fontSize: 14 }}>← Datenbank</a></p>
      <div className="st-titelzeile">
        <h1>{t.name}</h1>
        <span className="st-status">{STATUS[t.status] ?? t.status}</span>
      </div>
      {searchParams.gespeichert && <p className="st-hilfe" role="status" style={{ marginBottom: 14 }}>Gespeichert.</p>}

      <div className="st-detail">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="st-foto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {bild ? <img src={bild} alt={t.name} /> : <span>Kein Foto</span>}
          </div>
          {t.pipeline === 'fehler' && <p className="st-warnung">{t.pipeline_log}</p>}
          {t.quelle_url && <a className="st-hilfe" href={t.quelle_url} target="_blank" rel="noopener noreferrer">Original-Seite beim Hersteller ↗</a>}
          {t.status === 'in_pruefung' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <form action={statusSetzen} style={{ flex: 1 }}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="aktiv" /><input type="hidden" name="zurueck" value={zurueck} /><button className="st-btn st-btn--voll" type="submit">Freigeben</button></form>
              <form action={statusSetzen} style={{ flex: 1 }}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value="verworfen" /><input type="hidden" name="zurueck" value="/studio/datenbank" /><button className="st-btn st-btn--hell st-btn--voll" type="submit">Verwerfen</button></form>
            </div>
          )}
          {verbunden.length > 0 && (
            <div className="st-box" style={{ padding: 14 }}>
              <b style={{ fontSize: 14 }}>{t.rolle === 'verschluss' ? 'Passt auf' : 'Passende Verschlüsse'}</b>
              {verbunden.map((x) => <a key={x.id} href={`/studio/datenbank/${x.id}`} style={{ fontSize: 14 }}>{x.name}</a>)}
            </div>
          )}
        </div>

        <form action={teilSpeichern} className="st-box" style={{ maxWidth: 'none' }}>
          <input type="hidden" name="id" value={t.id} />
          <div className="st-feld"><label htmlFor="name">Name</label><input id="name" name="name" defaultValue={t.name} required /></div>
          <div className="st-raster2">
            <div className="st-feld"><label htmlFor="artikelnummer">Artikelnummer</label><input id="artikelnummer" name="artikelnummer" defaultValue={t.artikelnummer ?? ''} /></div>
            <div className="st-feld"><label htmlFor="kollektion">Kollektion</label><input id="kollektion" name="kollektion" defaultValue={t.kollektion ?? ''} /></div>
            <div className="st-feld">
              <label htmlFor="rolle">Art</label>
              <select id="rolle" name="rolle" defaultValue={t.rolle}>
                <option value="behaelter">Behälter (ohne Verschluss)</option>
                <option value="system">System (mit Verschluss)</option>
                <option value="verschluss">Verschluss</option>
              </select>
            </div>
            <div className="st-feld"><label htmlFor="material">Material</label><input id="material" name="material" defaultValue={t.material ?? ''} /></div>
            <div className="st-feld"><label htmlFor="volumen_ml">Volumen (ml)</label><input id="volumen_ml" name="volumen_ml" inputMode="decimal" defaultValue={t.volumen_ml ?? ''} /></div>
            <div className="st-feld"><label htmlFor="hals">Hals / Gewinde</label><input id="hals" name="hals" placeholder="z. B. 20/410" defaultValue={t.hals ?? ''} /></div>
            <div className="st-feld"><label htmlFor="mindestmenge">Mindestmenge (Stück)</label><input id="mindestmenge" name="mindestmenge" inputMode="numeric" defaultValue={t.mindestmenge ?? ''} /></div>
            <div className="st-feld">
              <label htmlFor="sichtbarkeit">Sichtbarkeit</label>
              <select id="sichtbarkeit" name="sichtbarkeit" defaultValue={t.sichtbarkeit}>
                <option value="privat">Nur in meinen Vorschlägen</option>
                <option value="oeffentlich">Auch in der ulba-Suche</option>
              </select>
            </div>
          </div>

          <fieldset style={{ border: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <legend style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Dekoration möglich</legend>
            <span className="st-hilfe" style={{ marginBottom: 6 }}>Bestimmt, welche Looks ulba auf diesem Teil zeigt. Nur Verfahren anhaken, die du wirklich liefern kannst.</span>
            {DEKO_OPTIONEN.map((d) => (
              <label key={d} className="st-check"><input type="checkbox" name={`deko_${d}`} defaultChecked={deko.has(d)} />{DEKO_TEXT[d]}</label>
            ))}
          </fieldset>

          {t.rolle !== 'behaelter' && (
            <div className="st-feld">
              <label htmlFor="einfaerbbar">Verschluss in Kundenfarbe einfärbbar?</label>
              <select id="einfaerbbar" name="einfaerbbar" defaultValue={t.einfaerbbar === true ? 'ja' : t.einfaerbbar === false ? 'nein' : ''}>
                <option value="">Unbekannt</option>
                <option value="ja">Ja (Kunststoff)</option>
                <option value="nein">Nein (Metall, Chrom …)</option>
              </select>
            </div>
          )}

          <div className="st-feld">
            <label htmlFor="kurzbeschreibung">Kurzbeschreibung</label>
            <textarea id="kurzbeschreibung" name="kurzbeschreibung" rows={2} defaultValue={t.kurzbeschreibung ?? ''} style={{ fontSize: 15, padding: 12, border: '1px solid #DAD7D0', borderRadius: 10, fontFamily: 'inherit' }} />
          </div>
          <button className="st-btn" type="submit" style={{ alignSelf: 'flex-start' }}>Speichern</button>
        </form>
      </div>
    </>
  );
}
