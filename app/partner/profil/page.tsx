import { redirect } from 'next/navigation';
import { ladeKontext } from '../_kontext';
import { ProfilFormular } from './formular';

export default async function ProfilSeite() {
  const k = await ladeKontext();
  if (!k.userId || !k.lieferant) redirect('/partner');
  const l = k.lieferant;
  return (
    <div className="pa-eng">
      <h1 className="pa-h1 klein">Firmenprofil</h1>
      <p className="pa-lead">Das sehen Marken auf <a href={`/lieferant/${slug(l.name)}`} target="_blank" rel="noopener">deinem öffentlichen Profil ↗</a>. Änderungen sind innerhalb einer Stunde sichtbar.</p>
      {!l.freigegeben && <div className="pa-hinweis">Dein Profil wird noch geprüft — bis dahin ist das Formular schreibgeschützt.</div>}
      <ProfilFormular l={{
        beschreibung: l.beschreibung, standort: l.standort, land: l.land, website: l.website, email: l.email,
        zertifikat: l.zertifikat, eu: l.eu, moq: l.moq, lieferzeit: l.lieferzeit, logoUrl: l.logoUrl, titelbildUrl: l.titelbildUrl,
        freigegeben: l.freigegeben, id: l.id,
      }} />
    </div>
  );
}
function slug(s: string) {
  return s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
