/* ulba · /impressum — Anbieterkennzeichnung (§ 5 DDG, § 18 MStV). */
import type { Metadata } from 'next';
import { RechtSeite, Adresse, ANBIETER } from '../../lib/rechtlich';

export const metadata: Metadata = { title: 'Impressum — ulba.ai' };

export default function Impressum() {
  return (
    <RechtSeite titel="Impressum">
      <h2>Angaben gemäss § 5 DDG</h2>
      <Adresse />

      <h2>Umsatzsteuer</h2>
      <p>Umsatzsteuer-Identifikationsnummer: {ANBIETER.ustId}</p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>{ANBIETER.name}, Anschrift wie oben</p>

      <h2>Streitschlichtung</h2>
      <p>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Die Inhalte dieser Website werden mit grösster Sorgfalt erstellt. Für Richtigkeit, Vollständigkeit und
        Aktualität übernehmen wir keine Gewähr. Produktdaten, Preise und Mindestmengen stammen von den jeweiligen
        Lieferanten und können sich jederzeit ändern. Massgeblich ist das Angebot des Lieferanten.
      </p>
      <p>
        KI-generierte Design-Renders sind Inspiration und keine verbindliche Produktdarstellung. Marken und
        Produktnamen gehören ihren jeweiligen Inhabern.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Für Inhalte externer Websites, auf die wir verlinken, sind ausschliesslich deren Betreiber verantwortlich.
      </p>
    </RechtSeite>
  );
}
