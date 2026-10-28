'use client';
/* ulba · lib/konto.tsx — die Konto-Schicht (Clerk), v78.
   ──────────────────────────────────────────────────────────────────────
   Sicherheits-Schalter: Ohne NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ist alles
   hier stumm — kein Provider, kein Token, statisches Profil wie bisher.
   So deployt die App auch, bevor die Clerk-Schluessel in Vercel stehen.

   Teile:
   - KontoProvider  — umhuellt die App (app/layout.tsx), deutsche Texte.
   - kontoFetch     — fetch mit Konto-Token + Frei-Cookie; faengt die
                      Anmelde-Aufforderung des Servers (401 login_required)
                      ab und oeffnet die Anmelde-Wand per Event.
   - NavKonto       — Profil-Ecke der Navigation (Anmelden / Nutzermenu).
   - AnmeldeWand    — Overlay, wenn die freien Kontingente aufgebraucht sind. */

import { ClerkProvider, SignUp, UserButton, useAuth, useUser } from '@clerk/nextjs';
import { KontoVideo } from './kontoVideo';
import { RechtLinks } from './rechtlich';
import { deDE } from '@clerk/localizations';
import { useEffect, type ReactNode } from 'react';

export const CLERK_AKTIV = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/* ── Token-Bruecke ───────────────────────────────────────────────────
   Macht Clerks getToken() fuer fetch-Aufrufe ausserhalb der React-Welt
   erreichbar. Wird nur innerhalb des Providers montiert. */
let tokenHolen: (() => Promise<string | null>) | null = null;

export async function holeToken(): Promise<string | null> {
  try { return tokenHolen ? await tokenHolen() : null; } catch { return null; }
}

function TokenBruecke() {
  const { getToken } = useAuth();
  useEffect(() => {
    tokenHolen = () => getToken();
    return () => { tokenHolen = null; };
  }, [getToken]);
  return null;
}

/* ── Konto oeffnen (v82, Claude-Vorbild) ─────────────────────────────
   Kein Modal mehr: Anmelden/Registrieren führt auf die grosse Seite
   (/anmelden, /registrieren) und Clerk springt danach per redirect_url
   genau dorthin zurück, wo man war. */
export function oeffneKonto(ziel: KontoZiel): void {
  const zurueck = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = (ziel === 'anmelden' ? '/anmelden' : '/registrieren') + '?redirect_url=' + zurueck;
}

/* ── kontoFetch ──────────────────────────────────────────────────────
   credentials:'include' traegt das Frei-Cookie des Renderers (anonyme
   Kontingente), der Bearer-Token sagt dem Renderer, wer angemeldet ist. */
export type AnmeldeGrund = { scope: string; text: string };

/* v79.2 — Freie Kontingente LOKAL mitzaehlen (localStorage).
   Warum: Der Server zaehlt anonyme Nutzer per Cookie auf der Renderer-
   Domain — mobile Browser (Safari/iOS, zunehmend auch Chrome) blocken
   solche Drittanbieter-Cookies, das Cookie kommt nie zurueck und die
   Wand erschien auf dem Handy nie. localStorage ist first-party und
   funktioniert ueberall; der Browser zeigt die Wand damit selbst, bevor
   die Anfrage rausgeht. Der Server bleibt zweiter Riegel, wo sein
   Cookie greift. Bewusst unsigniert: eine freundliche Wand, kein Tresor. */
const FREI_SUCHEN = 3;
// ⚠️ TESTPHASE (28.10.2026): 500 — VOR GO-LIVE ZURUECK auf FREI_RENDERS 2 · RENDERS_PRO_MONAT 5
const FREI_RENDERS = 500;
const RENDERS_PRO_MONAT = 500;
const FREI_KEY = 'ulba_frei';

function freiLokal(): { s: number; r: number } {
  try {
    const v = JSON.parse(localStorage.getItem(FREI_KEY) || '{}');
    return { s: Math.max(0, Number(v.s) || 0), r: Math.max(0, Number(v.r) || 0) };
  } catch { return { s: 0, r: 0 }; }
}
function freiLokalSetzen(f: { s: number; r: number }) {
  try { localStorage.setItem(FREI_KEY, JSON.stringify(f)); } catch { /* privater Modus o.ä. */ }
}
function zeigeWand(scope: string, text: string) {
  window.dispatchEvent(new CustomEvent<AnmeldeGrund>('ulba:anmelden', { detail: { scope, text } }));
}

