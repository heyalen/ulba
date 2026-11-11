/* ulba · Aufrufe ans Backend (ulba-vision-renderer). Nur Server-Code. */
import 'server-only';

const BACKEND = process.env.ULBA_BACKEND_URL || 'https://ulba-vision-renderer.vercel.app';

export async function backend(pfad: string, body: Record<string, unknown>, timeoutMs = 110_000): Promise<{ ok: boolean; status: number; json: any }> {
  const secret = process.env.ULBA_BACKEND_SECRET;
  if (!secret) return { ok: false, status: 500, json: { error: 'ULBA_BACKEND_SECRET fehlt in Vercel' } };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${BACKEND}${pfad}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-katalog-secret': secret }, body: JSON.stringify(body), signal: ctrl.signal, cache: 'no-store' });
    return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
  } catch (e) {
    return { ok: false, status: 504, json: { error: 'Zeitüberschreitung beim Backend' } };
  } finally { clearTimeout(t); }
}
