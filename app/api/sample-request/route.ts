import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = "tblIZnKIrr81MYSzr";

// Field-IDs der Musteranfrage-Tabelle (aus Airtable-Schema verifiziert)
const F = {
  name: "fldGNGNcdTP37umjZ",       // Anfrage_Name
  email: "fldcxIabIhWs2vwse",      // Anfrage_Email
  firma: "fld1C7W9B95YxQGPo",      // Anfrage_Firma
  system: "fldz4eI0w86Nd2XgW",     // System (Link → verbindliches Original-Packmittel)
  status: "fldlVebHyqiN3yMXI",     // Anfrage_Status
  datum: "fldfd6b4zxhnI68F2",      // Anfrage_Datum
  notiz: "fldapwhmIssHbYCd1",      // Anfrage_Notiz (Briefing)
  wunschRender: "fldOnX3P2IjsMWt3f", // Wunsch-Render (URL) — die Anmutung
  wunschwerte: "fldMJV1m2aSY7PX8b",  // Wunschwerte (Long text) — Hex/Finish, produzierbar
  cap: "fldTqWJoVSEt0avN6",          // Gewählter Verschluss (Single line text)
} as const;

export async function POST(req: NextRequest) {
  const {
    productId,
    productName,        // aktuell nicht persistiert (Original steckt im Link), aber angenommen
    supplier,           // dito — Lieferant-Verknüpfung folgt in einem späteren Schritt
    brandName,
    brandEmail,
    brief,
    // NEU: Wunsch-Seite der Anfrage
    renderUrl = "",     // gerendertes Wunschbild (Seedream-URL)
    wishValues = "",    // Wunschwerte = renderingPrompt (konkrete Farb-/Finish-/Dekor-Werte)
    capLabel = "",      // lesbarer Name des gewählten Verschlusses
  } = await req.json();

  if (!brandEmail || !productId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Nur gesetzte Zusatzfelder mitschicken — leere URL/Text nicht schreiben.
  const fields: Record<string, any> = {
    [F.name]: brandName || brandEmail,
    [F.email]: brandEmail,
    [F.firma]: brandName || "",
    [F.system]: [productId],
    [F.status]: "Neu",
    [F.datum]: today,
    [F.notiz]: brief || "",
  };
  if (renderUrl) fields[F.wunschRender] = renderUrl;
  if (wishValues) fields[F.wunschwerte] = wishValues;
  if (capLabel) fields[F.cap] = capLabel;

  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_ID}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    console.error("Airtable sample-request failed:", detail);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
