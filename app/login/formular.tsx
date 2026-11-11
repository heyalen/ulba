'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { linkSenden, type LoginStatus } from './actions';

function Senden() {
  const { pending } = useFormStatus();
  return <button className="st-btn st-btn--voll" type="submit" disabled={pending}>{pending ? 'Wird gesendet …' : 'Anmelde-Link senden'}</button>;
}

export function LoginFormular({ fehlerAusLink }: { fehlerAusLink: boolean }) {
  const [status, aktion] = useFormState<LoginStatus, FormData>(linkSenden, { ok: false });

  if (status.ok) {
    return (
      <div className="st-karte" role="status">
        <h1>Schau in dein Postfach</h1>
        <p className="st-sub">Wir haben einen Anmelde-Link an <b>{status.email}</b> geschickt. Er gilt eine Stunde.</p>
        <p className="st-hilfe">Nichts angekommen? Spam-Ordner prüfen oder die Seite neu laden und nochmals senden.</p>
      </div>
    );
  }

  return (
    <form className="st-karte" action={aktion} noValidate>
      <h1>Bei ulba anmelden</h1>
      <p className="st-sub">Ohne Passwort: Wir schicken dir einen Link per E-Mail. Neu hier? Damit legst du auch dein Konto an.</p>
      {fehlerAusLink && <p className="st-fehler" role="alert">Der Link war abgelaufen oder schon benutzt. Bitte neu anfordern.</p>}
      {status.fehler && <p className="st-fehler" role="alert">{status.fehler}</p>}
      <div className="st-feld">
        <label htmlFor="email">Geschäftliche E-Mail</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="name@firma.com" />
      </div>
      <Senden />
    </form>
  );
}
