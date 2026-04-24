"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  FileText,
  FolderOpen,
  Loader2,
  MousePointerClick,
  ThumbsUp,
  Share2,
  Eye,
  Database,
  MessageSquare,
  Globe2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface StatsData {
  stats: {
    totalAds: number;
    activeCampaigns: number;
    totalCampaigns: number;
    completedAds: number;
  };
  chartData: { month: string; ads: number }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    campaign: string | null;
    timestamp: string;
  }[];
  platformDistribution?: { name: string; value: number }[];
  engagement?: {
    totalImpressions: number;
    totalClicks: number;
    totalLikes: number;
    totalShares: number;
  };
  sentimentSummary?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  emotionBreakdown?: { name: string; value: number }[];
}

interface DbInsightsData {
  generatedAt: string;
  totals: {
    ads: number;
    campaigns: number;
    conversations: number;
    messages: number;
    feedback: number;
    publishedAds: number;
  };
  sentiment: {
    overall: { sentiment: string; count: number }[];
    emotions: { emotion: string; count: number }[];
    galleryFeedback: {
      total: number;
      bySentiment: { sentiment: string; count: number }[];
    };
  };
  activityLast24h: {
    ads: { hour: string; count: number }[];
    feedback: { hour: string; count: number }[];
    conversations: { hour: string; count: number }[];
  };
}

const PIE_COLORS = [
  "hsl(262, 83%, 58%)",
  "hsl(210, 90%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(40, 90%, 55%)",
  "hsl(350, 80%, 55%)",
  "hsl(180, 60%, 45%)",
];

const SENTIMENT_COLORS = ["hsl(150, 60%, 45%)", "hsl(40, 70%, 55%)", "hsl(350, 70%, 55%)"];

