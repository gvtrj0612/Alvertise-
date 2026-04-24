import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile, writeFile, copyFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import {
  isFFmpegAvailable,
  buildCommercial,
  TextOverlay,
  OverlayStyle,
} from "@/lib/ffmpeg";

export const maxDuration = 300; // 5 minutes — FFmpeg merge can take time

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PredictionRecord {
  id: string;
  sceneIndex: number;
  status: string;
  clipPath: string | null;
}

interface SceneRecord {
  scene: number;
  name: string;
  visual_prompt: string;
  voiceover: string;
  overlay_text: string;
  overlay_position: "top" | "center" | "bottom";
}

interface JobState {
  jobId: string;
  status: string;
  createdAt: number;
  adId: string | null;
  userId: string;
  language?: string;
  optimizationProfile?: "fast" | "balanced" | "quality";
  overlayStyle?: OverlayStyle;
  script: {
    brand_mood: string;
    visual_style: string;
    full_voiceover: string;
    scenes: SceneRecord[];
  };
  predictions: PredictionRecord[];
  ttsReady: boolean;
  voiceoverPath: string;
  mergeStarted: boolean;
  finalVideoUrl: string | null;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  GET handler — poll job status                                      */
/* ------------------------------------------------------------------ */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  const jobDir = path.join(
    process.cwd(),
    "public",
    "generated-videos",
    "jobs",
    jobId
  );
  const jobPath = path.join(jobDir, "job.json");

  // Check job exists
  if (!existsSync(jobPath)) {
    return NextResponse.json(
      { error: "Video job not found" },
      { status: 404 }
    );
  }

  try {
    const job: JobState = JSON.parse(await readFile(jobPath, "utf-8"));

    // Security: verify this job belongs to the requesting user
    if (job.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Already complete — return immediately ──────────────────
    if (job.status === "succeeded") {
      return NextResponse.json({
        status: "succeeded",
        videoUrl: job.finalVideoUrl,
        language: job.language || "en",
        optimizationProfile: job.optimizationProfile || "balanced",
        script: job.script,
      });
    }
    if (job.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: job.error,
      });
    }

    // ── PHASE 1: Check all Replicate predictions ──────────────
    let allClipsDone = true;
    let anyFailed = false;

    for (const pred of job.predictions) {
      if (pred.status === "succeeded" && pred.clipPath) continue;

      try {
        const prediction = await replicate.predictions.get(pred.id);
        pred.status = prediction.status;

        if (
          prediction.status === "succeeded" &&
          prediction.output &&
          !pred.clipPath
        ) {
          // Download this clip
          const videoUrl = Array.isArray(prediction.output)
            ? prediction.output[0]
            : prediction.output;

          const clipFilename = `clip-${pred.sceneIndex}.mp4`;
          const clipPath = path.join(jobDir, clipFilename);

          const response = await fetch(videoUrl as string);
          const buffer = Buffer.from(await response.arrayBuffer());
          await writeFile(clipPath, buffer);
          pred.clipPath = clipPath;
        }

        if (
          prediction.status === "failed" ||
          prediction.status === "canceled"
        ) {
          anyFailed = true;
        }

        if (prediction.status !== "succeeded") {
          allClipsDone = false;
        }
      } catch (err) {
        console.error(
          `[job ${jobId}] Failed to check prediction ${pred.id}:`,
          err
        );
        allClipsDone = false;
      }
    }

    // Count completed clips for progress reporting
    const clipsCompleted = job.predictions.filter(
      (p) => p.status === "succeeded" && p.clipPath
    ).length;
    const totalClips = job.predictions.length;

    if (anyFailed) {
      job.status = "failed";
      job.error = "One or more scene clips failed to render";
      await writeFile(jobPath, JSON.stringify(job, null, 2));
      return NextResponse.json({
        status: "failed",
        error: job.error,
        clipsCompleted,
        totalClips,
      });
    }

