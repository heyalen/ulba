import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const TABLE_ID = "tblIZnKIrr81MYSzr";

export async function POST(req: NextRequest) {
  const { productId, productName, supplier, brandName, brandEmail, brief } = await req.json();
  if (!brandEmail || !productId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const today = new Date().toISOString().split("T")[0];
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_ID}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          fldGNGNcdTP37umjZ: brandName || brandEmail,
          fldcxIabIhWs2vwse: brandEmail,
          fld1C7W9B95YxQGPo: brandName || "",
          fldz4eI0w86Nd2XgW: [productId],
          fldlVebHyqiN3yMXI: "New",
          fldfd6b4zxhnI68F2: today,
          fldapwhmIssHbYCd1: brief || "",
        },
      }),
    }
  );
  if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}
