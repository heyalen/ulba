import { redirect } from 'next/navigation';
import { ladeKontext } from '../_kontext';
import { KatalogFormular } from './formular';

export default async function KatalogSeite() {
  const k = await ladeKontext();
  if (!k.userId || !k.lieferant) redirect('/partner');
  return (
    <div className="pa-eng">
      <h1 className="pa-h1 klein">Katalog einreichen</h1>
      <p className="pa-lead">Schick uns den Link zu deinem Online-Katalog oder Datenblatt. Unsere Engine liest die Teile aus, erstellt einheitliche Studiofotos und schaltet sie auf ulba frei — in der Regel innerhalb weniger Tage. Du musst nichts formatieren.</p>
      <KatalogFormular />
      <section className="pa-karte">
        <h2 className="pa-h2">Was wir brauchen</h2>
        <ul className="pa-liste">
          <li>Ein Link pro Produktlinie oder der Link zum Gesamtkatalog (Webseite oder PDF).</li>
          <li>Pro Teil idealerweise: Artikelnummer, Material, Volumen, Halsnorm, Verschluss-Optionen.</li>
          <li>Fotos: wir normalisieren alle Bilder selbst — Katalogfotos genügen.</li>
        </ul>
      </section>
    </div>
  );
}
