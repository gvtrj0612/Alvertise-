import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/ads/ab-test - Create A/B test variants from existing ad
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { adId } = await request.json();

    if (!adId) {
      return NextResponse.json(
        { error: "Ad ID is required" },
        { status: 400 }
      );
    }

    // Get the original ad
    const originalAd = await prisma.ad.findFirst({
      where: { id: adId, userId: session.user.id },
    });

    if (!originalAd) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // Mark original as variant A if not already
    if (!originalAd.variant) {
      await prisma.ad.update({
        where: { id: adId },
        data: { variant: "A" },
      });
    }

    // Generate variant B using AI
    const prompt = `Create an A/B test variant of this ad. Keep the same product and intent but change the approach:

Original Ad:
- Headline: ${originalAd.headline}
- Primary Text: ${originalAd.primaryText}
- Description: ${originalAd.description}
- CTA: ${originalAd.callToAction}
- Platform: ${originalAd.platform}

Create a different variant that tests a different angle (e.g., different emotional appeal, different value proposition emphasis, different CTA). Return ONLY a JSON object with these fields: headline, primaryText, description, callToAction, hashtags (array).`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an A/B testing expert. Generate alternative ad copy variants. Return ONLY valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 800,
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No AI response");
    }

    // Parse the variant
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse variant");
    }

    const variantData = JSON.parse(jsonMatch[0]);

    // Create variant B in database
    const variantAd = await prisma.ad.create({
      data: {
        headline: variantData.headline,
        primaryText: variantData.primaryText,
        description: variantData.description || "",
        callToAction: variantData.callToAction || originalAd.callToAction,
        platform: originalAd.platform,
        hashtags: JSON.stringify(variantData.hashtags || []),
        userId: session.user.id,
        campaignId: originalAd.campaignId,
        variant: "B",
        tone: originalAd.tone,
        audience: originalAd.audience,
        theme: originalAd.theme,
        language: originalAd.language,
      },
    });

    return NextResponse.json(
      {
        original: {
          ...originalAd,
          variant: "A",
          hashtags: JSON.parse(originalAd.hashtags),
        },
        variant: {
          ...variantAd,
          hashtags: JSON.parse(variantAd.hashtags),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("A/B test error:", error);
    return NextResponse.json(
      { error: "Failed to create A/B test variant" },
      { status: 500 }
    );
  }
}

// GET /api/ads/ab-test?adId=xxx - Get A/B test comparison
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const adId = searchParams.get("adId");

  if (!adId) {
    // Return all A/B tested ads
    const abAds = await prisma.ad.findMany({
      where: {
        userId: session.user.id,
        variant: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });

    const parsed = abAds.map((ad) => ({
      ...ad,
      hashtags: JSON.parse(ad.hashtags),
    }));

    return NextResponse.json(parsed);
  }

  // Get specific ad's A/B comparison
  const ad = await prisma.ad.findFirst({
    where: { id: adId, userId: session.user.id },
  });

  if (!ad) {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...ad,
    hashtags: JSON.parse(ad.hashtags),
    ctr: ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : "0.00",
    engagementRate:
      ad.impressions > 0
        ? (((ad.likes + ad.shares + ad.clicks) / ad.impressions) * 100).toFixed(2)
        : "0.00",
  });
}
