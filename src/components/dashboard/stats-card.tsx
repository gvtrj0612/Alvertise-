"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
}: StatsCardProps) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <p
                className={cn(
                  "text-xs font-medium",
                  changeType === "positive" && "text-emerald-600 dark:text-emerald-400",
                  changeType === "negative" && "text-red-600 dark:text-red-400",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
