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

import { ClerkProvider, UserButton, useAuth, useClerk, useUser } from '@clerk/nextjs';
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

/* ── Konto-Overlay (v79.4) ───────────────────────────────────────────
   Anmelden/Registrieren oeffnen sich als Clerk-Modal DIREKT in der App —
   kein Seitenwechsel, die Suche bleibt stehen. Die Seiten /anmelden und
   /registrieren bleiben als Fallback (Direktlinks, Clerk ohne Modal). */
let modalOeffnen: ((ziel: KontoZiel) => void) | null = null;

export function oeffneKonto(ziel: KontoZiel): void {
  if (modalOeffnen) { modalOeffnen(ziel); return; }
  window.location.href = ziel === 'anmelden' ? '/anmelden' : '/registrieren';
}

function ModalBruecke() {
  const clerk = useClerk();
  useEffect(() => {
    modalOeffnen = (ziel: KontoZiel) => {
      if (ziel === 'anmelden') clerk.openSignIn({});
      else clerk.openSignUp({});
    };
    return () => { modalOeffnen = null; };
  }, [clerk]);
  return null;
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
const FREI_RENDERS = 2;
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
    && !!body && body.codes !== true;

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
      const text = `Deine ${FREI_RENDERS} kostenlosen Renders sind aufgebraucht — mit einem kostenlosen Konto hast du 5 Renders pro Monat.`;
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
        if (d && d.cached !== true) {
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
  signUp: {
    ...(deDE as any).signUp,
    start: { ...((deDE as any).signUp?.start || {}), actionText: 'Schon ein Konto?', actionLink: 'Anmelden' },
  },
  signIn: {
    ...(deDE as any).signIn,
    start: { ...((deDE as any).signIn?.start || {}), actionText: 'Neu hier?', actionLink: 'Kostenlos registrieren' },
  },
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
        layout: { socialButtonsVariant: 'blockButton', socialButtonsPlacement: 'top' },
        variables: {
          colorPrimary: '#1C1C1A',
          colorText: '#1C1C1A',
          colorTextSecondary: '#5D5D58',
          colorBackground: '#FAFAFA',
          colorInputBackground: '#FFFFFF',
          colorInputText: '#1C1C1A',
          colorNeutral: '#1C1C1A',
          borderRadius: '11px',
          fontFamily: 'Archivo, system-ui, sans-serif',
        },
        elements: {
          /* v79.6 — Claude-Vorbild: Karte im Flaechen-Ton, grosse Rundung,
             sehr weicher Schatten; die Karten-eigene Ueberschrift faellt weg
             (die Seite bzw. der Kontext liefert sie). */
          cardBox: { boxShadow: '0 14px 40px -24px rgba(28,28,26,.28), 0 1px 3px rgba(28,28,26,.05)', border: '1px solid #EFEFEC', borderRadius: '24px' },
          card: { backgroundColor: '#FAFAFA', boxShadow: 'none', padding: '34px 32px 28px' },
          header: { display: 'none' },
          footer: { background: '#FAFAFA' },
          footerAction: { background: '#FAFAFA' },
          socialButtonsBlockButton: { backgroundColor: '#FFFFFF', border: '1px solid #EAEAE7', boxShadow: 'none', borderRadius: '10px', height: '44px' },
          formFieldInput: { backgroundColor: '#FFFFFF', border: '1px solid #EAEAE7', boxShadow: 'none', borderRadius: '10px', minHeight: '44px' },
          formButtonPrimary: { boxShadow: 'none', borderRadius: '10px', height: '44px', fontSize: '14.5px' },
          dividerLine: { background: '#EAEAE7' },
          modalBackdrop: { backgroundColor: 'rgba(28,28,26,.45)' },
        },
      }}
    >
      <TokenBruecke />
      <ModalBruecke />
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
      <p className="nk-s">Mit einem kostenlosen Konto behältst du Favoriten, Linien und Renders — und bekommst 5 Renders im Monat.</p>
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
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  const titel = grund.scope === 'render' ? 'Deine kostenlosen Renders sind aufgebraucht' : 'Deine kostenlosen Suchen sind aufgebraucht';
  return (
    <div className="aw-ov" role="dialog" aria-modal="true" aria-label={titel} onClick={onClose}>
      <div className="aw-box" onClick={e => e.stopPropagation()}>
        <button className="aw-zu" onClick={onClose} aria-label="schließen">×</button>
        <div className="aw-logo serif">ulba</div>
        <h2 className="aw-t">{titel}</h2>
        <p className="aw-s">
          {grund.text || 'Mit einem kostenlosen Konto suchst du unbegrenzt und renderst 5 Designs pro Monat.'}
        </p>
        <ul className="aw-liste">
          <li>Unbegrenzt suchen und vergleichen</li>
          <li>5 Design-Renders pro Monat</li>
          <li>Favoriten und Projekte überall dabei</li>
        </ul>
        <a className="aw-haupt" href="/registrieren" onClick={e => { e.preventDefault(); onClose(); oeffneKonto('registrieren'); }}>Kostenlos registrieren</a>
        <a className="aw-neben" href="/anmelden" onClick={e => { e.preventDefault(); onClose(); oeffneKonto('anmelden'); }}>Ich habe schon ein Konto — anmelden</a>
      </div>
    </div>
  );
}
