import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
  es: "Spanish",
  fr: "French",
};

export async function POST(request: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const ip = getClientIp(request);
  const { success, response: rateLimitResponse } = rateLimit(ip, "chat");
  if (!success) return rateLimitResponse!;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { text, targetLanguage, fields } = await request.json();

    if (!targetLanguage || !LANGUAGE_NAMES[targetLanguage]) {
      return NextResponse.json(
        { error: "Invalid target language" },
        { status: 400 }
      );
    }

    const langName = LANGUAGE_NAMES[targetLanguage];

    // If fields object is provided (for ad translation), translate each field
    if (fields) {
      const prompt = `Translate the following ad copy fields to ${langName}. Return ONLY a JSON object with the same keys but translated values. Maintain the tone and marketing impact. Do NOT add any explanation.

${JSON.stringify(fields, null, 2)}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a professional marketing translator. Translate ad copy while preserving marketing impact, tone, and persuasiveness. Return ONLY valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const result = completion.choices[0]?.message?.content;
      if (!result) {
        throw new Error("No translation response");
      }

      // Parse the JSON response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const translated = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ translated, language: targetLanguage });
      }

      throw new Error("Could not parse translation");
    }

    // Simple text translation
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a translator. Return ONLY the translated text, nothing else.",
        },
        {
          role: "user",
          content: `Translate to ${langName}: "${text}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No translation response");
    }

    return NextResponse.json({
      translated: result.trim(),
      language: targetLanguage,
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Failed to translate" },
      { status: 500 }
    );
  }
}
