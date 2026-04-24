import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { analyzeAdvancedSentiment } from "@/lib/sentiment";

// POST /api/feedback - Submit feedback for an ad
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { adId, comment } = await request.json();

    if (!adId || !comment) {
      return NextResponse.json(
        { error: "Ad ID and comment are required" },
        { status: 400 }
      );
    }

    // Verify the ad belongs to this user
    const ad = await prisma.ad.findFirst({
      where: { id: adId, userId: session.user.id },
    });

    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // Analyze sentiment using advanced AI with emotion detection
    const { sentiment, score, emotion, aspects } = await analyzeAdvancedSentiment(comment);

    const feedback = await prisma.adFeedback.create({
      data: {
        adId,
        comment,
        sentiment,
        score,
        emotion,
        aspects: Object.keys(aspects).length > 0 ? JSON.stringify(aspects) : null,
      },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

// GET /api/feedback?adId=xxx - Get feedback for an ad
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const adId = searchParams.get("adId");

  if (!adId) {
    // Return all feedback with sentiment and emotion summary
    const feedback = await prisma.adFeedback.findMany({
      where: { ad: { userId: session.user.id } },
      include: { ad: { select: { headline: true, platform: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Compute sentiment distribution and emotion counts
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    const emotionCounts: Record<string, number> = {};
    let totalScore = 0;

    for (const f of feedback) {
      if (f.sentiment === "positive") sentimentCounts.positive++;
      else if (f.sentiment === "negative") sentimentCounts.negative++;
      else sentimentCounts.neutral++;
      totalScore += f.score || 0.5;

      if (f.emotion) {
        emotionCounts[f.emotion] = (emotionCounts[f.emotion] || 0) + 1;
      }
    }

    return NextResponse.json({
      feedback: feedback.map((f) => ({
        ...f,
        aspects: f.aspects ? JSON.parse(f.aspects) : null,
      })),
      summary: {
        total: feedback.length,
        sentimentCounts,
        emotionCounts,
        averageScore: feedback.length > 0 ? totalScore / feedback.length : 0,
      },
    });
  }

  // Verify ad belongs to user
  const ad = await prisma.ad.findFirst({
    where: { id: adId, userId: session.user.id },
  });

  if (!ad) {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }

  const feedback = await prisma.adFeedback.findMany({
    where: { adId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    feedback.map((f) => ({
      ...f,
      aspects: f.aspects ? JSON.parse(f.aspects) : null,
    }))
  );
}