const EMOTION_COLORS: Record<string, string> = {
  confident: "hsl(210, 90%, 55%)",
  excited: "hsl(40, 90%, 55%)",
  frustrated: "hsl(0, 70%, 55%)",
  confused: "hsl(280, 60%, 55%)",
  impressed: "hsl(150, 60%, 45%)",
  disappointed: "hsl(15, 80%, 55%)",
  neutral: "hsl(220, 10%, 55%)",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [dbInsights, setDbInsights] = useState<DbInsightsData | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllData() {
      try {
        const [statsRes, feedbackRes, adsRes] = await Promise.all([
          fetch("/api/stats"),
          fetch("/api/feedback").catch(() => null),
          fetch("/api/ads").catch(() => null),
        ]);

        const statsData = await statsRes.json();

        // Get engagement and platform distribution from ads
        let platformDistribution: { name: string; value: number }[] = [];
        const engagement = {
          totalImpressions: 0,
          totalClicks: 0,
          totalLikes: 0,
          totalShares: 0,
        };

        if (adsRes?.ok) {
          const ads = await adsRes.json();
          // Platform distribution
          const platformCounts: Record<string, number> = {};
          for (const ad of ads) {
            const platform = ad.platform || "other";
            platformCounts[platform] = (platformCounts[platform] || 0) + 1;
            engagement.totalImpressions += ad.impressions || 0;
            engagement.totalClicks += ad.clicks || 0;
            engagement.totalLikes += ad.likes || 0;
            engagement.totalShares += ad.shares || 0;
          }
          platformDistribution = Object.entries(platformCounts).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
          }));
        }

        // Get sentiment data and emotion breakdown from feedback
        let sentimentSummary = { positive: 0, neutral: 0, negative: 0 };
        let emotionBreakdown: { name: string; value: number }[] = [];
        if (feedbackRes?.ok) {
          const feedbackData = await feedbackRes.json();
          if (feedbackData.summary?.sentimentCounts) {
            sentimentSummary = feedbackData.summary.sentimentCounts;
          }
          if (feedbackData.summary?.emotionCounts) {
            emotionBreakdown = Object.entries(feedbackData.summary.emotionCounts)
              .map(([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value: value as number,
              }))
              .sort((a, b) => b.value - a.value);
          }
        }

        setData({
          ...statsData,
          platformDistribution,
          engagement,
          sentimentSummary,
          emotionBreakdown,
        });
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchDbInsights() {
      try {
        const res = await fetch("/api/db-insights");
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setDbInsights(json);
      } catch {
        // Keep current data on transient failures.
      } finally {
        if (mounted) setDbLoading(false);
      }
    }

    fetchDbInsights();
    const interval = setInterval(fetchDbInsights, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data?.stats;
  const chartData = data?.chartData || [];
  const platformDist = data?.platformDistribution || [];
  const engagement = data?.engagement;
  const sentimentData = data?.sentimentSummary;
  const emotionBreakdown = data?.emotionBreakdown || [];
  const dbTotals = dbInsights?.totals;
  const galleryFeedbackTotal = dbInsights?.sentiment.galleryFeedback.total || 0;
  const allFeedbackTotal = dbTotals?.feedback || 0;
  const galleryFeedbackPercent =
    allFeedbackTotal > 0
      ? ((galleryFeedbackTotal / allFeedbackTotal) * 100).toFixed(1)
      : "0.0";

  const sentimentChartData = sentimentData
    ? [
        { name: "Positive", value: sentimentData.positive },
        { name: "Neutral", value: sentimentData.neutral },
        { name: "Negative", value: sentimentData.negative },
      ].filter((d) => d.value > 0)
    : [];

  const platformBreakdown = data?.recentActivity
    ? Object.entries(
        data.recentActivity.reduce<Record<string, number>>((acc, item) => {
          const key = item.type || "Other";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, count]) => ({ name, count }))
    : [];

  const liveActivityData = dbInsights
    ? dbInsights.activityLast24h.ads.map((entry, idx) => ({
        hour: entry.hour,
        ads: entry.count,
        feedback: dbInsights.activityLast24h.feedback[idx]?.count || 0,
        conversations: dbInsights.activityLast24h.conversations[idx]?.count || 0,
      }))
    : [];

  const gallerySentimentData =
    dbInsights?.sentiment.galleryFeedback.bySentiment.map((item) => ({
      name: item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1),
      value: item.count,
    })) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track your ad generation performance and usage
        </p>
      </div>

      {/* Live database monitor */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Live Database Monitor
          </CardTitle>
          <CardDescription>
            Real records from DB (auto-refresh every 10 seconds)
          </CardDescription>
          <div className="text-xs text-muted-foreground">
            {dbLoading
              ? "Loading DB insights..."
              : dbInsights?.generatedAt
                ? `Last refresh: ${new Date(dbInsights.generatedAt).toLocaleTimeString()}`
                : "Live insights unavailable"}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">DB Ads Rows</p>
                    <p className="text-xl font-bold">{dbTotals?.ads ?? 0}</p>
                  </div>
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">DB Feedback Rows</p>
                    <p className="text-xl font-bold">{allFeedbackTotal}</p>
                  </div>
                  <MessageSquare className="h-5 w-5 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Published Ads</p>
                    <p className="text-xl font-bold">{dbTotals?.publishedAds ?? 0}</p>
                  </div>
                  <Globe2 className="h-5 w-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Gallery Contribution</p>
                    <p className="text-xl font-bold">{galleryFeedbackPercent}%</p>
                    <p className="text-[11px] text-muted-foreground">
                      {galleryFeedbackTotal} / {allFeedbackTotal || 0} feedback
                    </p>
                  </div>
                  <Badge variant="secondary">Sentiment Input</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">DB Writes in Last 24h</CardTitle>
                <CardDescription>
                  Ads, feedback, and conversations inserted over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {liveActivityData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      No live DB activity available yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={liveActivityData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "0.5rem",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="ads" stroke="hsl(262, 83%, 58%)" fill="hsl(262, 83%, 58%, 0.18)" strokeWidth={2} />
                        <Area type="monotone" dataKey="feedback" stroke="hsl(150, 60%, 45%)" fill="hsl(150, 60%, 45%, 0.18)" strokeWidth={2} />
                        <Area type="monotone" dataKey="conversations" stroke="hsl(210, 90%, 55%)" fill="hsl(210, 90%, 55%, 0.18)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gallery Feedback Sentiment</CardTitle>
                <CardDescription>
                  Sentiment generated specifically from public gallery interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {gallerySentimentData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      No gallery sentiment rows yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={gallerySentimentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {gallerySentimentData.map((_, index) => (
                            <Cell key={`gallery-sentiment-${index}`} fill={SENTIMENT_COLORS[index % SENTIMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "0.5rem",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Ads</p>
                <p className="text-2xl font-bold">{stats?.totalAds ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Completed Ads</p>
                <p className="text-2xl font-bold">{stats?.completedAds ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold">{stats?.totalCampaigns ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">{stats?.activeCampaigns ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement metrics cards */}
      {engagement && (engagement.totalImpressions > 0 || engagement.totalClicks > 0) && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Impressions</p>
                  <p className="text-xl font-bold">{engagement.totalImpressions.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <MousePointerClick className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Clicks</p>
                  <p className="text-xl font-bold">{engagement.totalClicks.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <ThumbsUp className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Likes</p>
                  <p className="text-xl font-bold">{engagement.totalLikes.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Share2 className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Shares</p>
                  <p className="text-xl font-bold">{engagement.totalShares.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ads over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ads Generated Over Time</CardTitle>
            <CardDescription>Monthly ad generation trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data yet. Generate some ads to see trends.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.5rem",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ads"
                      stroke="hsl(262, 83%, 58%)"
                      fillOpacity={1}
                      fill="url(#colorAds)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Platform distribution pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Platform Distribution</CardTitle>
            <CardDescription>Ads by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {platformDist.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No platform data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {platformDist.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.5rem",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Breakdown</CardTitle>
            <CardDescription>Recent activity by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {platformBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No activity data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.5rem",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sentiment distribution pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Feedback Sentiment</CardTitle>
            <CardDescription>Sentiment analysis from ad feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {sentimentChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No feedback data yet. Leave feedback on your ads to see sentiment analysis.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {sentimentChartData.map((_, index) => (
                        <Cell key={`sentiment-${index}`} fill={SENTIMENT_COLORS[index % SENTIMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.5rem",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emotion breakdown chart */}
      {emotionBreakdown.length > 0 && (
        <Card className="glass glow-hover">
          <CardHeader>
            <CardTitle className="text-lg">Emotion Breakdown</CardTitle>
            <CardDescription>Detected emotions in ad feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emotionBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.5rem",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {emotionBreakdown.map((entry, index) => (
                      <Cell key={`emotion-${index}`} fill={EMOTION_COLORS[entry.name.toLowerCase()] || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Your latest ad generation activity</CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.recentActivity || data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity yet.
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {item.campaign && (
                    <Badge variant="secondary">{item.campaign}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
