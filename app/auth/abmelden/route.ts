/* ulba · Abmelden (nur POST, damit kein Link versehentlich abmeldet). */
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '../../../lib/supabase/server';

export async function POST(req: NextRequest) {
  await supabaseServer().auth.signOut();
  return NextResponse.redirect(new URL('/login', req.nextUrl.origin), { status: 303 });
}
