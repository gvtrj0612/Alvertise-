import ffmpeg from "fluent-ffmpeg";
import * as ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import path from "path";
import { existsSync } from "fs";

// Set FFmpeg binary path from the installer package
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TextOverlay {
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  position: "top" | "center" | "bottom";
  style?: OverlayStyle;
}

export type OverlayStyle =
  | "cinematic-lower-third"
  | "headline-center"
  | "top-banner";

interface OverlayStyleConfig {
  maxLineLength: number;
  maxLines: number;
  fontSize: number;
  lineSpacing: number;
  boxColor: string;
  boxBorderW: number;
  borderW: number;
  shadowX: number;
  shadowY: number;
}

const OVERLAY_STYLES: Record<OverlayStyle, OverlayStyleConfig> = {
  "cinematic-lower-third": {
    maxLineLength: 30,
    maxLines: 2,
    fontSize: 40,
    lineSpacing: 10,
    boxColor: "black@0.50",
    boxBorderW: 22,
    borderW: 3,
    shadowX: 2,
    shadowY: 2,
  },
  "headline-center": {
    maxLineLength: 24,
    maxLines: 2,
    fontSize: 44,
    lineSpacing: 10,
    boxColor: "black@0.42",
    boxBorderW: 20,
    borderW: 3,
    shadowX: 2,
    shadowY: 2,
  },
  "top-banner": {
    maxLineLength: 28,
    maxLines: 2,
    fontSize: 36,
    lineSpacing: 8,
    boxColor: "black@0.58",
    boxBorderW: 16,
    borderW: 2,
    shadowX: 1,
    shadowY: 1,
  },
};

