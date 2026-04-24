import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/ads/engagement - Track engagement metrics
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { adId, type } = await request.json();

    if (!adId || !type) {
      return NextResponse.json(
        { error: "Ad ID and engagement type are required" },
        { status: 400 }
      );
    }

    const validTypes = ["impression", "click", "like", "share"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid engagement type" },
        { status: 400 }
      );
    }

    const ad = await prisma.ad.findFirst({
      where: { id: adId, userId: session.user.id },
    });

    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    const fieldMap: Record<string, string> = {
      impression: "impressions",
      click: "clicks",
      like: "likes",
      share: "shares",
    };

    const field = fieldMap[type];

    const updated = await prisma.ad.update({
      where: { id: adId },
      data: { [field]: { increment: 1 } },
    });

    return NextResponse.json({
      impressions: updated.impressions,
      clicks: updated.clicks,
      likes: updated.likes,
      shares: updated.shares,
    });
  } catch (error) {
    console.error("Engagement tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track engagement" },
      { status: 500 }
    );
  }
}
