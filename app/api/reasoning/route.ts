import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// On-demand reasoning für Detail-Panel (wird nur beim Klick geladen)
export async function POST(req: NextRequest) {
  try {
    const { productName, productContext, query } = await req.json();
    if (!query || !productName) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `Beauty-Packaging-Experte. Antworte NUR mit JSON, kein Markdown:
{"reasoning":"1 kurzer Satz warum dieses Produkt zur Anfrage passt oder nicht","rendering_brief":"FLUX prompt: Farbe Finish Stil Stimmung"}`,
      messages: [{ role: 'user', content: `Anfrage: "${query}"\nProdukt: ${productName}\n${productContext ?? ''}` }],
    });

    const text = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}';
    const jsonMatch = text.match(/{[\s\S]*}/);
    const result = JSON.parse(jsonMatch?.[0] ?? '{}');

    return NextResponse.json({ reasoning: result.reasoning ?? '', rendering_brief: result.rendering_brief ?? '' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
