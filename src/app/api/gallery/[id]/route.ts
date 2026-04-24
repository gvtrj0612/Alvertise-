import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeAdvancedSentiment } from "@/lib/sentiment";

// Public: like or comment on a published ad
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verify the ad exists and is published
    const ad = await prisma.ad.findFirst({
      where: { id, published: true },
    });

    if (!ad) {
      return NextResponse.json({ error: "Ad not found or not published" }, { status: 404 });
    }

    const { action, comment, authorName } = await request.json();

    if (action === "like") {
      const updated = await prisma.ad.update({
        where: { id },
        data: { likes: { increment: 1 } },
      });
      return NextResponse.json({ likes: updated.likes });
    }

    if (action === "feedback" && comment) {
      const trimmedComment = comment.trim();

      // Run sentiment analysis (same AI pipeline as authenticated feedback)
      const { sentiment, score, emotion, aspects } = await analyzeAdvancedSentiment(trimmedComment);

      const feedback = await prisma.adFeedback.create({
        data: {
          adId: id,
          comment: trimmedComment,
          authorName: authorName?.trim() || "Anonymous",
          sentiment,
          score,
          emotion,
          aspects: Object.keys(aspects).length > 0 ? JSON.stringify(aspects) : null,
        },
      });
      return NextResponse.json(feedback, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Gallery interaction error:", error);
    return NextResponse.json({ error: "Failed to process interaction" }, { status: 500 });
  }
}
