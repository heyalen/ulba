import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Du bist ein Beauty-Packaging-Experte bei ulba.ai.
Eine Brand beschreibt ihr gewünschtes Packaging in Freitext.
Übersetze die Beschreibung in GENAU 15 Werte (1-5) für diese Dimensionen:
1=Emotion, 2=Ritual, 3=Ästhetik, 4=Zielgruppe, 5=Prestige, 6=Feminin, 7=Maskulin,
8=Archetyp, 9=Sensorik, 10=Werte, 11=Produkt-Fit, 12=Kultur, 13=Psychografik,
14=Zeitgeist, 15=Persona

Antworte NUR mit einem JSON-Array mit 15 Integers zwischen 1 und 5.
Beispiel: [3,2,4,3,5,4,1,3,3,2,4,2,4,5,4]
Absolut kein anderer Text.`;

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query?.trim()) return NextResponse.json({ error: 'No query' }, { status: 400 });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: query }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const vector = JSON.parse(text.replace(/```json|```/g, ''));

    if (!Array.isArray(vector) || vector.length !== 15) {
      return NextResponse.json({ error: 'Invalid vector' }, { status: 500 });
    }

    return NextResponse.json({ vector });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
