"use client";

import { useState, useEffect } from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { Button } from "@/components/ui/button";
import {
  Image,
  FolderOpen,
  Eye,
  TrendingUp,
  Sparkles,
  Plus,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  stats: {
    totalAds: number;
    activeCampaigns: number;
    totalCampaigns: number;
    conversionRate: string;
  };
  chartData: { month: string; ads: number }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    campaign: string | null;
    timestamp: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your ad generation activity
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/campaigns/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </Link>
          <Link href="/dashboard/generate">
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Ad
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Ads"
          value={String(stats?.totalAds ?? 0)}
          icon={Image}
        />
        <StatsCard
          title="Active Campaigns"
          value={String(stats?.activeCampaigns ?? 0)}
          icon={FolderOpen}
        />
        <StatsCard
          title="Total Campaigns"
          value={String(stats?.totalCampaigns ?? 0)}
          icon={Eye}
        />
        <StatsCard
          title="Conversion Rate"
          value={stats?.conversionRate ?? "0%"}
          icon={TrendingUp}
        />
      </div>

      {/* Charts and activity */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PerformanceChart data={data?.chartData} />
        </div>
        <div className="lg:col-span-2">
          <RecentActivity activities={data?.recentActivity} />
        </div>
      </div>
    </div>
  );
}
