export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  plan: "free" | "pro" | "enterprise";
  createdAt: string;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  platform: AdPlatform;
  status: AdStatus;
  imageUrl?: string;
  videoUrl?: string;
  videoStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export type AdPlatform =
  | "facebook"
  | "instagram"
  | "google"
  | "twitter"
  | "linkedin";

export type AdStatus = "draft" | "generating" | "completed" | "failed";

export interface Campaign {
  id: string;
  name: string;
  ads: Ad[];
  status: "active" | "paused" | "completed";
  createdAt: string;
}

export interface DashboardStats {
  totalAds: number;
  activeCampaigns: number;
  totalImpressions: number;
  conversionRate: number;
}

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}
