import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [totalAds, activeCampaigns, totalCampaigns, completedAds, recentAds] =
    await Promise.all([
      prisma.ad.count({ where: { userId } }),
      prisma.campaign.count({ where: { userId, status: "active" } }),
      prisma.campaign.count({ where: { userId } }),
      prisma.ad.count({ where: { userId, status: "completed" } }),
      prisma.ad.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { campaign: { select: { name: true } } },
      }),
    ]);

  // Get ads per month for chart data (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyAds = await prisma.ad.findMany({
    where: { userId, createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true },
  });

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const chartData: { month: string; ads: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const month = d.getMonth();
    const year = d.getFullYear();
    const count = monthlyAds.filter((a) => {
      const ad = new Date(a.createdAt);
      return ad.getMonth() === month && ad.getFullYear() === year;
    }).length;
    chartData.push({ month: monthNames[month], ads: count });
  }

  // Recent activity from ads and campaigns
  const recentActivity = recentAds.map((ad) => ({
    id: ad.id,
    type: "ad_created" as const,
    description: `Created ad: ${ad.headline}`,
    campaign: ad.campaign?.name || null,
    timestamp: ad.createdAt,
  }));

  return NextResponse.json({
    stats: {
      totalAds,
      activeCampaigns,
      totalCampaigns,
      completedAds,
    },
    chartData,
    recentActivity,
  });
}
