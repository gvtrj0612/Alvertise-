import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getOpenAI } from "@/lib/openai";

const PLATFORM_SIZES: Record<string, "1024x1024" | "1792x1024" | "1024x1792"> = {
  instagram: "1024x1024",
  facebook: "1792x1024",
  linkedin: "1792x1024",
  twitter: "1792x1024",
  google: "1792x1024",
  youtube: "1792x1024",
  story: "1024x1792",
};

export async function POST(request: NextRequest) {
  // Check API key
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-proj-paste-your-key-here") {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add your OPENAI_API_KEY to .env.local" },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const { success, response: rateLimitResponse } = rateLimit(ip, "image");
  if (!success) return rateLimitResponse!;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const openai = getOpenAI();
    const {
      headline,
      primaryText,
      platform,
      theme,
      colorPalette,
      audience,
      posterStyle,
      posterLayout,
      posterIntensity,
      adId,
    } = await request.json();

    if (!headline) {
      return NextResponse.json(
        { error: "Headline is required" },
        { status: 400 }
      );
    }

    // Shorten primary text to avoid DALL-E garbling long strings
    const shortBody = primaryText ? primaryText.slice(0, 80) : "";

    const styleLabel =
      posterStyle === "minimal"
        ? "minimal, premium, spacious"
        : posterStyle === "luxury"
          ? "luxury, editorial, high-end"
          : posterStyle === "bold"
            ? "bold, punchy, high-contrast"
            : "cinematic, polished, modern";

    const layoutLabel =
      posterLayout === "split"
        ? "split composition with clear visual/text separation"
        : posterLayout === "story"
          ? "story-like vertical composition"
          : posterLayout === "editorial"
            ? "editorial magazine-style layout"
            : "centered composition";

    const intensityLabel =
      posterIntensity === "soft"
        ? "soft lighting, subtle contrast, airy spacing"
        : posterIntensity === "strong"
          ? "dramatic lighting, bold contrast, strong glow accents"
          : "balanced lighting, premium contrast, clean spacing";

    const textRules = `TEXT RULES (critical):
  - PURE VISUAL ONLY.
  - Do NOT render any headline, CTA, body copy, letters, numbers, glyphs, logos, or signage.
  - Leave clean negative space for later typography overlays.
  - Keep the composition premium, cinematic, and brand-campaign quality.`;

    const prompt = `Create a premium, cinematic advertisement poster for a ${platform || "social media"} campaign.

  ${textRules}

VISUAL DESIGN:
- Theme: ${theme || "modern, premium, editorial"}
- Color palette: ${colorPalette || "bold, high-contrast, vibrant"}
- Target audience: ${audience || "general consumers"}
- Poster style: ${styleLabel}
- Layout: ${layoutLabel}
- Intensity: ${intensityLabel}
  - Create a striking visual composition that conveys: "${shortBody || headline}"
- Use strong visual hierarchy, layered depth, elegant shadows, and crisp typography
- Include relevant lifestyle imagery or abstract design elements that match the product/service
- Cinematic quality — looks like a real brand campaign from Nike, Apple, or Samsung
- Clean layout with generous white space around text
- No watermarks, no stock photo marks, no extra decorative text`;

    const size = PLATFORM_SIZES[platform] || "1024x1024";

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      quality: posterIntensity === "strong" ? "hd" : "standard",
      response_format: "b64_json",
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      throw new Error("No image data received from DALL-E");
    }

    // Save image to public/generated-images/
    const publicDir = path.join(process.cwd(), "public", "generated-images");
    await mkdir(publicDir, { recursive: true });

    const filename = `poster-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const filepath = path.join(publicDir, filename);
    const buffer = Buffer.from(imageData.b64_json, "base64");
    await writeFile(filepath, buffer);

    const imageUrl = `/generated-images/${filename}`;

    // Update Ad record if adId provided
    if (adId) {
      await prisma.ad.update({
        where: { id: adId, userId: session.user.id },
        data: { imageUrl },
      });
    }

    return NextResponse.json({
      imageUrl,
      revisedPrompt: imageData.revised_prompt,
    });
  } catch (error: unknown) {
    console.error("Image generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