function wrapOverlayText(
  text: string,
  maxLineLength = 24,
  maxLines = 2
): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLineLength) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;

    if (lines.length >= maxLines - 1) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  // Add ellipsis if text was truncated.
  if (words.join(" ").length > lines.join(" ").length && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.]+$/, "")}...`;
  }

  return lines.join("\\n");
}

function sanitizeOverlayText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
}

function escapeDrawtextText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function escapeDrawtextPath(filePath: string): string {
  return filePath.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
}

/* ------------------------------------------------------------------ */
/*  Availability check                                                 */
/* ------------------------------------------------------------------ */

export function isFFmpegAvailable(): boolean {
  try {
    return existsSync(ffmpegInstaller.path);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Mood → Music chord synthesis                                       */
/* ------------------------------------------------------------------ */

const MOOD_CHORDS: Record<string, { freqs: number[]; volume: string }> = {
  warm: { freqs: [261.63, 329.63, 392.0], volume: "0.06" }, // C major
  powerful: { freqs: [220.0, 261.63, 329.63], volume: "0.07" }, // A minor
  neutral: { freqs: [293.66, 369.99, 440.0], volume: "0.05" }, // D major
  elegant: { freqs: [246.94, 311.13, 369.99], volume: "0.05" }, // B major
  energetic: { freqs: [329.63, 415.3, 493.88], volume: "0.07" }, // E major
};

/* ------------------------------------------------------------------ */
/*  1. Concatenate video clips                                         */
/* ------------------------------------------------------------------ */

export function concatClips(
  clipPaths: string[],
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (clipPaths.length === 0) return reject(new Error("No clips to concat"));
    if (clipPaths.length === 1) {
      // Single clip — just copy
      const cmd = ffmpeg(clipPaths[0])
        .outputOptions(["-c", "copy"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err));
      cmd.run();
      return;
    }

    const cmd = ffmpeg();

    // Add each clip as an input
    clipPaths.forEach((p) => cmd.input(p));

    // Build filter_complex: scale each to 1280×720 then concat
    const filterParts: string[] = [];
    clipPaths.forEach((_, i) => {
      filterParts.push(
        `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24[v${i}]`
      );
    });
    const concatInputs = clipPaths.map((_, i) => `[v${i}]`).join("");
    filterParts.push(
      `${concatInputs}concat=n=${clipPaths.length}:v=1:a=0[outv]`
    );

    cmd
      .complexFilter(filterParts.join(";"))
      .outputOptions([
        "-map",
        "[outv]",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err));

    cmd.run();
  });
}

/* ------------------------------------------------------------------ */
/*  2. Add text overlays                                               */
/* ------------------------------------------------------------------ */

export function addTextOverlays(
  inputPath: string,
  overlays: TextOverlay[],
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (overlays.length === 0) {
      // No overlays — just copy
      const cmd = ffmpeg(inputPath)
        .outputOptions(["-c", "copy"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err));
      cmd.run();
      return;
    }

    // Try multiple font candidates so overlay rendering doesn't fail when one font is unavailable.
    const fontCandidates =
      process.platform === "win32"
        ? [
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/arial.ttf",
          ]
        : [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
          ];
    const fontPath = fontCandidates.find((f) => existsSync(f));
    if (!fontPath) {
      return reject(
        new Error(
          "overlay_font_missing: No compatible font found for FFmpeg drawtext"
        )
      );
    }

    // Build drawtext filter chain
    const drawFilters = overlays.map((o) => {
      const style = OVERLAY_STYLES[o.style || "cinematic-lower-third"];
      const sanitizedText = sanitizeOverlayText(o.text);
      const wrapped = wrapOverlayText(
        sanitizedText,
        style.maxLineLength,
        style.maxLines
      );
      if (!wrapped) {
        throw new Error("overlay_filter_invalid: Overlay text is empty after sanitization");
      }

      const escaped = escapeDrawtextText(wrapped);
      const visualLength = wrapped.replace(/\\n/g, " ").length;
      const fontSize = visualLength > style.maxLineLength ? style.fontSize - 4 : style.fontSize;
      const yPos =
        o.position === "top"
          ? "60"
          : o.position === "center"
            ? "(h-text_h)/2"
            : "h-text_h-70";

      const parts = [
        `drawtext=text='${escaped}'`,
        `fontsize=${fontSize}`,
        "fontcolor=white",
        `line_spacing=${style.lineSpacing}`,
        `borderw=${style.borderW}`,
        "bordercolor=black@0.9",
        `shadowx=${style.shadowX}`,
        `shadowy=${style.shadowY}`,
        "box=1",
        `boxcolor=${style.boxColor}`,
        `boxborderw=${style.boxBorderW}`,
        "fix_bounds=1",
        "x=(w-text_w)/2",
        `y=${yPos}`,
        `enable='between(t,${o.startTime},${o.endTime})'`,
      ];

      parts.push(`fontfile='${escapeDrawtextPath(fontPath)}'`);

      return parts.join(":");
    });

    const cmd = ffmpeg(inputPath)
      .videoFilters(drawFilters)
      .outputOptions([
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err));

    cmd.run();
  });
}

/* ------------------------------------------------------------------ */
/*  3. Generate ambient music (sine wave chords)                       */
/* ------------------------------------------------------------------ */

export function generateAmbientMusic(
  mood: string,
  durationSec: number,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check for custom music file first
    const customPath = path.join(
      process.cwd(),
      "public",
      "music",
      `${mood}.mp3`
    );
    if (existsSync(customPath)) {
      // Trim custom music to duration and lower volume
      ffmpeg(customPath)
        .duration(durationSec)
        .audioFilters([`volume=0.15`, `afade=t=in:d=1`, `afade=t=out:st=${Math.max(0, durationSec - 2)}:d=2`])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
      return;
    }

    // Synthesize ambient pad from sine wave chords
    const chord = MOOD_CHORDS[mood] || MOOD_CHORDS.neutral;
    const [f1, f2, f3] = chord.freqs;
    const vol = chord.volume;
    const fadeOut = Math.max(0, durationSec - 2);

    const cmd = ffmpeg()
      .input(`sine=frequency=${f1}:duration=${durationSec}`)
      .inputFormat("lavfi")
      .input(`sine=frequency=${f2}:duration=${durationSec}`)
      .inputFormat("lavfi")
      .input(`sine=frequency=${f3}:duration=${durationSec}`)
      .inputFormat("lavfi")
      .complexFilter([
        `[0:a]volume=${vol}[a0]`,
        `[1:a]volume=${vol}[a1]`,
        `[2:a]volume=${vol}[a2]`,
        `[a0][a1][a2]amix=inputs=3:duration=shortest,` +
          `lowpass=f=600,` +
          `afade=t=in:d=2,` +
          `afade=t=out:st=${fadeOut}:d=2,` +
          `aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=stereo[out]`,
      ])
      .outputOptions(["-map", "[out]"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err));

    cmd.run();
  });
}

/* ------------------------------------------------------------------ */
/*  4. Merge audio tracks with video                                   */
/* ------------------------------------------------------------------ */

export function mergeAudioVideo(
  videoPath: string,
  voiceoverPath: string | null,
  musicPath: string | null,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const hasVoiceover = voiceoverPath && existsSync(voiceoverPath);
    const hasMusic = musicPath && existsSync(musicPath);

    if (!hasVoiceover && !hasMusic) {
      // No audio at all — copy video as-is
      ffmpeg(videoPath)
        .outputOptions(["-c", "copy"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
      return;
    }

    const cmd = ffmpeg().input(videoPath);

    if (hasVoiceover && hasMusic) {
      // Mix voiceover + music, then merge with video
      cmd.input(voiceoverPath!);
      cmd.input(musicPath!);
      cmd.complexFilter([
        `[1:a]volume=1.0[vo]`,
        `[2:a]volume=0.15[bg]`,
        `[vo][bg]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
      ]);
      cmd.outputOptions([
        "-map",
        "0:v",
        "-map",
        "[aout]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "256k",
        "-shortest",
      ]);
    } else if (hasVoiceover) {
      // Voiceover only
      cmd.input(voiceoverPath!);
      cmd.outputOptions([
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "256k",
        "-shortest",
      ]);
    } else {
      // Music only
      cmd.input(musicPath!);
      cmd.complexFilter([`[1:a]volume=0.20[aout]`]);
      cmd.outputOptions([
        "-map",
        "0:v",
        "-map",
        "[aout]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "256k",
        "-shortest",
      ]);
    }

    cmd
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

