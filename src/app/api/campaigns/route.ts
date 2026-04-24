import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { ads: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Enforce plan-based limits
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } });
    const maxCampaigns = user?.plan === "pro" ? 50 : 5;
    const campaignCount = await prisma.campaign.count({ where: { userId: session.user.id } });
    if (campaignCount >= maxCampaigns) {
      return NextResponse.json(
        { error: `Plan limit reached. Your ${user?.plan || "free"} plan allows ${maxCampaigns} campaigns. Upgrade to Pro for more.` },
        { status: 403 }
      );
    }

    const { name, platform, budget, startDate, endDate, status } =
      await request.json();

    if (!name || !platform) {
      return NextResponse.json(
        { error: "Name and platform are required" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        platform,
        budget: budget || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status || "draft",
        userId: session.user.id,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Create campaign error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
