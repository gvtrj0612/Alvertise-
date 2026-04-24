"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Grid3X3,
  List,
  Copy,
  Trash2,
  Sparkles,
  CheckCircle,
  FileEdit,
  Loader2,
  Video,
  ImageIcon,
  ThumbsUp,
  Share2,
  MessageSquare,
  Send,
  X,
  Heart,
  Download,
  RotateCcw,
  Globe,
  FlaskConical,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEngagement, useImpressionTracker } from "@/hooks/use-engagement";
import axios from "axios";
import toast from "react-hot-toast";

interface Ad {
  id: string;
  headline: string;
  primaryText: string;
  description?: string;
  callToAction?: string;
  platform: string;
  status: string;
  favorited?: boolean;
  published?: boolean;
  variant?: string;
  imageUrl?: string;
  videoUrl?: string;
  likes?: number;
  shares?: number;
  impressions?: number;
  clicks?: number;
  campaign: { name: string } | null;
  createdAt: string;
}

const statusConfig: Record<
  string,
  { label: string; icon: typeof CheckCircle; variant: "success" | "warning" | "secondary" | "destructive" }
> = {
  completed: { label: "Completed", icon: CheckCircle, variant: "success" },
  draft: { label: "Draft", icon: FileEdit, variant: "secondary" },
};

