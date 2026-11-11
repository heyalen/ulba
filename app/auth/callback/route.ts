/* ulba · Rückkehr aus dem E-Mail-Link: Code gegen Sitzung tauschen, dann weiter. */
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseServer } from '../../../lib/supabase/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const typ = url.searchParams.get('type') as EmailOtpType | null;
  const weiter = url.searchParams.get('next') ?? '/studio';
  const ziel = weiter.startsWith('/') && !weiter.startsWith('//') ? weiter : '/studio';

  const sb = supabaseServer();
  let ok = false;
  if (code) ok = !(await sb.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && typ) ok = !(await sb.auth.verifyOtp({ token_hash: tokenHash, type: typ })).error;

  return NextResponse.redirect(new URL(ok ? ziel : '/login?fehler=link', url.origin));
}
