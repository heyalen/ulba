import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/airtable';

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(products);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
