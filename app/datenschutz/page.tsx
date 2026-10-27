/* ulba · /datenschutz — Datenschutzerklärung nach DSGVO, berücksichtigt das
   Schweizer DSG für Nutzerinnen und Nutzer aus der Schweiz. Dienste-Liste = tatsächlich
   eingebundene Anbieter (Stand Code v85). */
import type { Metadata } from 'next';
import { RechtSeite, Adresse, STAND } from '../../lib/rechtlich';

export const metadata: Metadata = { title: 'Datenschutz — ulba.ai' };

export default function Datenschutz() {
  return (
    <RechtSeite titel="Datenschutzerklärung">
      <p className="recht-stand">Stand: {STAND}</p>

      <h2>1. Verantwortlich</h2>
      <Adresse />
      <p>
        Diese Erklärung richtet sich nach der Datenschutz-Grundverordnung der EU (DSGVO). Für Nutzerinnen und Nutzer
        aus der Schweiz gilt zusätzlich das Schweizer Datenschutzgesetz (DSG).
      </p>

      <h2>2. Welche Daten wir bearbeiten</h2>
      <ul>
        <li><strong>Konto:</strong> E-Mail-Adresse, optional Name und Profilbild (bei Anmeldung über Google), Zeitpunkt der Registrierung und Anmeldung.</li>
        <li><strong>Nutzung:</strong> deine Suchanfragen, hochgeladene Referenzbilder, Favoriten, Projekte, Linien und erstellte Renders.</li>
        <li><strong>Musteranfragen:</strong> die Angaben, die du im Formular machst (z.&nbsp;B. Name, Firma, E-Mail, gewünschte Teile und Mengen).</li>
        <li><strong>Technisch:</strong> IP-Adresse, Browser, Zeitpunkt des Zugriffs (Server-Logs unseres Hosters).</li>
      </ul>

      <h2>3. Wofür</h2>
      <ul>
        <li>Bereitstellung der Suche, der Design-Renders und deines Kontos</li>
        <li>Weiterleitung von Musteranfragen an den betreffenden Lieferanten</li>
        <li>Begrenzung kostenloser Kontingente und Schutz vor Missbrauch</li>
        <li>Fehleranalyse und Verbesserung des Angebots</li>
      </ul>
      <p>
        Rechtsgrundlagen sind die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO), bei Musteranfragen
        deine Einwilligung (lit. a) und für Sicherheit und Missbrauchsschutz unser berechtigtes Interesse (lit. f). Wir verkaufen keine Daten und nutzen sie nicht für Werbung.
      </p>

      <h2>4. Dienstleister</h2>
      <p>Wir setzen folgende Auftragsbearbeiter ein. Einige sitzen in den USA:</p>
      <ul>
        <li><strong>Vercel Inc.</strong> (USA): Hosting der Website und Server-Funktionen</li>
        <li><strong>Clerk Inc.</strong> (USA): Anmeldung und Kontoverwaltung</li>
        <li><strong>Google LLC</strong> (USA): Anmeldung mit Google (nur wenn du sie wählst), Schriftarten (Google Fonts)</li>
        <li><strong>Airtable Inc.</strong> (USA): Produktkatalog, Musteranfragen und gespeicherte Renders</li>
        <li><strong>Anthropic PBC</strong> (USA): KI-Auswertung von Suchanfragen und Referenzbildern</li>
        <li><strong>fal.ai / Features &amp; Labels Inc.</strong> (USA): Erzeugung der Design-Renders</li>
      </ul>
      <p>
        Die Übermittlung in die USA erfolgt auf Grundlage des EU-U.S. bzw. Swiss-U.S. Data Privacy Framework, soweit
        der Anbieter zertifiziert ist, sonst auf Grundlage von Standardvertragsklauseln.
      </p>

      <h2>5. Cookies und lokaler Speicher</h2>
      <p>
        Wir verwenden nur technisch notwendige Cookies (§ 25 Abs. 2 TDDDG): das Sitzungs-Cookie von Clerk für die Anmeldung und ein Cookie
        zur Zählung kostenloser Suchen und Renders. Im lokalen Speicher deines Browsers merken wir uns dieselbe
        Zählung sowie Favoriten und Projekte, solange du nicht angemeldet bist. Tracking- oder Werbe-Cookies setzen
        wir nicht ein.
      </p>

      <h2>6. Aufbewahrung</h2>
      <p>
        Kontodaten speichern wir, solange dein Konto besteht. Nach einer Löschung entfernen wir sie innert 30 Tagen,
        sofern keine gesetzliche Aufbewahrungspflicht besteht. Server-Logs werden vom Hoster nach kurzer Zeit gelöscht.
      </p>

      <h2>7. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Bearbeitung, Datenübertragbarkeit
        und Widerspruch sowie das Recht, eine Einwilligung jederzeit zu widerrufen. Schreib uns dazu an die oben
        genannte E-Mail-Adresse. Du kannst dich ausserdem bei einer Datenschutz-Aufsichtsbehörde beschweren, in der
        Schweiz beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB).
      </p>

      <h2>8. Änderungen</h2>
      <p>Wir passen diese Erklärung an, wenn sich unser Angebot ändert. Es gilt die jeweils hier veröffentlichte Fassung.</p>
    </RechtSeite>
  );
}
