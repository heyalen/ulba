/* app/api/sample-request/route.ts
   Nimmt den POST aus dem SampleModal (page.tsx) und legt einen Musteranfrage-
   Record in Airtable an. Original (System-Link) = verbindlich, Wunsch (Render +
   produzierbare Werte + Konzept) = Intention.

   Lieferant-Link wird NICHT vom Client geraten, sondern aus dem System-Record
   abgeleitet (record-id-basiert) — löst den offenen Punkt fldOJliIWZrAoc6Wf.

   ENV in der ulba-Vercel-App nötig: AIRTABLE_PAT.
*/

const AIRTABLE_BASE = 'app0QFyInfhvk66MC';
const SYSTEM_TABLE = 'tblB1kWay9TvX3rGv';
const MUSTERANFRAGE_TABLE = 'tblIZnKIrr81MYSzr';

async function airtableFetch(table: string, recordId: string): Promise<any> {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${table}/${recordId}`,
    { headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` } }
  );
  if (!res.ok) throw new Error(`Airtable ${table}/${recordId}: ${res.status}`);
  return res.json();
}

/* v58-Sicherheit: die Route lief ohne Origin-Pruefung und ohne Limit — jeder
   konnte per curl Musteranfrage-Records in Airtable kippen. Gleiche Idee wie
   der riegel im Renderer: nur die eigene Oberflaeche, und auch die nicht
   endlos. Pro-Instanz-Zaehler reicht (kappt Dauerbeschuss, mehr nicht). */
const OK_ORIGINS = new Set<string>([
  'https://ulba.vercel.app',
  'http://localhost:3000',
  ...String(process.env.ULBA_ORIGINS || '').split(',').map(o => o.trim()).filter(o => /^https?:\/\//.test(o)),
]);
const TAKT = new Map<string, number[]>();
function abgewiesen(req: Request, max: number): Response | null {
  const origin = req.headers.get('origin') || '';
  // Browser schicken bei fetch POST immer Origin; ohne Origin (curl) -> zu.
  if (!OK_ORIGINS.has(origin)) return Response.json({ error: 'Zugriff nur von ulba' }, { status: 403 });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unbekannt';
  const jetzt = Date.now();
  const treffer = (TAKT.get(ip) || []).filter(t => jetzt - t < 300000);
  if (treffer.length >= max) { TAKT.set(ip, treffer); return Response.json({ error: 'Zu viele Anfragen — kurz warten.' }, { status: 429 }); }
  treffer.push(jetzt); TAKT.set(ip, treffer);
  if (TAKT.size > 500) TAKT.forEach((v, k) => { if (!v.some((t: number) => jetzt - t < 300000)) TAKT.delete(k); });
  return null;
}

export async function POST(req: Request) {
  const zu = abgewiesen(req, 10);
  if (zu) return zu;
  let payload: any;
  try {
    const roh = await req.text();
    if (roh.length > 100000) return Response.json({ error: 'Anfrage zu gross' }, { status: 413 });
    payload = JSON.parse(roh);
  } catch {
    return Response.json({ error: 'Ungültiger Body' }, { status: 400 });
  }

  const {
    productId,
    brandName = '',
    brandEmail = '',
    brief = '',
    renderUrl = '',
    wishValues = '',
    capLabel = '',
    konzeptName = '',
    produzierbar = null,
  } = payload || {};

  if (!productId || !brandEmail || !String(brandEmail).trim()) {
    return Response.json({ error: 'productId und brandEmail sind erforderlich' }, { status: 400 });
  }

  try {
    // Lieferant aus dem System-Record ableiten (record-id-basiert, nie geraten).
    let lieferantIds: string[] = [];
    try {
      const sys = await airtableFetch(SYSTEM_TABLE, productId);
      const link = sys?.fields?.['Lieferant'];
      if (Array.isArray(link)) lieferantIds = link.filter((x: any) => typeof x === 'string');
    } catch {
      // System-Lookup darf die Anfrage nicht blockieren — ohne Lieferant-Link fortfahren.
    }

    // Feld-Objekt aufbauen; riskante Feldtypen (url, links) nur bei Wert setzen,
    // damit ein einzelner Fehlwert nicht den ganzen atomaren Write kippt.
    const fields: Record<string, any> = {
      Anfrage_Name: brandName || '(ohne Name)',
      Anfrage_Email: brandEmail,
      System: [productId],
      Anfrage_Notiz: brief || '',
      Wunschwerte: wishValues || '',
      'Gewählter Verschluss': capLabel || '',
      Konzept_Name: konzeptName || '',
      Produzierbar: produzierbar ? JSON.stringify(produzierbar) : '',
      Anfrage_Datum: new Date().toISOString().slice(0, 10),
      Anfrage_Status: 'Neu',
    };
    if (lieferantIds.length > 0) fields['Lieferant'] = lieferantIds;
    if (renderUrl && String(renderUrl).trim()) fields['Wunsch-Render'] = renderUrl;

    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${MUSTERANFRAGE_TABLE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
        },
        body: JSON.stringify({ fields }),
      }
    );

    const data = await res.json();
    if (!res.ok || !data.id) {
      return Response.json(
        { error: `Airtable: ${JSON.stringify(data.error || data)}` },
        { status: 502 }
      );
    }

    return Response.json({ ok: true, id: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    return Response.json({ error: message }, { status: 500 });
  }
}

/* GET /api/sample-request?ids=rec1,rec2 — Live-Status genau der Anfragen, deren
   Record-IDs der Client selbst hält (aus localStorage). Kein Login, kein Leak:
   es werden nur die angefragten IDs zurückgegeben. */
export async function GET(req: Request) {
  const zu = abgewiesen(req, 60);
  if (zu) return zu;
  const url = new URL(req.url);
  const ids = (url.searchParams.get('ids') || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => /^rec[A-Za-z0-9]{14}$/.test(s));

  if (ids.length === 0) return Response.json({ requests: [] });

  try {
    const formula = `OR(${ids.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    const params = new URLSearchParams({ filterByFormula: formula, pageSize: '100' });
    ['Anfrage_Status', 'Anfrage_Datum', 'Konzept_Name', 'Anfrage_Name'].forEach(f => params.append('fields[]', f));

    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${MUSTERANFRAGE_TABLE}?${params}`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` } }
    );
    const data = await res.json();
    if (!res.ok) return Response.json({ error: `Airtable: ${res.status}` }, { status: 502 });

    const requests = (data.records || []).map((r: any) => ({
      id: r.id,
      status: r.fields?.['Anfrage_Status'] || 'Neu',
      datum: r.fields?.['Anfrage_Datum'] || '',
    }));
    return Response.json({ requests });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    return Response.json({ error: message }, { status: 500 });
  }
}
