"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Download,
  Loader2,
  Video,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Film,
  AlertCircle,
  Music,
  Mic,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";

interface VideoPreviewProps {
  headline: string;
  primaryText: string;
  callToAction: string;
  platform: string;
  theme?: string;
  colorPalette?: string;
  audience?: string;
  language?: string;
  adId?: string;
}

type GenerationStep =
  | "idle"
  | "script"
  | "clips-rendering"
  | "merging"
  | "succeeded"
  | "failed";

type OptimizationProfile = "fast" | "balanced" | "quality";

interface SceneInfo {
  scene: number;
  name: string;
  voiceover: string;
  overlay_text: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
  es: "Spanish",
  fr: "French",
};

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "kn", label: "Kannada" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
] as const;

const STEP_LABELS: Record<GenerationStep, string> = {
  idle: "",
  script: "Writing commercial script with AI...",
  "clips-rendering": "Rendering scenes with queue-safe scheduling on Wan 2.6...",
  merging: "Merging clips, adding voiceover and sound design...",
  succeeded: "Commercial video generated!",
  failed: "Video generation failed",
};

export function VideoPreview({
  headline,
  primaryText,
  callToAction,
  platform,
  theme,
  colorPalette,
  audience,
  language,
  adId,
}: VideoPreviewProps) {
  const [step, setStep] = useState<GenerationStep>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [script, setScript] = useState<{
    brand_mood?: string;
    scenes?: SceneInfo[];
  } | null>(null);
  const [clipsCompleted, setClipsCompleted] = useState(0);
  const [totalClips, setTotalClips] = useState(4);
  const [ttsReady, setTtsReady] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [videoLanguage, setVideoLanguage] = useState<string>(language || "en");
  const [optimizationProfile, setOptimizationProfile] =
    useState<OptimizationProfile>("quality");
  const [resolvedLanguage, setResolvedLanguage] = useState<string>(language || "en");
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const initialLanguage = language || "en";
    setVideoLanguage(initialLanguage);
    setResolvedLanguage(initialLanguage);
  }, [language]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  async function startGeneration() {
    setStep("script");
    setProgress(5);
    setErrorMessage(null);
    setScript(null);
    setClipsCompleted(0);
    setTtsReady(false);
    setShowScript(false);

    try {
      // Step 1: POST to generate-video — gets jobId + commercial script
      setProgress(8);

      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          primaryText,
          callToAction,
          platform,
          theme,
          colorPalette,
          audience,
          language: videoLanguage,
          adId,
          optimizationProfile,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start video generation");
      }

      const { jobId, script: returnedScript, sceneCount, language: apiLanguage } = await res.json();

      setScript(returnedScript);
      setResolvedLanguage(apiLanguage || videoLanguage || language || "en");
      setTotalClips(sceneCount || 4);
      setStep("clips-rendering");
      setProgress(15);

      // Step 2: Poll the job status endpoint
      startPolling(jobId);
    } catch (err) {
      setStep("failed");
      const msg =
        err instanceof Error ? err.message : "Failed to generate video";
      setErrorMessage(msg);
      toast.error(msg);
    }
  }

  function startPolling(jobId: string) {
    let pollCount = 0;

    pollIntervalRef.current = setInterval(async () => {
      pollCount++;

      try {
        const res = await fetch(`/api/generate-video/status/${jobId}`);
        const data = await res.json();

        if (data.status === "succeeded") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setVideoUrl(data.videoUrl);
          if (data.language) setResolvedLanguage(data.language);
          setStep("succeeded");
          setProgress(100);
          setClipsCompleted(totalClips);
          if (data.fallback) {
            toast.success("Video generated (single scene — FFmpeg unavailable)");
          } else {
            toast.success("Commercial video generated successfully!");
          }
        } else if (data.status === "merging") {
          setStep("merging");
          setProgress(85);
          if (data.language) setResolvedLanguage(data.language);
          if (data.clipsCompleted) setClipsCompleted(data.clipsCompleted);
          if (data.totalClips) setTotalClips(data.totalClips);
          if (data.ttsReady) setTtsReady(true);
        } else if (data.status === "failed") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setStep("failed");
          setErrorMessage(data.error || "Video generation failed");
          toast.error(data.error || "Video generation failed");
        } else {
          // Still processing clips
          if (data.language) setResolvedLanguage(data.language);
          if (data.clipsCompleted !== undefined) {
            setClipsCompleted(data.clipsCompleted);
            const clips = data.totalClips || totalClips;
            setTotalClips(clips);
            const clipProgress = data.clipsCompleted / clips;
            setProgress(Math.round(15 + clipProgress * 65)); // 15% → 80%
          } else {
            // Smooth progress with no clip data
            const newProgress = Math.min(15 + pollCount * 2, 80);
            setProgress(newProgress);
          }
          if (data.ttsReady) setTtsReady(true);
          if (data.script) setScript(data.script);
        }
      } catch {
        // Network error — keep polling, don't fail immediately
      }

      // Safety: stop after 7.5 minutes (90 polls × 5s)
      if (pollCount >= 90) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setStep("failed");
        setErrorMessage(
          "Video generation timed out after 7.5 minutes. Please try again."
        );
        toast.error("Video generation timed out. Please try again.");
      }
    }, 5000);
  }

  function downloadVideo() {
    if (!videoUrl) return;
    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = `alvertise-commercial-${Date.now()}.mp4`;
    link.click();
  }

  function reset() {
    setStep("idle");
    setProgress(0);
    setVideoUrl(null);
    setScript(null);
    setErrorMessage(null);
    setClipsCompleted(0);
    setTtsReady(false);
    setShowScript(false);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  }

  // ── IDLE state — show generate button ──
  if (step === "idle") {
    return (
      <Card className="border-cyan-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.15)]">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-cyan-400/15 ring-1 ring-cyan-300/40 flex items-center justify-center shadow-[0_0_24px_rgba(34,211,238,0.35)]">
            <Video className="h-8 w-8 text-cyan-300" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-cyan-100 tracking-wide">Generate Cinematic Video</p>
            <p className="text-sm text-slate-300">
              Creates a multi-scene commercial with voiceover, music, and cinematic visuals
            </p>
            <p className="text-xs text-cyan-200/80">
              Voice language: {LANGUAGE_LABELS[resolvedLanguage] || "English"}
            </p>
          </div>
          <Button
            onClick={startGeneration}
            size="lg"
            className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold shadow-[0_0_20px_rgba(34,211,238,0.45)]"
          >
            <Video className="mr-2 h-4 w-4" />
            Generate Video Ad
          </Button>
          <div className="w-full max-w-xs space-y-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Choose video language
              </label>
              <select
                value={videoLanguage}
                onChange={(e) => {
                  const nextLanguage = e.target.value;
                  setVideoLanguage(nextLanguage);
                  setResolvedLanguage(nextLanguage);
                }}
                className="w-full rounded-md border border-cyan-400/30 bg-slate-900/70 text-slate-100 px-3 py-2 text-sm"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Optimization profile
              </label>
              <select
                value={optimizationProfile}
                onChange={(e) =>
                  setOptimizationProfile(e.target.value as OptimizationProfile)
                }
                className="w-full rounded-md border border-cyan-400/30 bg-slate-900/70 text-slate-100 px-3 py-2 text-sm"
              >
                <option value="fast">Fast (quick preview)</option>
                <option value="balanced">Balanced (default)</option>
                <option value="quality">Quality (slower, better motion)</option>
              </select>
            </div>

          </div>
          <p className="text-xs text-slate-400 text-center">
            Takes 3-5 minutes &middot; 4 scenes &middot; Creative Engine + TTS + FFmpeg
          </p>
          <p className="text-[11px] text-cyan-200/80 text-center max-w-xs">
            Current mode: queue-safe staggered rendering. Parallel mode can be
            enabled for faster scene submission when throughput allows.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── SUCCESS state — show video player ──
  if (step === "succeeded" && videoUrl) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>AI Commercial Ad</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {LANGUAGE_LABELS[resolvedLanguage] || "English"}
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                New
              </Button>
              <Button size="sm" onClick={downloadVideo}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              loop
              className="w-full max-w-md rounded-lg shadow-lg"
            />
          </div>

          {/* Script preview toggle */}
          {script?.scenes && (
            <button
              onClick={() => setShowScript(!showScript)}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg bg-muted/50"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Commercial Script ({script.scenes.length} scenes)
              </span>
              {showScript ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}

          {showScript && script?.scenes && (
            <div className="rounded-lg bg-muted/30 border p-3 space-y-3">
              {script.scenes.map((scene) => (
                <div key={scene.scene} className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">
                    Scene {scene.scene}: {scene.name}
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    &ldquo;{scene.voiceover}&rdquo;
                  </p>
                  {scene.overlay_text && (
                    <p className="text-xs text-primary font-medium">
                      [{scene.overlay_text}]
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── FAILED state ──
  if (step === "failed") {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-medium">Video Generation Failed</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              {errorMessage ||
                "Something went wrong. Please check your API keys and try again."}
            </p>
          </div>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── GENERATING states — show multi-stage progress ──
  return (
    <Card className="border-cyan-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.12)]">
      <CardContent className="p-6 space-y-6">
        {/* Pipeline step indicators */}
        <div className="space-y-4">
          <StepIndicator
            icon={Sparkles}
            label="Write commercial script"
            status={
              step === "script"
                ? "active"
                : ["clips-rendering", "merging", "succeeded"].includes(step)
                  ? "done"
                  : "pending"
            }
          />
          <StepIndicator
            icon={Film}
            label={`Render ${totalClips} scenes`}
            status={
              step === "clips-rendering"
                ? "active"
                : ["merging", "succeeded"].includes(step)
                  ? "done"
                  : "pending"
            }
          />
          <StepIndicator
            icon={Mic}
            label="Generate voiceover narration"
            status={ttsReady ? "done" : step === "script" ? "pending" : "active"}
          />
          <StepIndicator
            icon={Music}
            label="Add music & voiceover mix"
            status={
              step === "merging"
                ? "active"
                : step === "succeeded"
                  ? "done"
                  : "pending"
            }
          />
          <StepIndicator
            icon={Download}
            label="Merge final commercial"
            status={
              step === "merging"
                ? "active"
                : step === "succeeded"
                  ? "done"
                  : "pending"
            }
          />
        </div>

        {/* Per-scene progress bars (during clips-rendering) */}
        {step === "clips-rendering" && totalClips > 0 && (
          <div className="space-y-2 rounded-lg bg-slate-900/70 border border-cyan-400/20 p-3">
            <p className="text-xs font-medium text-cyan-200 mb-2">
              Scene rendering progress
            </p>
            {Array.from({ length: totalClips }).map((_, i) => {
              const sceneStatus =
                i < clipsCompleted ? "done" : i === clipsCompleted ? "active" : "pending";
              const sceneName = script?.scenes?.[i]?.name || `Scene ${i + 1}`;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs w-28 truncate text-slate-300">
                    {sceneName}
                  </span>
                  <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        sceneStatus === "done"
                          ? "bg-emerald-500 w-full"
                          : sceneStatus === "active"
                            ? "bg-cyan-400 w-3/4 animate-pulse"
                            : "bg-slate-600/40 w-0"
                      }`}
                    />
                  </div>
                  {sceneStatus === "done" && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  )}
                  {sceneStatus === "active" && (
                    <Loader2 className="h-3 w-3 text-cyan-300 animate-spin shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Overall progress bar */}
        <div className="space-y-2">
          <div className="w-full bg-slate-800 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-cyan-400 to-fuchsia-400 h-2.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-300">
              {STEP_LABELS[step]}
            </p>
            <p className="text-xs font-medium text-cyan-200">
              {progress}%
            </p>
          </div>
        </div>

        {/* Script preview during generation */}
        {script?.scenes && (
          <div className="rounded-lg bg-slate-900/70 border border-fuchsia-400/20 p-3 space-y-2">
            <p className="text-xs font-medium text-fuchsia-200 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Commercial Script
            </p>
            {script.scenes.map((scene) => (
              <div key={scene.scene} className="text-xs text-slate-300">
                <span className="font-medium text-cyan-200">
                  Scene {scene.scene}:
                </span>{" "}
                {scene.voiceover}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-400 text-center">
          Please wait, do not close this page. Multi-scene commercial generation
          takes 3-5 minutes.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Step indicator sub-component                                       */
/* ------------------------------------------------------------------ */

function StepIndicator({
  icon: Icon,
  label,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  status: "pending" | "active" | "done";
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          status === "done"
            ? "bg-emerald-500/20"
            : status === "active"
              ? "bg-primary/20"
              : "bg-muted"
        }`}
      >
        {status === "done" ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : status === "active" ? (
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        ) : (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <span
        className={`text-sm ${
          status === "done"
            ? "text-emerald-600 dark:text-emerald-400"
            : status === "active"
              ? "text-foreground font-medium"
              : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
