import { prisma } from "@/lib/prisma";

export type LearnedVideoProfile = "fast" | "balanced" | "quality";

interface LearningAdRow {
  id: string;
  platform: string;
  tone: string | null;
  language: string;
  theme: string | null;
  colorPalette: string | null;
  audience: string | null;
  callToAction: string;
  impressions: number;
  clicks: number;
  likes: number;
  shares: number;
  feedback: { score: number | null; sentiment: string | null }[];
}

interface WeightedBucket {
  weight: number;
  count: number;
}

export interface OptimizationSignals {
  hasData: boolean;
  sampleSize: number;
  recommended: {
    platform?: string;
    tone?: string;
    language?: string;
    theme?: string;
    colorPalette?: string;
    audience?: string;
    callToAction?: string;
    videoProfile: LearnedVideoProfile;
  };
  summaryLines: string[];
}

function toBucket(map: Map<string, WeightedBucket>, key: string, weight: number) {
  if (!key) return;
  const prev = map.get(key) || { weight: 0, count: 0 };
  prev.weight += weight;
  prev.count += 1;
  map.set(key, prev);
}

function topKey(map: Map<string, WeightedBucket>): string | undefined {
  return Array.from(map.entries())
    .sort((a, b) => b[1].weight - a[1].weight || b[1].count - a[1].count)[0]?.[0];
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function normalizeSentiment(sentiment: string | null) {
  if (sentiment === "positive") return 0.9;
  if (sentiment === "negative") return 0.2;
  return 0.5;
}

function chooseVideoProfile(engagementRate: number, ctrRate: number): LearnedVideoProfile {
  // Favor quality when engagement is strong, fast when weak, balanced in the middle.
  if (engagementRate >= 0.08 || ctrRate >= 0.03) return "quality";
  if (engagementRate <= 0.02 && ctrRate <= 0.01) return "fast";
  return "balanced";
}

export async function buildOptimizationSignals(userId: string): Promise<OptimizationSignals> {
  const ads = (await prisma.ad.findMany({
    where: { userId },
    select: {
      id: true,
      platform: true,
      tone: true,
      language: true,
      theme: true,
      colorPalette: true,
      audience: true,
      callToAction: true,
      impressions: true,
      clicks: true,
      likes: true,
      shares: true,
      feedback: {
        select: {
          score: true,
          sentiment: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  })) as LearningAdRow[];

  if (!ads.length) {
    return {
      hasData: false,
      sampleSize: 0,
      recommended: { videoProfile: "balanced" },
      summaryLines: [],
    };
  }

  const platformStats = new Map<string, WeightedBucket>();
  const toneStats = new Map<string, WeightedBucket>();
  const languageStats = new Map<string, WeightedBucket>();
  const themeStats = new Map<string, WeightedBucket>();
  const colorStats = new Map<string, WeightedBucket>();
  const audienceStats = new Map<string, WeightedBucket>();
  const ctaStats = new Map<string, WeightedBucket>();

  const engagementRates: number[] = [];
  const ctrRates: number[] = [];
  const sentimentScores: number[] = [];

  for (const ad of ads) {
    const impressions = Math.max(ad.impressions || 0, 1);
    const ctr = (ad.clicks || 0) / impressions;
    const engagement = ((ad.likes || 0) + (ad.shares || 0) + (ad.clicks || 0)) / impressions;

    const feedbackScores = ad.feedback
      .map((f) => (typeof f.score === "number" ? f.score : normalizeSentiment(f.sentiment)))
      .filter((v) => Number.isFinite(v));

    const feedbackScore = feedbackScores.length ? avg(feedbackScores) : 0.5;

    // Composite performance weight: feedback + engagement + CTR
    const weight = feedbackScore * 0.55 + Math.min(engagement, 1) * 0.3 + Math.min(ctr, 1) * 0.15;

    toBucket(platformStats, ad.platform || "facebook", weight);
    toBucket(toneStats, ad.tone || "professional", weight);
    toBucket(languageStats, ad.language || "en", weight);
    toBucket(themeStats, ad.theme || "modern", weight);
    toBucket(colorStats, ad.colorPalette || "vibrant", weight);
    toBucket(audienceStats, ad.audience || "professionals", weight);
    toBucket(ctaStats, ad.callToAction || "Learn More", weight);

    engagementRates.push(engagement);
    ctrRates.push(ctr);
    sentimentScores.push(feedbackScore);
  }

  const avgEngagement = avg(engagementRates);
  const avgCtr = avg(ctrRates);
  const avgSentiment = avg(sentimentScores);

  const recommended = {
    platform: topKey(platformStats),
    tone: topKey(toneStats),
    language: topKey(languageStats),
    theme: topKey(themeStats),
    colorPalette: topKey(colorStats),
    audience: topKey(audienceStats),
    callToAction: topKey(ctaStats),
    videoProfile: chooseVideoProfile(avgEngagement, avgCtr),
  };

  const summaryLines = [
    `Optimization model evaluated ${ads.length} ads.`,
    `Average feedback score ${avgSentiment.toFixed(2)}, CTR ${(avgCtr * 100).toFixed(2)}%, engagement ${(avgEngagement * 100).toFixed(2)}%.`,
    `Top defaults: platform ${recommended.platform}, tone ${recommended.tone}, language ${recommended.language}, CTA ${recommended.callToAction}.`,
    `Recommended video profile: ${recommended.videoProfile}.`,
  ];

  return {
    hasData: true,
    sampleSize: ads.length,
    recommended,
    summaryLines,
  };
}
