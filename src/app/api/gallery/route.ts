import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: fetch all published ads (no auth required)
export async function GET() {
  try {
    const ads = await prisma.ad.findMany({
      where: { published: true },
      include: {
        user: { select: { name: true, image: true } },
        feedback: {
          select: { id: true, comment: true, sentiment: true, emotion: true, score: true, authorName: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const parsed = ads.map((ad) => ({
      id: ad.id,
      headline: ad.headline,
      primaryText: ad.primaryText,
      description: ad.description,
      callToAction: ad.callToAction,
      platform: ad.platform,
      hashtags: JSON.parse(ad.hashtags),
      imageUrl: ad.imageUrl,
      videoUrl: ad.videoUrl,
      likes: ad.likes,
      shares: ad.shares,
      impressions: ad.impressions,
      createdAt: ad.createdAt,
      author: ad.user,
      feedback: ad.feedback,
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Gallery fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 });
  }
}
