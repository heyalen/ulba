/* ulba · /impressum — Anbieterkennzeichnung (Art. 3 Abs. 1 lit. s UWG). */
import type { Metadata } from 'next';
import { RechtSeite, Adresse } from '../../lib/rechtlich';

export const metadata: Metadata = { title: 'Impressum — ulba.ai' };

export default function Impressum() {
  return (
    <RechtSeite titel="Impressum">
      <h2>Anbieter</h2>
      <Adresse />

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
