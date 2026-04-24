import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-proj-paste-your-key-here") {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add your OPENAI_API_KEY to .env.local" },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "text",
    });

    return NextResponse.json({ text: transcription });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Transcription failed";
    console.error("Transcribe API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
