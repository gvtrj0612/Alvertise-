"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GeneratedAd } from "@/store/chat-store";
import { PosterPreview } from "./poster-preview";
import { VideoPreview } from "./video-preview";
import { Copy, Check, ImageIcon, FlaskConical, MessageSquare, Loader2, Video, Layers } from "lucide-react";
import toast from "react-hot-toast";

interface AdPreviewCardProps {
  ad: GeneratedAd;
  index: number;
  adId?: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
  es: "Spanish",
  fr: "French",
};

export function AdPreviewCard({ ad, index, adId }: AdPreviewCardProps) {
  const [copied, setCopied] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showPosterOnly, setShowPosterOnly] = useState(false);
  const [showVideoOnly, setShowVideoOnly] = useState(false);
  const [abLoading, setAbLoading] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const rawHashtags = ad.hashtags as unknown;
  const hashtags = Array.isArray(rawHashtags)
    ? rawHashtags
    : typeof rawHashtags === "string"
      ? rawHashtags
          .split(/[\s,]+/)
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];
  const adLanguage = ad.language || "en";

  function handleCopy() {
    const text = [
      ad.headline,
      "",
      ad.primaryText,
      "",
      ad.description,
      "",
      `CTA: ${ad.callToAction}`,
      "",
      hashtags.join(" "),
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleAbTest() {
    if (!adId) {
      toast.error("Save this ad first to create an A/B test variant.");
      return;
    }
    setAbLoading(true);
    try {
      const res = await fetch("/api/ads/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId }),
      });
      if (res.ok) {
        toast.success("A/B variant created! View it in the Ads > A/B Tests tab.");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create A/B test");
      }
    } catch {
      toast.error("Failed to create A/B test");
    } finally {
      setAbLoading(false);
    }
  }

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim()) return;
    if (!adId) {
      toast.error("Save this ad first to leave feedback.");
      return;
    }
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId, comment: feedbackText.trim() }),
      });
      if (res.ok) {
        toast.success("Feedback recorded with sentiment analysis!");
        setFeedbackSent(true);
        setShowFeedback(false);
        setFeedbackText("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit feedback.");
      }
    } catch {
      toast.error("Failed to submit feedback.");
    }
  }

  function handleGenerateMedia() {
    setShowMedia(!showMedia);
    setShowPosterOnly(false);
    setShowVideoOnly(false);
  }

  const showPoster = showMedia || showPosterOnly;
  const showVideo = showMedia || showVideoOnly;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Ad {index + 1}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {ad.platform}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {LANGUAGE_LABELS[adLanguage] || "English"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
            title="Copy ad text"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant={showMedia ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={handleGenerateMedia}
            title="Generate poster + video"
          >
            <Layers className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={showPosterOnly ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => { setShowPosterOnly(!showPosterOnly); setShowMedia(false); }}
            title="Generate poster"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={showVideoOnly ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => { setShowVideoOnly(!showVideoOnly); setShowMedia(false); }}
            title="Generate video ad"
          >
            <Video className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleAbTest}
            disabled={abLoading}
            title="Create A/B variant"
          >
            {abLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FlaskConical className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowFeedback(!showFeedback)}
            title="Leave feedback"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Ad content */}
      <div className="p-4 space-y-3">
        <h4 className="font-semibold text-base">{ad.headline}</h4>
        <p className="text-sm leading-relaxed">{ad.primaryText}</p>
        <p className="text-sm text-muted-foreground">{ad.description}</p>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-1.5 flex-wrap">
            {hashtags.map((tag, i) => (
              <span key={`${tag}-${i}`} className="text-xs text-primary font-medium">
                {tag}
              </span>
            ))}
          </div>
          <Button size="sm" className="h-7 text-xs">
            {ad.callToAction}
          </Button>
        </div>
      </div>

      {/* Feedback section */}
      {showFeedback && !feedbackSent && (
        <div className="px-4 pb-4 border-t pt-3">
          <div className="flex gap-2">
            <input
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What do you think of this ad?"
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFeedbackSubmit();
              }}
            />
            <Button size="sm" onClick={handleFeedbackSubmit} disabled={!feedbackText.trim()}>
              Send
            </Button>
          </div>
        </div>
      )}

      {/* Side-by-side media display */}
      {(showPoster || showVideo) && (
        <div className="p-4 border-t">
          <div className={`grid gap-4 ${showPoster && showVideo ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
            {showPoster && (
              <PosterPreview
                headline={ad.headline}
                primaryText={ad.primaryText}
                callToAction={ad.callToAction}
                platform={ad.platform}
                adId={adId}
              />
            )}
            {showVideo && (
              <VideoPreview
                headline={ad.headline}
                primaryText={ad.primaryText}
                callToAction={ad.callToAction}
                platform={ad.platform}
                language={adLanguage}
                adId={adId}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
