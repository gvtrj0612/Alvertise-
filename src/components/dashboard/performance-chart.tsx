"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PerformanceChartProps {
  data?: { month: string; ads: number }[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const chartData = data || [];

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">Ad Performance</CardTitle>
        <CardDescription>
          Ads generated over the last 6 months
        </CardDescription>
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
                    <stop
                      offset="5%"
                      stopColor="hsl(262, 83%, 58%)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(262, 83%, 58%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
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
  );
}
