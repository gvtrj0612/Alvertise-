import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function countByHour(records: { createdAt: Date }[]) {
  const now = new Date();
  const buckets: { hour: string; count: number }[] = [];

  for (let i = 23; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(now.getHours() - i, 0, 0, 0);
    const hourKey = `${d.getHours().toString().padStart(2, "0")}:00`;
    buckets.push({ hour: hourKey, count: 0 });
  }

  for (const r of records) {
    const hour = r.createdAt.getHours().toString().padStart(2, "0") + ":00";
    const b = buckets.find((x) => x.hour === hour);
    if (b) b.count += 1;
  }

  return buckets;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    user,
    adCount,
    campaignCount,
    conversationCount,
    messageCount,
    feedbackCount,
    publishedAdsCount,
    recentAds,
    recentFeedback,
    recentConversations,
    recentAdEvents,
    recentFeedbackEvents,
    recentConversationEvents,
    sentimentGroup,
    emotionGroup,
    galleryFeedbackCount,
    gallerySentimentGroup,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, plan: true, createdAt: true },
    }),
    prisma.ad.count({ where: { userId } }),
    prisma.campaign.count({ where: { userId } }),
    prisma.conversation.count({ where: { userId } }),
    prisma.message.count({ where: { conversation: { userId } } }),
    prisma.adFeedback.count({ where: { ad: { userId } } }),
    prisma.ad.count({ where: { userId, published: true } }),
    prisma.ad.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        headline: true,
        platform: true,
        published: true,
        likes: true,
        shares: true,
        impressions: true,
        clicks: true,
        createdAt: true,
      },
    }),
    prisma.adFeedback.findMany({
      where: { ad: { userId } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        adId: true,
        comment: true,
        sentiment: true,
        emotion: true,
        score: true,
        authorName: true,
        createdAt: true,
      },
    }),
    prisma.conversation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        createdAt: true,
        _count: { select: { messages: true } },
      },
    }),
    prisma.ad.findMany({
      where: { userId, createdAt: { gte: since24h } },
      select: { createdAt: true },
    }),
    prisma.adFeedback.findMany({
      where: { ad: { userId }, createdAt: { gte: since24h } },
      select: { createdAt: true },
    }),
    prisma.conversation.findMany({
      where: { userId, createdAt: { gte: since24h } },
      select: { createdAt: true },
    }),
    prisma.adFeedback.groupBy({
      by: ["sentiment"],
      where: { ad: { userId } },
      _count: { sentiment: true },
    }),
    prisma.adFeedback.groupBy({
      by: ["emotion"],
      where: { ad: { userId } },
      _count: { emotion: true },
    }),
    prisma.adFeedback.count({
      where: { ad: { userId, published: true } },
    }),
    prisma.adFeedback.groupBy({
      by: ["sentiment"],
      where: { ad: { userId, published: true } },
      _count: { sentiment: true },
    }),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    user,
    totals: {
      ads: adCount,
      campaigns: campaignCount,
      conversations: conversationCount,
      messages: messageCount,
      feedback: feedbackCount,
      publishedAds: publishedAdsCount,
    },
    sentiment: {
      overall: sentimentGroup.map((s) => ({
        sentiment: s.sentiment || "unknown",
        count: s._count.sentiment,
      })),
      emotions: emotionGroup.map((e) => ({
        emotion: e.emotion || "unknown",
        count: e._count.emotion,
      })),
      galleryFeedback: {
        total: galleryFeedbackCount,
        bySentiment: gallerySentimentGroup.map((s) => ({
          sentiment: s.sentiment || "unknown",
          count: s._count.sentiment,
        })),
      },
    },
    recent: {
      ads: recentAds,
      feedback: recentFeedback,
      conversations: recentConversations,
    },
    activityLast24h: {
      ads: countByHour(recentAdEvents),
      feedback: countByHour(recentFeedbackEvents),
      conversations: countByHour(recentConversationEvents),
    },
  });
}
