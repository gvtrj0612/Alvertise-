"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  campaign: string | null;
  timestamp: string;
}

interface RecentActivityProps {
  activities?: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const items = activities || [];

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity. Start generating ads!
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start justify-between gap-4 pb-4 border-b last:border-0 last:pb-0"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {activity.campaign && (
                  <Badge variant="secondary" className="shrink-0">
                    {activity.campaign}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