export async function kontoFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await holeToken();
  const headers: Record<string, string> = { ...((init.headers as Record<string, string>) || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Was fuer ein Aufruf ist das? (fuer die lokale Zaehlung — spiegelt die
  // Server-Logik: nur NEUE Suchen zaehlen, Design-Wand und Auffrischen nie.)
  let body: any = null;
  try { body = typeof init.body === 'string' ? JSON.parse(init.body) : null; } catch { body = null; }
  const istNeueSuche = url.includes('/api/search') && !!body
    && !body.ids && !body.active_filters && !body.removed_filters && !body.bildlesart;
  const istRender = url.includes('/api/render') && !url.includes('/api/renders')
    && !!body && body.codes !== true && !body.farbe;

  // Lokale Anmelde-Wand: greift VOR der Anfrage, auch wo das Server-Cookie
  // geblockt wird (Safari/iOS). Angemeldete laufen frei durch.
  if (CLERK_AKTIV && !token) {
    const f = freiLokal();
    if (istNeueSuche && f.s >= FREI_SUCHEN) {
      const text = `Deine ${FREI_SUCHEN} kostenlosen Suchen sind aufgebraucht — mit einem kostenlosen Konto suchst du unbegrenzt.`;
      zeigeWand('suche', text);
      return new Response(JSON.stringify({ error: text, code: 'login_required', scope: 'suche' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    if (istRender && f.r >= FREI_RENDERS) {
      const text = `Deine ${FREI_RENDERS} kostenlosen Renders sind aufgebraucht — mit einem kostenlosen Konto hast du ${RENDERS_PRO_MONAT} Renders pro Monat.`;
      zeigeWand('render', text);
      return new Response(JSON.stringify({ error: text, code: 'login_required', scope: 'render' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const res = await fetch(url, { ...init, headers, credentials: 'include' });

  // Ehrlich mitzaehlen, erst nach Erfolg: Suchen immer, Renders nur wenn
  // wirklich frisch gerendert wurde (Cache-Treffer kosten nichts).
  if (CLERK_AKTIV && !token && res.ok) {
    try {
      if (istNeueSuche) {
        const f = freiLokal();
        freiLokalSetzen({ ...f, s: f.s + 1 });
      } else if (istRender) {
        const d = await res.clone().json();
        if (d && d.cached !== true && d.unveraendert !== true) {
          const f = freiLokal();
          freiLokalSetzen({ ...f, r: f.r + 1 });
        }
      }
    } catch { /* Zaehlen ist Kuer */ }
  }

  if (res.status === 401) {
    try {
      const d = await res.clone().json();
      if (d?.code === 'login_required') {
        // Server-Urteil lokal uebernehmen — die Wand steht dann auch nach Reload.
        const f = freiLokal();
        if (d.scope === 'render') freiLokalSetzen({ ...f, r: Math.max(f.r, FREI_RENDERS) });
        else freiLokalSetzen({ ...f, s: Math.max(f.s, FREI_SUCHEN) });
        zeigeWand(String(d.scope || ''), String(d.error || ''));
      }
    } catch { /* kein JSON — normaler Fehlerpfad */ }
  }
  return res;
}

/* ── Provider ────────────────────────────────────────────────────── */
/* v79.7 — Clerks deutsches Sprachpaket siezt («Haben Sie ein Konto?»);
   die sichtbaren Zeilen stellen wir auf ulbas Du-Form um. */
const deUlba = {
  ...deDE,
  /* v81 — zwei klare Zustände statt doppeltem «Anmelden oder registrieren»
     (Titel und Fusszeile widersprachen sich). */
  signUp: {
    ...(deDE as any).signUp,
    start: {
      ...((deDE as any).signUp?.start || {}),
      title: 'Kostenlos starten',
      subtitle: '',
      actionText: 'Schon ein Konto?', actionLink: 'Anmelden',
    },
  },
  signIn: {
    ...(deDE as any).signIn,
    start: {
      ...((deDE as any).signIn?.start || {}),
      title: 'Willkommen zurück',
      subtitle: '',
      actionText: 'Neu bei ulba?', actionLink: 'Kostenlos registrieren',
    },
  },
  socialButtonsBlockButton: 'Mit {{provider|titleize}} fortfahren',
  dividerText: 'oder',
  formFieldLabel__emailAddress: 'E-Mail',
  formFieldInputPlaceholder__emailAddress: 'Gib deine E-Mail ein',
  formFieldInputPlaceholder__password: 'Mindestens 8 Zeichen',
  formButtonPrimary: 'Fortfahren',
} as typeof deDE;

export function KontoProvider({ children }: { children: ReactNode }) {
  if (!CLERK_AKTIV) return <>{children}</>;
  return (
    <ClerkProvider
      localization={deUlba}
      signInUrl="/anmelden"
      signUpUrl="/registrieren"
      afterSignOutUrl="/"
      appearance={{
        /* v79.5 — einheitlich mit ulbas Flaeche: die Karte sitzt im selben
           Off-White (#FAFAFA) wie die App, weiche Kante statt hartem Weiss
           und Schattenwurf; Eingaben und Social-Buttons weiss mit ulba-Linie.
           v79.8 — Social-Buttons gestapelt in voller Breite («Weiter mit
           Google»), wie im Claude-Vorbild. */
        /* v81 — Stil lebt komplett in app/globals.css (Block «Clerk v81»),
           weil Clerk Rahmen per box-shadow zeichnet und Inline-Overrides
           sie wegputzten (randlose Felder). Hier nur Layout + Tokens. */
        layout: { socialButtonsVariant: 'blockButton', socialButtonsPlacement: 'top', shimmer: false },
        variables: {
          colorPrimary: '#1C1C1A',
          colorText: '#1C1C1A',
          colorTextSecondary: '#6B6B66',
          colorBackground: '#FFFFFF',
          colorInputBackground: '#FFFFFF',
          colorInputText: '#1C1C1A',
          colorNeutral: '#1C1C1A',
          borderRadius: '12px',
          fontFamily: 'Archivo, system-ui, sans-serif',
          fontSize: '15px',
        },
      }}
    >
      <TokenBruecke />
      {children}
    </ClerkProvider>
  );
}

/* ── Profil-Ecke der Navigation ──────────────────────────────────── */
export type KontoZiel = 'anmelden' | 'registrieren';

function NavKontoClerk({ onKonto }: { onKonto?: (ziel: KontoZiel) => void }) {
  const { isSignedIn, user } = useUser();
  if (isSignedIn) {
    const name = user?.firstName || user?.username
      || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Konto';
    return (
      <div className="nav-profil">
        <UserButton appearance={{ elements: { avatarBox: { width: '30px', height: '30px' } } }} />
        <div><span className="np-n">{name}</span><span className="np-s">Kostenloses Konto</span></div>
      </div>
    );
  }
  return (
    <div className="nav-konto">
      <div className="nk-t serif">Hol dir mehr aus ulba</div>
      <p className="nk-s">Mit einem kostenlosen Konto behältst du deine Projekte, Designs und Anfragen — und bekommst {RENDERS_PRO_MONAT} Renders im Monat.</p>
      {onKonto
        ? <>
            <button className="nk-haupt" onClick={e => { e.stopPropagation(); onKonto('registrieren'); }}>Kostenlos registrieren</button>
            <button className="nk-neben" onClick={e => { e.stopPropagation(); onKonto('anmelden'); }}>Anmelden</button>
          </>
        : <>
            <a className="nk-haupt" href="/registrieren" onClick={e => { e.preventDefault(); oeffneKonto('registrieren'); }}>Kostenlos registrieren</a>
            <a className="nk-neben" href="/anmelden" onClick={e => { e.preventDefault(); oeffneKonto('anmelden'); }}>Anmelden</a>
          </>}
    </div>
  );
}

export function NavKonto({ onKonto }: { onKonto?: (ziel: KontoZiel) => void } = {}) {
  if (!CLERK_AKTIV) {
    return (
      <div className="nav-profil">
        <span className="np-av">A</span>
        <div><span className="np-n">Alen</span><span className="np-s">ulba · Basel</span></div>
      </div>
    );
  }
  return <NavKontoClerk onKonto={onKonto} />;
}

/* ── Anmelde-Wand ────────────────────────────────────────────────────
   Erscheint, wenn der Server die freien Kontingente fuer erschoepft
   erklaert (3 Suchen bzw. 2 Renders). Freundlich, ehrlich, zwei Wege. */
export function AnmeldeWand({ grund, onClose }: { grund: AnmeldeGrund; onClose: () => void }) {
  /* v84 — Limit-Wand im Look der Konto-Seiten (Claude-Vorbild): Vollbild,
     links Überschrift aus dem Grund + Nutzenliste + Clerk-Registrierung
     direkt im Overlay (routing virtual → App-Zustand bleibt erhalten),
     rechts das stumme Loop-Video. Nach erfolgreicher Anmeldung schliesst
     sich die Wand selbst. */
  const { isSignedIn } = useAuth();
  useEffect(() => { if (isSignedIn) onClose(); }, [isSignedIn, onClose]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    const alt = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = alt; };
  }, [onClose]);
  const titel = grund.scope === 'render' ? 'Deine kostenlosen Renders sind aufgebraucht' : 'Deine kostenlosen Suchen sind aufgebraucht';
  const sub = grund.scope === 'render'
    ? 'Mit einem kostenlosen Konto renderst du 5 Designs pro Monat.'
    : 'Mit einem kostenlosen Konto suchst du unbegrenzt.';
  return (
    <div className="konto-overlay" role="dialog" aria-modal="true" aria-label={titel}>
      <main className="konto-seite">
        <a className="konto-marke" href="/">ulba</a>
        <button className="konto-zu" onClick={onClose} aria-label="schließen">×</button>
        <div className="konto-spalten">
          <div className="konto-links">
            <h1 className="konto-titel konto-titel--wand">{titel}</h1>
            <p className="konto-sub">{sub}</p>
            <ul className="konto-liste">
              <li>Unbegrenzt suchen</li>
              <li>{RENDERS_PRO_MONAT} Renders pro Monat</li>
              <li>Favoriten &amp; Projekte</li>
            </ul>
            <SignUp routing="virtual" />
            <RechtLinks className="konto-recht" />
          </div>
          <div className="konto-visual"><KontoVideo /></div>
        </div>
      </main>
    </div>
  );
}
