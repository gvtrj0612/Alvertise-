import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ads = await prisma.ad.findMany({
    where: { userId: session.user.id },
    include: { campaign: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const parsed = ads.map((ad) => ({
    ...ad,
    hashtags: JSON.parse(ad.hashtags),
  }));

  return NextResponse.json(parsed);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Enforce plan-based limits
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } });
    const maxAds = user?.plan === "pro" ? 100 : 10;
    const adCount = await prisma.ad.count({ where: { userId: session.user.id } });
    if (adCount >= maxAds) {
      return NextResponse.json(
        { error: `Plan limit reached. Your ${user?.plan || "free"} plan allows ${maxAds} ads. Upgrade to Pro for more.` },
        { status: 403 }
      );
    }

    const { headline, primaryText, description, callToAction, platform, hashtags, campaignId } =
      await request.json();

    if (!headline || !primaryText || !platform) {
      return NextResponse.json(
        { error: "Headline, primary text, and platform are required" },
        { status: 400 }
      );
    }

    const ad = await prisma.ad.create({
      data: {
        headline,
        primaryText,
        description: description || "",
        callToAction: callToAction || "Learn More",
        platform,
        hashtags: JSON.stringify(hashtags || []),
        campaignId: campaignId || null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      { ...ad, hashtags: JSON.parse(ad.hashtags) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create ad error:", error);
    return NextResponse.json(
      { error: "Failed to create ad" },
      { status: 500 }
    );
  }
}
