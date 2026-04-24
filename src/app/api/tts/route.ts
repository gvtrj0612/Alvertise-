import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-proj-paste-your-key-here") {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add your OPENAI_API_KEY to .env.local" },
      { status: 503 }
    );
  }

  try {
    const { text } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "TTS failed";
    console.error("TTS API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