    // ── PHASE 2: All clips done — start merge ────────────────
    if (allClipsDone && !job.mergeStarted) {
      job.mergeStarted = true;
      job.status = "merging";
      await writeFile(jobPath, JSON.stringify(job, null, 2));

      try {
        if (!isFFmpegAvailable()) {
          // FALLBACK: No FFmpeg — return first clip only
          console.warn(
            `[job ${jobId}] FFmpeg not available, returning first clip as fallback`
          );
          const firstClipPath = `/generated-videos/jobs/${jobId}/clip-0.mp4`;
          job.status = "succeeded";
          job.finalVideoUrl = firstClipPath;
          await writeFile(jobPath, JSON.stringify(job, null, 2));

          if (job.adId) {
            await prisma.ad.update({
              where: { id: job.adId },
              data: {
                videoUrl: firstClipPath,
                videoStatus: "succeeded",
              },
            });
          }

          return NextResponse.json({
            status: "succeeded",
            videoUrl: firstClipPath,
            fallback: true,
            language: job.language || "en",
            optimizationProfile: job.optimizationProfile || "balanced",
            message: "FFmpeg not available — returned first scene only",
            script: job.script,
          });
        }

        // Build text overlays from script
        const overlays: TextOverlay[] = job.script.scenes
          .filter(
            (s) =>
              s.overlay_text && s.overlay_text.trim().length > 0
          )
          .map((s) => ({
            text: s.overlay_text,
            startTime: (s.scene - 1) * 5, // each scene is ~5 seconds
            endTime: s.scene * 5,
            position: s.overlay_position || "bottom",
            style: job.overlayStyle || "cinematic-lower-third",
          }));

        // Sort clips by scene index
        const clipPaths = job.predictions
          .sort((a, b) => a.sceneIndex - b.sceneIndex)
          .map((p) => p.clipPath!)
          .filter(Boolean);

        // Check TTS availability (file existence = TTS done, avoids race condition)
        const voiceoverPath = existsSync(job.voiceoverPath)
          ? job.voiceoverPath
          : null;

        // Run FFmpeg pipeline
        const finalPath = await buildCommercial(
          jobDir,
          clipPaths,
          overlays,
          voiceoverPath,
          job.script.brand_mood || "neutral"
        );

        // Copy final output to main generated-videos directory
        const finalFilename = `commercial-${Date.now()}-${jobId.slice(0, 8)}.mp4`;
        const publicPath = path.join(
          process.cwd(),
          "public",
          "generated-videos",
          finalFilename
        );
        await copyFile(finalPath, publicPath);

        const finalUrl = `/generated-videos/${finalFilename}`;
        job.status = "succeeded";
        job.finalVideoUrl = finalUrl;
        await writeFile(jobPath, JSON.stringify(job, null, 2));

        // Update Ad record
        if (job.adId) {
          await prisma.ad.update({
            where: { id: job.adId },
            data: {
              videoUrl: finalUrl,
              videoStatus: "succeeded",
            },
          });
        }

        return NextResponse.json({
          status: "succeeded",
          videoUrl: finalUrl,
          language: job.language || "en",
          optimizationProfile: job.optimizationProfile || "balanced",
          script: job.script,
        });
      } catch (mergeError) {
        console.error(`[job ${jobId}] FFmpeg merge failed:`, mergeError);
        // Fallback: return first clip
        const firstClipPath = `/generated-videos/jobs/${jobId}/clip-0.mp4`;
        job.status = "succeeded";
        job.finalVideoUrl = firstClipPath;
        job.error = "Merge failed, returning first scene";
        await writeFile(jobPath, JSON.stringify(job, null, 2));

        if (job.adId) {
          await prisma.ad.update({
            where: { id: job.adId },
            data: {
              videoUrl: firstClipPath,
              videoStatus: "succeeded",
            },
          });
        }

        return NextResponse.json({
          status: "succeeded",
          videoUrl: firstClipPath,
          fallback: true,
          language: job.language || "en",
          optimizationProfile: job.optimizationProfile || "balanced",
          message: "FFmpeg merge failed — returned first scene",
          script: job.script,
        });
      }
    }

    // ── Still processing — save state and return progress ─────
    await writeFile(jobPath, JSON.stringify(job, null, 2));

    return NextResponse.json({
      status: job.status,
      clipsCompleted,
      totalClips,
      ttsReady: existsSync(job.voiceoverPath),
      language: job.language || "en",
      optimizationProfile: job.optimizationProfile || "balanced",
      script: job.script,
    });
  } catch (error: unknown) {
    console.error(`[job ${jobId}] Status check error:`, error);
    const message =
      error instanceof Error ? error.message : "Failed to check job status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
