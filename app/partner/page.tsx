/* ulba · /partner — Einstieg ins Lieferanten-Portal (v81).
   Drei Zustände: nicht angemeldet → Landing mit Nutzen + Anmelden;
   angemeldet ohne Profil → Firma übernehmen/anlegen;
   angemeldet mit Profil → Übersicht (Zahlen, Status, nächste Schritte). */
import { ladeKontext, CLERK_AKTIV } from './_kontext';
import { lieferantenZurAuswahl, anfragenVonLieferant } from '@/lib/partner';
import { Uebernehmen } from './uebernehmen';
import { Karte } from './_ui';

export default async function PartnerStart() {
  const k = await ladeKontext();

  if (!CLERK_AKTIV) {
    return <Karte titel="Das Portal wird gerade eingerichtet"><p className="pa-text">Schau in Kürze wieder vorbei.</p></Karte>;
  }

  if (!k.userId) {
    return (
      <div className="pa-landing">
        <p className="pa-kicker">Für Hersteller von Beauty-Packaging</p>
        <h1 className="pa-h1">Dein Katalog, dort wo Marken suchen.</h1>
        <p className="pa-lead">ulba zeigt deine Packmittel genau den Marken, die gerade danach suchen — mit Design-Render auf deinem Teil und direkter Musteranfrage. Übernimm dein Profil, halte es aktuell und beantworte Anfragen an einem Ort.</p>
        <div className="pa-cta">
          <a className="pa-btn" href="/partner/anmelden">Profil übernehmen</a>
          <a className="pa-btn zweit" href="/partner/anmelden">Anmelden</a>
        </div>
        <div className="pa-nutzen">
          <div><b>Kostenlos gelistet</b><span>Marken finden deine Teile über Merkmale, nicht über Werbung. Ranking ist immer neutral.</span></div>
          <div><b>Musteranfragen direkt</b><span>Jede Anfrage kommt mit Wunsch-Render, Verschluss und Kontakt — bereit zum Beantworten.</span></div>
          <div><b>Profil in deiner Hand</b><span>Beschreibung, Standort, Mindestmenge, Lieferzeit, Logo — du pflegst, was Marken sehen.</span></div>
        </div>
      </div>
    );
  }

  if (!k.lieferant) {
    const auswahl = await lieferantenZurAuswahl().catch(() => []);
    return (
      <div className="pa-eng">
        <h1 className="pa-h1 klein">Welche Firma bist du?</h1>
        <p className="pa-lead">Wähle dein Unternehmen aus der Liste oder lege es neu an. Passt die Domain deiner E-Mail <b>{k.email || ''}</b> zur Website der Firma, ist das Profil sofort bestätigt — sonst prüfen wir es kurz von Hand.</p>
        <Uebernehmen auswahl={auswahl} />
      </div>
    );
  }

  const l = k.lieferant;
  const anfragen = await anfragenVonLieferant(l).catch(() => []);
  const neu = anfragen.filter((a) => a.status === 'Neu').length;
  return (
    <div>
      <h1 className="pa-h1 klein">Hallo {l.name}</h1>
      {!l.freigegeben && (
        <div className="pa-hinweis">
          <b>Wir prüfen deine Übernahme.</b> Deine E-Mail-Domain passt nicht zur hinterlegten Website — wir melden uns in der Regel innerhalb eines Werktags. Teile und Anfragen siehst du schon jetzt; das Profil kannst du nach der Bestätigung bearbeiten.
        </div>
      )}
      <div className="pa-kacheln">
        <a href="/partner/teile" className="pa-kachel"><span>Teile auf ulba</span><b>{l.systemIds.length}</b></a>
        <a href="/partner/anfragen" className="pa-kachel"><span>Musteranfragen</span><b>{anfragen.length}</b>{neu > 0 && <em>{neu} neu</em>}</a>
        <a href="/partner/profil" className="pa-kachel"><span>Profil</span><b>{[l.beschreibung, l.standort, l.logoUrl, l.moq, l.lieferzeit].filter(Boolean).length}/5</b><em>Felder gefüllt</em></a>
      </div>
      <Karte titel="Nächste Schritte">
        <ul className="pa-liste">
          {!l.beschreibung && <li><a href="/partner/profil">Beschreibung ergänzen</a> — zwei bis vier Sätze, die Marken auf deinem Profil lesen.</li>}
          {!l.logoUrl && <li><a href="/partner/profil">Logo hinterlegen</a> — als Link zu einer PNG- oder SVG-Datei.</li>}
          {neu > 0 && <li><a href="/partner/anfragen">{neu} neue {neu === 1 ? 'Musteranfrage' : 'Musteranfragen'} beantworten</a>.</li>}
          <li><a href="/partner/katalog">Katalog einreichen</a> — wir übernehmen fehlende Teile für dich.</li>
          <li><a href={`/lieferant/${slug(l.name)}`} target="_blank" rel="noopener">Dein öffentliches Profil ansehen ↗</a></li>
        </ul>
      </Karte>
    </div>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
