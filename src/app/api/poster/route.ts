import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/poster - Generate an ad poster design description
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
    const { headline, primaryText, callToAction, platform, theme, colorPalette, audience } =
      await request.json();

    if (!headline) {
      return NextResponse.json(
        { error: "Headline is required" },
        { status: 400 }
      );
    }

    // Generate poster design specs from AI
    const prompt = `Create a detailed ad poster design specification for the following ad:

Headline: ${headline}
Primary Text: ${primaryText || "N/A"}
Call to Action: ${callToAction || "Learn More"}
Platform: ${platform || "instagram"}
Theme: ${theme || "modern"}
Color Palette: ${colorPalette || "vibrant"}
Target Audience: ${audience || "general"}

Return a JSON object with this structure:
{
  "width": 1080,
  "height": 1080,
  "backgroundColor": "#hex",
  "gradientEnd": "#hex or null",
  "headlineStyle": { "fontSize": number, "color": "#hex", "fontWeight": "bold", "y": number },
  "bodyStyle": { "fontSize": number, "color": "#hex", "y": number },
  "ctaStyle": { "fontSize": number, "color": "#hex", "bgColor": "#hex", "y": number, "borderRadius": number },
  "accentColor": "#hex",
  "layout": "centered|split|minimal|bold",
  "decorativeElements": [{ "type": "circle|line|rectangle|dot-pattern", "x": number, "y": number, "size": number, "color": "#hex" }]
}

Return ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a graphic design AI that creates ad poster specifications. Return ONLY valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No design spec response");
    }

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse design spec");
    }

    const designSpec = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      designSpec,
      ad: { headline, primaryText, callToAction, platform },
    });
  } catch (error) {
    console.error("Poster generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate poster design" },
      { status: 500 }
    );
  }
}
