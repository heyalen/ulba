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

export async function POST(req: Request) {
  let payload: any;
  try {
    payload = await req.json();
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
