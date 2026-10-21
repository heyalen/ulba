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

import { ClerkProvider, UserButton, useAuth, useUser } from '@clerk/nextjs';
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

/* ── kontoFetch ──────────────────────────────────────────────────────
   credentials:'include' traegt das Frei-Cookie des Renderers (anonyme
   Kontingente), der Bearer-Token sagt dem Renderer, wer angemeldet ist. */
export type AnmeldeGrund = { scope: string; text: string };

export async function kontoFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await holeToken();
  const headers: Record<string, string> = { ...((init.headers as Record<string, string>) || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers, credentials: 'include' });
  if (res.status === 401) {
    try {
      const d = await res.clone().json();
      if (d?.code === 'login_required') {
        window.dispatchEvent(new CustomEvent<AnmeldeGrund>('ulba:anmelden', {
          detail: { scope: String(d.scope || ''), text: String(d.error || '') },
        }));
      }
    } catch { /* kein JSON — normaler Fehlerpfad */ }
  }
  return res;
}

/* ── Provider ────────────────────────────────────────────────────── */
export function KontoProvider({ children }: { children: ReactNode }) {
  if (!CLERK_AKTIV) return <>{children}</>;
  return (
    <ClerkProvider
      localization={deDE}
      signInUrl="/anmelden"
      signUpUrl="/registrieren"
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: '#1C1C1A',
          colorText: '#1C1C1A',
          borderRadius: '11px',
          fontFamily: 'Archivo, system-ui, sans-serif',
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
      <p className="nk-s">Mit einem kostenlosen Konto behältst du Favoriten, Linien und Renders — und bekommst 5 Renders im Monat.</p>
      {onKonto
        ? <>
            <button className="nk-haupt" onClick={e => { e.stopPropagation(); onKonto('registrieren'); }}>Kostenlos registrieren</button>
            <button className="nk-neben" onClick={e => { e.stopPropagation(); onKonto('anmelden'); }}>Anmelden</button>
          </>
        : <>
            <a className="nk-haupt" href="/registrieren">Kostenlos registrieren</a>
            <a className="nk-neben" href="/anmelden">Anmelden</a>
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
        <a className="aw-haupt" href="/registrieren">Kostenlos registrieren</a>
        <a className="aw-neben" href="/anmelden">Ich habe schon ein Konto — anmelden</a>
      </div>
    </div>
  );
}
