'use client';
/* ulba · Absender-Profil: Foto wird im Browser auf 400 px verkleinert. */
import { useState, useTransition } from 'react';
import { absenderSpeichern } from './actions';

async function verkleinern(datei: File): Promise<Blob> {
  const bild = await createImageBitmap(datei);
  const g = Math.min(1, 400 / Math.max(bild.width, bild.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bild.width * g); c.height = Math.round(bild.height * g);
  c.getContext('2d')!.drawImage(bild, 0, 0, c.width, c.height);
  return new Promise((ok, nein) => c.toBlob((b) => (b ? ok(b) : nein(new Error('Bild'))), 'image/jpeg', 0.86));
}

export function AbsenderForm({ p }: { p: { anzeigename: string | null; titel: string | null; telefon: string | null; foto: string | null } }) {
  const [vorschau, setVorschau] = useState(p.foto);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [laeuft, start] = useTransition();
  return (
    <form className="st-box" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} action={(f) => start(async () => {
      if (blob) f.set('foto', blob, 'foto.jpg'); else f.delete('foto');
      const r = await absenderSpeichern(f);
      setMeldung(r.ok ? 'Gespeichert.' : r.fehler ?? 'Fehler');
    })}>
      <div><b>Dein Absender-Profil</b><p className="st-hilfe" style={{ margin: '4px 0 0' }}>So erscheinst du oben auf jedem Link, den du teilst.</p></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {vorschau ? <img src={vorschau} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} /> : <span style={{ width: 64, height: 64, borderRadius: '50%', background: '#F3F2EE' }} />}
        <label className="st-btn st-btn--hell" style={{ cursor: 'pointer' }}>Foto wählen
          <input type="file" name="foto" accept="image/jpeg,image/png,image/webp" hidden onChange={async (e) => {
            const d = e.target.files?.[0]; if (!d) return;
            const b = await verkleinern(d); setBlob(b); setVorschau(URL.createObjectURL(b));
          }} />
        </label>
      </div>
      <div className="st-feld"><label htmlFor="a-name">Name</label><input id="a-name" name="anzeigename" defaultValue={p.anzeigename ?? ''} maxLength={80} /></div>
      <div className="st-feld"><label htmlFor="a-titel">Funktion</label><input id="a-titel" name="titel" defaultValue={p.titel ?? ''} maxLength={80} placeholder="z. B. Key Account Beauty" /></div>
      <div className="st-feld"><label htmlFor="a-tel">Telefon</label><input id="a-tel" name="telefon" type="tel" defaultValue={p.telefon ?? ''} maxLength={40} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="submit" className="st-btn" disabled={laeuft}>{laeuft ? 'Speichert …' : 'Speichern'}</button>
        {meldung && <span className="st-hilfe" role="status">{meldung}</span>}
      </div>
    </form>
  );
}
