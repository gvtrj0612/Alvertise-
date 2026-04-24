"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  ThumbsUp,
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  Video,
  ImageIcon,
  ArrowLeft,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface GalleryFeedback {
  id: string;
  comment: string;
  sentiment?: string;
  emotion?: string;
  score?: number;
  authorName?: string;
  createdAt: string;
}

interface GalleryAd {
  id: string;
  headline: string;
  primaryText: string;
  description: string;
  callToAction: string;
  platform: string;
  hashtags: string[];
  imageUrl?: string;
  videoUrl?: string;
  likes: number;
  shares: number;
  impressions: number;
  createdAt: string;
  author: { name: string; image?: string };
  feedback: GalleryFeedback[];
}

export default function GalleryPage() {
  const [ads, setAds] = useState<GalleryAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch("/api/gallery");
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

  const filtered = ads.filter(
    (ad) =>
      ad.headline.toLowerCase().includes(search.toLowerCase()) ||
      ad.primaryText.toLowerCase().includes(search.toLowerCase()) ||
      ad.platform.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold">Alvertise</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">Gallery</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create Your Own
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold"
          >
            Community Ad Gallery
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto"
          >
            Browse ads created by the community. Like your favorites and share feedback.
          </motion.p>
        </div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-md mx-auto"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ads by headline, text, or platform..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No published ads yet</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to publish an ad to the gallery!
            </p>
            <Link href="/signup">
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                Start Creating
              </Button>
            </Link>
          </Card>
        )}

        {/* Gallery grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((ad, index) => (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -3 }}
              >
                <GalleryCard ad={ad} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back to Home</span>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Crafted with Alvertise Creative Engine
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function GalleryCard({ ad }: { ad: GalleryAd }) {
  const [liked, setLiked] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<GalleryFeedback[]>(ad.feedback);
  const [localLikes, setLocalLikes] = useState(ad.likes);

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    setLocalLikes((prev) => prev + 1);
    try {
      await fetch(`/api/gallery/${ad.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like" }),
      });
    } catch {
      setLiked(false);
      setLocalLikes((prev) => prev - 1);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackLoading(true);
    try {
      const res = await fetch(`/api/gallery/${ad.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "feedback",
          comment: feedbackText.trim(),
          authorName: authorName.trim() || "Anonymous",
        }),
      });
      if (res.ok) {
        const newFeedback = await res.json();
        setLocalFeedback((prev) => [newFeedback, ...prev]);
        setFeedbackText("");
        toast.success("Feedback submitted!");
      }
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <Card className="group flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 glass glow-hover">
      {/* Video player */}
      {showVideo && ad.videoUrl && (
        <div className="relative w-full bg-black">
          <video
            src={ad.videoUrl}
            controls
            autoPlay
            loop
            muted
            className="w-full max-h-56 object-contain"
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
        <div className="relative w-full h-44 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.imageUrl}
            alt={ad.headline}
            className="w-full h-full object-cover"
          />
          {ad.videoUrl && (
            <button
              onClick={() => setShowVideo(true)}
              className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Video className="h-3.5 w-3.5" />
              Watch Video
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
        </div>
      )}
      {!showVideo && !ad.imageUrl && ad.videoUrl && (
        <button
          onClick={() => setShowVideo(true)}
          className="w-full h-44 bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary transition-colors group/play"
        >
          <div className="h-14 w-14 rounded-full bg-primary/10 group-hover/play:bg-primary/20 flex items-center justify-center transition-colors">
            <Video className="h-7 w-7" />
          </div>
          <span className="text-sm font-medium">Watch Video Ad</span>
        </button>
      )}

      <CardContent className="p-5 flex-1 flex flex-col">
        {/* Author & platform */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium">{ad.author.name}</span>
          </div>
          <Badge variant="outline" className="text-xs font-normal">{ad.platform}</Badge>
        </div>

        {/* Content */}
        <h3 className="font-semibold mb-2 line-clamp-2">{ad.headline}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{ad.primaryText}</p>

        {/* Hashtags */}
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {ad.hashtags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs text-primary font-medium">{tag}</span>
          ))}
        </div>

        {/* Engagement */}
        <div className="mt-4 pt-3 border-t flex items-center gap-4 text-sm">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition-colors ${liked ? "text-blue-600" : "text-muted-foreground hover:text-blue-600"}`}
          >
            <ThumbsUp className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            <span>{localLikes}</span>
          </button>
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className={`flex items-center gap-1.5 transition-colors ${showFeedback ? "text-purple-600" : "text-muted-foreground hover:text-purple-600"}`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>{localFeedback.length}</span>
          </button>
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(ad.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Feedback section */}
        {showFeedback && (
          <div className="mt-3 space-y-3">
            {/* Existing feedback */}
            {localFeedback.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {localFeedback.map((fb) => (
                  <div key={fb.id} className="text-xs bg-muted/50 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium">{fb.authorName || "Anonymous"}</span>
                      {fb.sentiment && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                          fb.sentiment === "positive" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                          fb.sentiment === "negative" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                          fb.sentiment === "neutral" && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}>
                          {fb.sentiment}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground">{fb.comment}</span>
                  </div>
                ))}
              </div>
            )}

            {/* New feedback form */}
            <div className="space-y-2">
              <Input
                placeholder="Your name (optional)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="text-sm h-8"
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Share your thoughts..."
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
                  onClick={() => setShowFeedback(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