/* ------------------------------------------------------------------ */
/*  5. Orchestrator — build the final commercial                       */
/* ------------------------------------------------------------------ */

export async function buildCommercial(
  jobDir: string,
  clipPaths: string[],
  overlays: TextOverlay[],
  voiceoverPath: string | null,
  mood: string
): Promise<string> {
  const concatOut = path.join(jobDir, "concat.mp4");
  const overlayOut = path.join(jobDir, "overlay.mp4");
  const musicOut = path.join(jobDir, "music.mp3");
  const finalOut = path.join(jobDir, "final.mp4");

  // Step 1: Concat all clips
  console.log("[ffmpeg] Concatenating clips...");
  await concatClips(clipPaths, concatOut);

  // Step 2: Add text overlays
  console.log("[ffmpeg] Adding text overlays...");
  await addTextOverlays(concatOut, overlays, overlayOut);

  // Step 3: Generate or load background music
  // Calculate total duration (roughly 5s per clip)
  const totalDuration = clipPaths.length * 5 + 2; // +2s buffer
  console.log("[ffmpeg] Generating background music...");
  try {
    await generateAmbientMusic(mood, totalDuration, musicOut);
  } catch (err) {
    console.warn("[ffmpeg] Music generation failed, proceeding without:", err);
  }

  // Step 4: Merge audio + video
  console.log("[ffmpeg] Merging audio and video...");
  const musicFile = existsSync(musicOut) ? musicOut : null;
  await mergeAudioVideo(overlayOut, voiceoverPath, musicFile, finalOut);

  console.log("[ffmpeg] Commercial build complete:", finalOut);
  return finalOut;
}
