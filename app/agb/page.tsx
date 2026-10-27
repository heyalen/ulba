/* ulba · /agb — Allgemeine Geschäfts- und Nutzungsbedingungen (v85).
   Marken nutzen ulba kostenlos; Lieferanten-Portal in Abschnitt 6. */
import type { Metadata } from 'next';
import { RechtSeite, ANBIETER, STAND } from '../../lib/rechtlich';

export const metadata: Metadata = { title: 'AGB — ulba.ai' };

export default function Agb() {
  return (
    <RechtSeite titel="Allgemeine Geschäftsbedingungen">
      <p className="recht-stand">Stand: {STAND}</p>

      <h2>1. Geltungsbereich</h2>
      <p>
        Diese Bedingungen gelten für die Nutzung von ulba.ai (nachfolgend «ulba»), betrieben von {ANBIETER.name}{' '}
        (siehe <a href="/impressum">Impressum</a>). Mit der Nutzung oder Registrierung akzeptierst du sie.
      </p>

      <h2>2. Was ulba ist</h2>
      <p>
        ulba ist eine Suchmaschine für Beauty-Packaging. Du findest Verpackungsteile realer Lieferanten, kannst sie
        mit KI in einem Design darstellen lassen und Muster beim Lieferanten anfragen. ulba verkauft selbst keine
        Verpackungen und wird nicht Vertragspartei zwischen dir und dem Lieferanten.
      </p>

      <h2>3. Konto und Kontingente</h2>
      <ul>
        <li>Ohne Konto sind eine begrenzte Zahl an Suchen und Renders möglich.</li>
        <li>Mit einem kostenlosen Konto suchst du unbegrenzt und erhältst ein monatliches Render-Kontingent.</li>
        <li>Deine Zugangsdaten hältst du geheim. Pro Person ist ein Konto vorgesehen.</li>
        <li>Wir dürfen Kontingente anpassen und Konten bei Missbrauch sperren.</li>
      </ul>

      <h2>4. Inhalte und Renders</h2>
      <ul>
        <li>Produktdaten, Preise, Mindestmengen und Lieferzeiten stammen von den Lieferanten. Wir prüfen sie sorgfältig, übernehmen aber keine Gewähr.</li>
        <li>Design-Renders sind KI-generierte Inspiration. Sie zeigen nicht verbindlich, wie ein bestelltes Teil aussieht oder ob eine Veredelung produzierbar ist.</li>
        <li>Renders darfst du für eigene Präsentationen und Briefings nutzen. Für Rechte Dritter (z.&nbsp;B. Marken in deiner Eingabe) bist du selbst verantwortlich.</li>
        <li>Hochgeladene Bilder und Eingaben dürfen keine Rechte Dritter verletzen.</li>
      </ul>

      <h2>5. Musteranfragen</h2>
      <p>
        Mit einer Musteranfrage leiten wir deine Angaben an den betreffenden Lieferanten weiter. Ob und zu welchen
        Bedingungen er Muster liefert, entscheidet allein der Lieferant.
      </p>

      <h2>6. Lieferanten</h2>
      <ul>
        <li>Lieferanten können ihr Profil übernehmen und Teile, Kataloge und Anfragen im Partner-Bereich verwalten.</li>
        <li>Sie versichern, berechtigt zu sein, für das Unternehmen zu handeln, und dass ihre Angaben und Bilder korrekt sind und keine Rechte Dritter verletzen.</li>
        <li>Die Reihenfolge der Suchergebnisse ist neutral und kann nicht gekauft werden.</li>
        <li>Für kostenpflichtige Leistungen gelten gesonderte Vereinbarungen.</li>
      </ul>

      <h2>7. Verfügbarkeit</h2>
      <p>
        Wir bemühen uns um einen störungsfreien Betrieb, können aber keine ständige Verfügbarkeit garantieren und
        dürfen Funktionen ändern oder einstellen.
      </p>

      <h2>8. Haftung</h2>
      <p>
        Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder
        Gesundheit. Im Übrigen ist die Haftung für den kostenlosen Dienst ausgeschlossen, soweit gesetzlich zulässig.
      </p>

      <h2>9. Kündigung</h2>
      <p>
        Du kannst dein Konto jederzeit löschen oder die Löschung per E-Mail an {ANBIETER.email} verlangen. Wir können
        die Nutzung mit angemessener Frist beenden, bei Missbrauch auch sofort.
      </p>

      <h2>10. Datenschutz</h2>
      <p>Wie wir mit deinen Daten umgehen, steht in der <a href="/datenschutz">Datenschutzerklärung</a>.</p>

      <h2>11. Schlussbestimmungen</h2>
      <p>
        Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Zwingende Verbraucherschutzvorschriften deines
        Wohnsitzlandes bleiben unberührt. Ist eine Bestimmung unwirksam, bleibt der Rest gültig.
      </p>
    </RechtSeite>
  );
}
