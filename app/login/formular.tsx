'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { linkSenden, mitPasswort, type LoginStatus } from './actions';

function Knopf({ text, laeuft }: { text: string; laeuft: string }) {
  const { pending } = useFormStatus();
  return <button className="st-btn st-btn--voll" type="submit" disabled={pending}>{pending ? laeuft : text}</button>;
}

const umschalter: React.CSSProperties = { background: 'none', border: 0, color: '#1A1A1A', textDecoration: 'underline', fontSize: 14, minHeight: 44, cursor: 'pointer', alignSelf: 'center' };

export function LoginFormular({ fehlerAusLink }: { fehlerAusLink: boolean }) {
  const [art, setArt] = useState<'link' | 'passwort'>('link');
  const [linkStatus, linkAktion] = useFormState<LoginStatus, FormData>(linkSenden, { ok: false });
  const [pwStatus, pwAktion] = useFormState<LoginStatus, FormData>(mitPasswort, { ok: false });

  if (art === 'link' && linkStatus.ok) {
    return (
      <div className="st-karte" role="status">
        <h1>Schau in dein Postfach</h1>
        <p className="st-sub">Wir haben einen Anmelde-Link an <b>{linkStatus.email}</b> geschickt. Er gilt eine Stunde.</p>
        <p className="st-hilfe">Nichts angekommen? Spam-Ordner prüfen oder die Seite neu laden und nochmals senden.</p>
      </div>
    );
  }

  if (art === 'passwort') {
    return (
      <form className="st-karte" action={pwAktion}>
        <h1>Mit Passwort anmelden</h1>
        {pwStatus.fehler && <p className="st-fehler" role="alert">{pwStatus.fehler}</p>}
        <div className="st-feld">
          <label htmlFor="email">E-Mail</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="st-feld">
          <label htmlFor="passwort">Passwort</label>
          <input id="passwort" name="passwort" type="password" autoComplete="current-password" required />
        </div>
        <Knopf text="Anmelden" laeuft="Wird angemeldet …" />
        <button type="button" style={umschalter} onClick={() => setArt('link')}>Stattdessen Link per E-Mail</button>
      </form>
    );
  }

  return (
    <form className="st-karte" action={linkAktion} noValidate>
      <h1>Bei ulba anmelden</h1>
      <p className="st-sub">Ohne Passwort: Wir schicken dir einen Link per E-Mail. Neu hier? Damit legst du auch dein Konto an.</p>
      {fehlerAusLink && <p className="st-fehler" role="alert">Der Link war abgelaufen oder schon benutzt. Bitte neu anfordern.</p>}
      {linkStatus.fehler && <p className="st-fehler" role="alert">{linkStatus.fehler}</p>}
      <div className="st-feld">
        <label htmlFor="email">Geschäftliche E-Mail</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="name@firma.com" />
      </div>
      <Knopf text="Anmelde-Link senden" laeuft="Wird gesendet …" />
      <button type="button" style={umschalter} onClick={() => setArt('passwort')}>Mit Passwort anmelden</button>
    </form>
  );
}
