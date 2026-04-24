import { prisma } from "@/lib/prisma";

type FeedbackRow = {
  sentiment: string | null;
  score: number | null;
  emotion: string | null;
  aspects: string | null;
  comment: string;
  createdAt: Date;
  ad: {
    platform: string;
    tone: string | null;
    audience: string | null;
    theme: string | null;
    colorPalette: string | null;
    language: string;
    headline: string;
    callToAction: string;
  };
};

export interface FeedbackLearningContext {
  hasData: boolean;
  summaryLines: string[];
  bestSignals: {
    platforms: string[];
    tones: string[];
    ctas: string[];
    headlines: string[];
    avoid: string[];
  };
}

function safeParseAspects(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function pickTopCounts(map: Map<string, { count: number; scoreSum: number }>, limit = 3) {
  return Array.from(map.entries())
    .map(([key, value]) => ({ key, count: value.count, avgScore: value.scoreSum / value.count }))
    .sort((a, b) => b.avgScore - a.avgScore || b.count - a.count)
    .slice(0, limit)
    .map((item) => item.key);
}

export async function buildFeedbackLearningContext(
  userId: string
): Promise<FeedbackLearningContext> {
  const feedbackRows = await prisma.adFeedback.findMany({
    where: {
      ad: { userId },
    },
    include: {
      ad: {
        select: {
          platform: true,
          tone: true,
          audience: true,
          theme: true,
          colorPalette: true,
          language: true,
          headline: true,
          callToAction: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  }) as FeedbackRow[];

  if (feedbackRows.length === 0) {
    return {
      hasData: false,
      summaryLines: [],
      bestSignals: {
        platforms: [],
        tones: [],
        ctas: [],
        headlines: [],
        avoid: [],
      },
    };
  }

  const platformStats = new Map<string, { count: number; scoreSum: number }>();
  const toneStats = new Map<string, { count: number; scoreSum: number }>();
  const ctaStats = new Map<string, { count: number; scoreSum: number }>();
  const headlineStats = new Map<string, { count: number; scoreSum: number }>();
  const negativePatterns = new Map<string, number>();

  const scores: number[] = [];
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  const emotionCounts = new Map<string, number>();
  const aspectCounts = new Map<string, number>();

  for (const row of feedbackRows) {
    const score = typeof row.score === "number" ? row.score : 0.5;
    scores.push(score);

    const sentiment = row.sentiment || "neutral";
    if (sentiment in sentimentCounts) {
      sentimentCounts[sentiment as keyof typeof sentimentCounts]++;
    }

    if (row.emotion) {
      emotionCounts.set(row.emotion, (emotionCounts.get(row.emotion) || 0) + 1);
    }

    const aspects = safeParseAspects(row.aspects);
    for (const key of Object.keys(aspects)) {
      aspectCounts.set(key, (aspectCounts.get(key) || 0) + 1);
    }

    const platformKey = row.ad.platform || "unknown";
    const toneKey = row.ad.tone || "unspecified";
    const ctaKey = row.ad.callToAction || "unspecified";
    const headlineKey = row.ad.headline || "unspecified";

    const update = (map: Map<string, { count: number; scoreSum: number }>, key: string) => {
      const existing = map.get(key) || { count: 0, scoreSum: 0 };
      existing.count += 1;
      existing.scoreSum += score;
      map.set(key, existing);
    };

    update(platformStats, platformKey);
    update(toneStats, toneKey);
    update(ctaStats, ctaKey);
    update(headlineStats, headlineKey);

    if (score <= 0.45) {
      const badWords = row.comment
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .slice(0, 12)
        .join(" ");
      if (badWords) {
        negativePatterns.set(badWords, (negativePatterns.get(badWords) || 0) + 1);
      }
    }
  }

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const medianScore = median(scores);

  const bestPlatforms = pickTopCounts(platformStats);
  const bestTones = pickTopCounts(toneStats);
  const bestCtas = pickTopCounts(ctaStats);
  const bestHeadlines = pickTopCounts(headlineStats);
  const avoid = Array.from(negativePatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pattern]) => pattern);

  const topEmotions = Array.from(emotionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion]) => emotion);

  const topAspects = Array.from(aspectCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([aspect]) => aspect);

  const summaryLines = [
    `Feedback history: ${feedbackRows.length} entries, avg score ${avgScore.toFixed(2)}, median ${medianScore.toFixed(2)}.`,
    bestPlatforms.length ? `Best platforms: ${bestPlatforms.join(", ")}.` : "",
    bestTones.length ? `Best tones: ${bestTones.join(", ")}.` : "",
    bestCtas.length ? `Best CTAs: ${bestCtas.join(", ")}.` : "",
    topEmotions.length ? `Most common reactions: ${topEmotions.join(", ")}.` : "",
    topAspects.length ? `Most mentioned aspects: ${topAspects.join(", ")}.` : "",
    avoid.length ? `Avoid repeated weak phrasing/themes: ${avoid.join(" | ")}.` : "",
  ].filter(Boolean);

  return {
    hasData: true,
    summaryLines,
    bestSignals: {
      platforms: bestPlatforms,
      tones: bestTones,
      ctas: bestCtas,
      headlines: bestHeadlines,
      avoid,
    },
  };
}