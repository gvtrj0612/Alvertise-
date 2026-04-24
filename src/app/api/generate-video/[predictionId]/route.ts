import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ predictionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { predictionId } = await params;

  try {
    const prediction = await replicate.predictions.get(predictionId);

    if (prediction.status === "succeeded" && prediction.output) {
      // Get the video URL from output
      const videoUrl = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;

      // Download video from Replicate's temporary URL and save locally
      const videoResponse = await fetch(videoUrl as string);
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

      const dir = path.join(process.cwd(), "public", "generated-videos");
      await mkdir(dir, { recursive: true });
      const filename = `video-${Date.now()}-${predictionId.slice(0, 8)}.mp4`;
      await writeFile(path.join(dir, filename), videoBuffer);

      const localVideoUrl = `/generated-videos/${filename}`;

      // Update database
      const ad = await prisma.ad.findFirst({
        where: { replicateId: predictionId, userId: session.user.id },
      });
      if (ad) {
        await prisma.ad.update({
          where: { id: ad.id },
          data: { videoUrl: localVideoUrl, videoStatus: "succeeded" },
        });
      }

      return NextResponse.json({
        status: "succeeded",
        videoUrl: localVideoUrl,
      });
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      // Update status in DB
      const ad = await prisma.ad.findFirst({
        where: { replicateId: predictionId, userId: session.user.id },
      });
      if (ad) {
        await prisma.ad.update({
          where: { id: ad.id },
          data: { videoStatus: "failed" },
        });
      }

      return NextResponse.json({
        status: "failed",
        error: prediction.error || "Video generation failed",
      });
    }

    // Still processing
    return NextResponse.json({
      status: prediction.status,
    });
  } catch (error: unknown) {
    console.error("Video status check error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to check video status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