export default function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const { trackEngagement } = useEngagement();

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch("/api/ads");
      if (res.ok) {
        const data = await res.json();
        setAds(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/ads/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAds((prev) => prev.filter((a) => a.id !== id));
        toast.success("Ad deleted");
      }
    } catch {
      toast.error("Failed to delete ad");
    }
  }

  const handleToggleFavorite = useCallback(async (id: string) => {
    const ad = ads.find((a) => a.id === id);
    if (!ad) return;
    const newFavorited = !ad.favorited;
    // Optimistic update
    setAds((prev) => prev.map((a) => a.id === id ? { ...a, favorited: newFavorited } : a));
    try {
      await fetch(`/api/ads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorited: newFavorited }),
      });
      toast.success(newFavorited ? "Added to favorites" : "Removed from favorites");
    } catch {
      // Revert on failure
      setAds((prev) => prev.map((a) => a.id === id ? { ...a, favorited: !newFavorited } : a));
      toast.error("Failed to update favorite");
    }
  }, [ads]);

  const handleTogglePublish = useCallback(async (id: string) => {
    const ad = ads.find((a) => a.id === id);
    if (!ad) return;
    const newPublished = !ad.published;
    setAds((prev) => prev.map((a) => a.id === id ? { ...a, published: newPublished } : a));
    try {
      await fetch(`/api/ads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: newPublished }),
      });
      toast.success(newPublished ? "Published to gallery!" : "Removed from gallery");
    } catch {
      setAds((prev) => prev.map((a) => a.id === id ? { ...a, published: !newPublished } : a));
      toast.error("Failed to update publish status");
    }
  }, [ads]);

  const handleEngagementUpdate = useCallback((adId: string, type: "like" | "share") => {
    setAds((prev) =>
      prev.map((ad) =>
        ad.id === adId
          ? { ...ad, [type === "like" ? "likes" : "shares"]: (ad[type === "like" ? "likes" : "shares"] || 0) + 1 }
          : ad
      )
    );
  }, []);

  const handleCreateAbTest = useCallback(async (adId: string) => {
    try {
      const res = await fetch("/api/ads/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId }),
      });
      if (res.ok) {
        toast.success("A/B test variant created! Check the A/B Tests tab.");
        fetchAds();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create A/B test");
      }
    } catch {
      toast.error("Failed to create A/B test");
    }
  }, [fetchAds]);

  const filtered = ads.filter(
    (ad) =>
      ad.headline.toLowerCase().includes(search.toLowerCase()) ||
      ad.primaryText.toLowerCase().includes(search.toLowerCase()) ||
      (ad.campaign?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ads</h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage all your generated ads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/gallery">
            <Button variant="outline">
              <Globe className="mr-2 h-4 w-4" />
              Public Gallery
            </Button>
          </Link>
          <Link href="/dashboard/generate">
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate New
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs and controls */}
      <Tabs defaultValue="all">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">All ({ads.length})</TabsTrigger>
            <TabsTrigger value="favorites">
              <Heart className="h-3.5 w-3.5 mr-1" />
              Favorites ({ads.filter((a) => a.favorited).length})
            </TabsTrigger>
            <TabsTrigger value="published">
              <Globe className="h-3.5 w-3.5 mr-1" />
              Published ({ads.filter((a) => a.published).length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({ads.filter((a) => a.status === "completed").length})
            </TabsTrigger>
            <TabsTrigger value="ab-tests">
              <FlaskConical className="h-3.5 w-3.5 mr-1" />
              A/B Tests
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 sm:ml-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ads..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex border rounded-md">
              <Button
                variant={view === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-r-none"
                onClick={() => setView("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-l-none"
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value="all">
          <AdsView ads={filtered} view={view} onDelete={handleDelete} onToggleFavorite={handleToggleFavorite} onTogglePublish={handleTogglePublish} trackEngagement={trackEngagement} onEngagementUpdate={handleEngagementUpdate} onCreateAbTest={handleCreateAbTest} />
        </TabsContent>
        <TabsContent value="favorites">
          <AdsView
            ads={filtered.filter((a) => a.favorited)}
            view={view}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onTogglePublish={handleTogglePublish}
            trackEngagement={trackEngagement}
            onEngagementUpdate={handleEngagementUpdate}
            onCreateAbTest={handleCreateAbTest}
          />
        </TabsContent>
        <TabsContent value="published">
          <AdsView
            ads={filtered.filter((a) => a.published)}
            view={view}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onTogglePublish={handleTogglePublish}
            trackEngagement={trackEngagement}
            onEngagementUpdate={handleEngagementUpdate}
            onCreateAbTest={handleCreateAbTest}
          />
        </TabsContent>
        <TabsContent value="completed">
          <AdsView
            ads={filtered.filter((a) => a.status === "completed")}
            view={view}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onTogglePublish={handleTogglePublish}
            trackEngagement={trackEngagement}
            onEngagementUpdate={handleEngagementUpdate}
            onCreateAbTest={handleCreateAbTest}
          />
        </TabsContent>
        <TabsContent value="ab-tests">
          <ABTestDashboard ads={ads} onCreateAbTest={handleCreateAbTest} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdsView({
  ads,
  view,
  onDelete,
  onToggleFavorite,
  onTogglePublish,
  trackEngagement,
  onEngagementUpdate,
  onCreateAbTest,
}: {
  ads: Ad[];
  view: "grid" | "list";
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onTogglePublish: (id: string) => void;
  trackEngagement: (adId: string, type: "impression" | "click" | "like" | "share") => Promise<void>;
  onEngagementUpdate: (adId: string, type: "like" | "share") => void;
  onCreateAbTest?: (id: string) => void;
}) {
  if (ads.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No ads found</h3>
        <p className="text-muted-foreground">
          Generate your first ad to see it here
        </p>
      </Card>
    );
  }

  if (view === "list") {
    return (
      <div className="space-y-2">
        {ads.map((ad, index) => (
          <motion.div
            key={ad.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <AdListItem ad={ad} onDelete={onDelete} onToggleFavorite={onToggleFavorite} onTogglePublish={onTogglePublish} trackEngagement={trackEngagement} onEngagementUpdate={onEngagementUpdate} onCreateAbTest={onCreateAbTest} />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {ads.map((ad, index) => (
        <motion.div
          key={ad.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          whileHover={{ y: -2 }}
        >
          <AdGridCard ad={ad} onDelete={onDelete} onToggleFavorite={onToggleFavorite} onTogglePublish={onTogglePublish} trackEngagement={trackEngagement} onEngagementUpdate={onEngagementUpdate} onCreateAbTest={onCreateAbTest} />
        </motion.div>
      ))}
    </div>
  );
}

function AdGridCard({
  ad,
  onDelete,
  onToggleFavorite,
  onTogglePublish,
  trackEngagement,
  onEngagementUpdate,
  onCreateAbTest,
}: {
  ad: Ad;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onTogglePublish: (id: string) => void;
  trackEngagement: (adId: string, type: "impression" | "click" | "like" | "share") => Promise<void>;
  onEngagementUpdate: (adId: string, type: "like" | "share") => void;
  onCreateAbTest?: (id: string) => void;
}) {
  const router = useRouter();
  const [showVideo, setShowVideo] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [sentimentResult, setSentimentResult] = useState<{ sentiment: string; score: number } | null>(null);
  const [liked, setLiked] = useState(false);
  const [shared, setShared] = useState(false);

  const status = statusConfig[ad.status] || statusConfig.completed;
  const StatusIcon = status.icon;
  const campaignName = ad.campaign?.name || "No campaign";

  // Impression tracking
  const impressionRef = useImpressionTracker(ad.id, trackEngagement);

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    await trackEngagement(ad.id, "like");
    onEngagementUpdate(ad.id, "like");
  };

  const handleShare = async () => {
    if (shared) return;
    setShared(true);
    await navigator.clipboard.writeText(`${ad.headline}\n\n${ad.primaryText}`);
    await trackEngagement(ad.id, "share");
    onEngagementUpdate(ad.id, "share");
    toast.success("Ad copied & shared!");
  };

  const handleDownloadPoster = () => {
    if (!ad.imageUrl) {
      toast.error("No poster image available");
      return;
    }
    const link = document.createElement("a");
    link.href = ad.imageUrl;
    link.download = `alvertise-poster-${ad.id}.png`;
    link.click();
    toast.success("Downloading poster...");
  };

  const handleRegenerate = () => {
    const params = new URLSearchParams({ headline: ad.headline });
    router.push(`/dashboard/generate?${params.toString()}`);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackLoading(true);
    try {
      const res = await axios.post("/api/feedback", {
        adId: ad.id,
        comment: feedbackText.trim(),
      });
      setSentimentResult({ sentiment: res.data.sentiment, score: res.data.score });
      setFeedbackText("");
      toast.success("Feedback submitted!");
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const sentimentColor: Record<string, string> = {
    positive: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    neutral: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    negative: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Card ref={impressionRef} className="group flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 glass glow-hover">
      {/* Video player */}
      {showVideo && ad.videoUrl && (
        <div className="relative w-full bg-black">
          <video
            src={ad.videoUrl}
            controls
            autoPlay
            loop
            muted
            className="w-full max-h-64 object-contain"
          />
          <button
            onClick={() => setShowVideo(false)}
            className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-black/90"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Image thumbnail */}
      {!showVideo && ad.imageUrl && (
        <div className="relative w-full h-40 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.imageUrl}
            alt={ad.headline}
            className="w-full h-full object-cover"
          />
          {ad.videoUrl && (
            <button
              onClick={() => setShowVideo(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center">
                <Video className="h-6 w-6 text-black" />
              </div>
            </button>
          )}
          {ad.videoUrl && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-black/70 text-white flex items-center gap-1">
                <Video className="h-3 w-3" />
                Video
              </Badge>
            </div>
          )}
          {/* Favorite button on image */}
          <button
            onClick={() => onToggleFavorite(ad.id)}
            className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
          >
            <Heart className={`h-4 w-4 ${ad.favorited ? "fill-red-500 text-red-500" : ""}`} />
          </button>
        </div>
      )}
      {!showVideo && !ad.imageUrl && ad.videoUrl && (
        <button
          onClick={() => setShowVideo(true)}
          className="w-full h-24 bg-muted flex items-center justify-center gap-2 text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          <Video className="h-6 w-6" />
          <span className="text-sm">Play Video</span>
        </button>
      )}
      <CardContent className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Badge variant={status.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            {ad.imageUrl && !ad.videoUrl && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <ImageIcon className="h-3 w-3" />
                Poster
              </Badge>
            )}
            {ad.published && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs text-green-600 border-green-600/30">
                <Globe className="h-3 w-3" />
                Public
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="font-normal text-xs">
            {ad.platform}
          </Badge>
        </div>

        <h3 className="font-semibold mb-2 line-clamp-2">{ad.headline}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
          {ad.primaryText}
        </p>

        {/* Engagement buttons */}
        <div className="mt-3 flex items-center gap-3 text-sm">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 transition-all hover:scale-110 ${liked ? "text-blue-600" : "text-muted-foreground hover:text-blue-600"}`}
          >
            <ThumbsUp className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            <span>{(ad.likes || 0) + (liked ? 1 : 0)}</span>
          </button>
          <button
            onClick={handleShare}
            className={`flex items-center gap-1 transition-all hover:scale-110 ${shared ? "text-green-600" : "text-muted-foreground hover:text-green-600"}`}
          >
            <Share2 className={`h-4 w-4 ${shared ? "fill-current" : ""}`} />
            <span>{(ad.shares || 0) + (shared ? 1 : 0)}</span>
          </button>
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className={`flex items-center gap-1 transition-all hover:scale-110 ${showFeedback ? "text-purple-600" : "text-muted-foreground hover:text-purple-600"}`}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs">Feedback</span>
          </button>
        </div>

        {/* Feedback form */}
        {showFeedback && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Share your thoughts on this ad..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="text-sm h-8"
                onKeyDown={(e) => e.key === "Enter" && handleFeedbackSubmit()}
                disabled={feedbackLoading}
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleFeedbackSubmit}
                disabled={feedbackLoading || !feedbackText.trim()}
              >
                {feedbackLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={() => { setShowFeedback(false); setSentimentResult(null); }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {sentimentResult && (
              <div className={`text-xs px-2 py-1 rounded inline-block ${sentimentColor[sentimentResult.sentiment] || sentimentColor.neutral}`}>
                AI Sentiment: {sentimentResult.sentiment} ({Math.round(sentimentResult.score * 100)}% confidence)
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {campaignName}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Favorite */}
            {!ad.imageUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onToggleFavorite(ad.id)}
                title={ad.favorited ? "Unfavorite" : "Favorite"}
              >
                <Heart className={`h-3.5 w-3.5 ${ad.favorited ? "fill-red-500 text-red-500" : ""}`} />
              </Button>
            )}
            {/* Download poster */}
            {ad.imageUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDownloadPoster}
                title="Download poster"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}
            {/* Copy */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                navigator.clipboard.writeText(`${ad.headline}\n\n${ad.primaryText}`);
                trackEngagement(ad.id, "click");
                toast.success("Copied!");
              }}
              title="Copy ad text"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {/* Regenerate */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRegenerate}
              title="Regenerate this ad"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            {/* Publish to gallery */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${ad.published ? "text-green-600" : ""}`}
              onClick={() => onTogglePublish(ad.id)}
              title={ad.published ? "Unpublish from gallery" : "Publish to gallery"}
            >
              <Globe className={`h-3.5 w-3.5 ${ad.published ? "fill-current" : ""}`} />
            </Button>
            {/* A/B Test */}
            {onCreateAbTest && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onCreateAbTest(ad.id)}
                title="Create A/B test variant"
              >
                <FlaskConical className="h-3.5 w-3.5" />
              </Button>
            )}
            {/* Delete */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onDelete(ad.id)}
              title="Delete ad"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdListItem({
  ad,
  onDelete,
  onToggleFavorite,
  onTogglePublish,
  trackEngagement,
  onEngagementUpdate,
  onCreateAbTest,
}: {
  ad: Ad;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onTogglePublish: (id: string) => void;
  trackEngagement: (adId: string, type: "impression" | "click" | "like" | "share") => Promise<void>;
  onEngagementUpdate: (adId: string, type: "like" | "share") => void;
  onCreateAbTest?: (id: string) => void;
}) {
  const status = statusConfig[ad.status] || statusConfig.completed;
  const StatusIcon = status.icon;
  const campaignName = ad.campaign?.name || "No campaign";
  const [liked, setLiked] = useState(false);

  const impressionRef = useImpressionTracker(ad.id, trackEngagement);

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    await trackEngagement(ad.id, "like");
    onEngagementUpdate(ad.id, "like");
  };

  return (
    <Card ref={impressionRef} className="hover:shadow-md transition-all duration-200 glass glow-hover">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{ad.headline}</h3>
            <Badge variant={status.variant} className="flex items-center gap-1 shrink-0">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {ad.primaryText}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 shrink-0 text-sm text-muted-foreground">
          <Badge variant="outline" className="font-normal">
            {ad.platform}
          </Badge>
          <span>{campaignName}</span>
          <span>
            {new Date(ad.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onToggleFavorite(ad.id)}
            title={ad.favorited ? "Unfavorite" : "Favorite"}
          >
            <Heart className={`h-4 w-4 ${ad.favorited ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${liked ? "text-blue-600" : ""}`}
            onClick={handleLike}
          >
            <ThumbsUp className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              navigator.clipboard.writeText(`${ad.headline}\n\n${ad.primaryText}`);
              trackEngagement(ad.id, "click");
              toast.success("Copied!");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${ad.published ? "text-green-600" : ""}`}
            onClick={() => onTogglePublish(ad.id)}
            title={ad.published ? "Unpublish" : "Publish to gallery"}
          >
            <Globe className={`h-4 w-4 ${ad.published ? "fill-current" : ""}`} />
          </Button>
          {onCreateAbTest && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onCreateAbTest(ad.id)}
              title="Create A/B test variant"
            >
              <FlaskConical className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(ad.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── A/B Test Dashboard ──────────────────────────────────────────────

interface ABTestComparison {
  original: Ad & { ctr: string; engagementRate: string };
  variant: Ad & { ctr: string; engagementRate: string };
}

function ABTestDashboard({
  ads,
  onCreateAbTest,
}: {
  ads: Ad[];
  onCreateAbTest: (id: string) => void;
}) {
  const [comparisons, setComparisons] = useState<ABTestComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAbTests() {
      try {
        const res = await fetch("/api/ads/ab-test");
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();

        const variantA = data.filter((a: Ad) => a.variant === "A");
        const variantB = data.filter((a: Ad) => a.variant === "B");

        const pairs: ABTestComparison[] = [];
        for (const a of variantA) {
          const b = variantB.find(
            (v: Ad) =>
              v.platform === a.platform &&
              Math.abs(new Date(v.createdAt).getTime() - new Date(a.createdAt).getTime()) < 60000 * 5
          );
          if (b) {
            try {
              const cmpRes = await fetch(`/api/ads/ab-test?adId=${a.id}`);
              if (cmpRes.ok) {
                const cmpData = await cmpRes.json();
                pairs.push({
                  original: { ...a, ctr: cmpData.original?.ctr || "0", engagementRate: cmpData.original?.engagementRate || "0" },
                  variant: { ...b, ctr: cmpData.variant?.ctr || "0", engagementRate: cmpData.variant?.engagementRate || "0" },
                });
              } else {
                pairs.push({
                  original: { ...a, ctr: "0", engagementRate: "0" },
                  variant: { ...b, ctr: "0", engagementRate: "0" },
                });
              }
            } catch {
              pairs.push({
                original: { ...a, ctr: "0", engagementRate: "0" },
                variant: { ...b, ctr: "0", engagementRate: "0" },
              });
            }
          }
        }
        setComparisons(pairs);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchAbTests();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const eligibleAds = ads.filter((a) => !a.variant && a.status === "completed");

  if (comparisons.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="flex flex-col items-center justify-center py-16 text-center glass">
          <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No A/B tests yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Create an A/B test to generate an AI-powered variant of your ad and compare performance side by side.
          </p>
          {eligibleAds.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Pick an ad to test:</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {eligibleAds.slice(0, 6).map((ad) => (
                  <Button
                    key={ad.id}
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateAbTest(ad.id)}
                    className="text-xs"
                  >
                    <FlaskConical className="h-3 w-3 mr-1" />
                    {ad.headline.length > 30 ? ad.headline.slice(0, 30) + "..." : ad.headline}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comparisons.map((pair, idx) => {
        const aCtr = parseFloat(pair.original.ctr);
        const bCtr = parseFloat(pair.variant.ctr);
        const aEng = parseFloat(pair.original.engagementRate);
        const bEng = parseFloat(pair.variant.engagementRate);
        const aImpressions = pair.original.impressions || 0;
        const bImpressions = pair.variant.impressions || 0;
        const aClicks = pair.original.clicks || 0;
        const bClicks = pair.variant.clicks || 0;

        const maxCtr = Math.max(aCtr, bCtr, 0.01);
        const maxEng = Math.max(aEng, bEng, 0.01);
        const maxImp = Math.max(aImpressions, bImpressions, 1);
        const maxClk = Math.max(aClicks, bClicks, 1);

        const totalA = aCtr + aEng;
        const totalB = bCtr + bEng;
        const hasData = (aImpressions + bImpressions) > 0;
        const aWins = totalA > totalB && hasData;
        const bWins = totalB > totalA && hasData;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
          >
            <Card className="glass glow-hover overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">
                    Test #{idx + 1} &mdash; {pair.original.platform}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {new Date(pair.original.createdAt).toLocaleDateString()}
                  </Badge>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Variant A */}
                  <div className={`relative rounded-lg border p-5 space-y-4 ${aWins ? "ring-2 ring-emerald-500 border-emerald-500/30" : ""}`}>
                    {aWins && (
                      <div className="absolute -top-3 -right-3">
                        <Badge className="bg-emerald-500 text-white shadow-lg">
                          <Trophy className="h-3 w-3 mr-1" /> Winner
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600 text-white">Variant A</Badge>
                      <span className="text-xs text-muted-foreground">Original</span>
                    </div>
                    <h4 className="font-semibold text-sm line-clamp-2">{pair.original.headline}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{pair.original.primaryText}</p>
                    <div className="space-y-3 pt-2">
                      <StatBar label="CTR" value={aCtr} maxValue={maxCtr} color="blue" suffix="%" />
                      <StatBar label="Engagement" value={aEng} maxValue={maxEng} color="purple" suffix="%" />
                      <StatBar label="Impressions" value={aImpressions} maxValue={maxImp} color="amber" />
                      <StatBar label="Clicks" value={aClicks} maxValue={maxClk} color="emerald" />
                    </div>
                  </div>

                  {/* Variant B */}
                  <div className={`relative rounded-lg border p-5 space-y-4 ${bWins ? "ring-2 ring-emerald-500 border-emerald-500/30" : ""}`}>
                    {bWins && (
                      <div className="absolute -top-3 -right-3">
                        <Badge className="bg-emerald-500 text-white shadow-lg">
                          <Trophy className="h-3 w-3 mr-1" /> Winner
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-600 text-white">Variant B</Badge>
                      <span className="text-xs text-muted-foreground">AI Generated</span>
                    </div>
                    <h4 className="font-semibold text-sm line-clamp-2">{pair.variant.headline}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{pair.variant.primaryText}</p>
                    <div className="space-y-3 pt-2">
                      <StatBar label="CTR" value={bCtr} maxValue={maxCtr} color="blue" suffix="%" />
                      <StatBar label="Engagement" value={bEng} maxValue={maxEng} color="purple" suffix="%" />
                      <StatBar label="Impressions" value={bImpressions} maxValue={maxImp} color="amber" />
                      <StatBar label="Clicks" value={bClicks} maxValue={maxClk} color="emerald" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {eligibleAds.length > 0 && (
        <Card className="glass">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">Create another A/B test:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {eligibleAds.slice(0, 4).map((ad) => (
                <Button
                  key={ad.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateAbTest(ad.id)}
                  className="text-xs"
                >
                  <FlaskConical className="h-3 w-3 mr-1" />
                  {ad.headline.length > 25 ? ad.headline.slice(0, 25) + "..." : ad.headline}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBar({
  label,
  value,
  maxValue,
  color,
  suffix,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  suffix?: string;
}) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
  };

  const displayValue = suffix
    ? `${value.toFixed(2)}${suffix}`
    : value.toLocaleString();

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{displayValue}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colorClasses[color] || "bg-primary"}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
