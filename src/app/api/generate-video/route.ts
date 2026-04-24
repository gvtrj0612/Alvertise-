import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { buildOptimizationSignals } from "@/lib/optimization-learning";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

type OverlayStyle = "cinematic-lower-third" | "headline-center" | "top-banner";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 300; // 5 minutes — needed for multi-scene generation

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
  es: "Spanish",
  fr: "French",
};

const SUPPORTED_LANGUAGES = new Set(Object.keys(LANGUAGE_NAMES));

/* ------------------------------------------------------------------ */
/*  Voice selection by brand mood                                      */
/* ------------------------------------------------------------------ */

const MOOD_TO_VOICE: Record<string, string> = {
  warm: "nova",
  powerful: "onyx",
  neutral: "alloy",
  elegant: "shimmer",
  energetic: "nova",
};

/* ------------------------------------------------------------------ */
/*  Commercial Script Generator — single LLM call                     */
/* ------------------------------------------------------------------ */

const COMMERCIAL_SCRIPT_SYSTEM = `You are a senior creative director at a world-class advertising agency (Wieden+Kennedy, Ogilvy, BBDO).

Your job: Given a product/brand and its ad copy, create a COMPLETE COMMERCIAL SCRIPT with 4 scenes and narration only. The video itself must stay free of on-screen captions.

Good ads focus on HUMAN EMOTION + PRODUCT BENEFIT:
- Nike ads → motivation, determination, triumph
- Coca-Cola ads → happiness, togetherness, refreshment
- Chyawanprash ads → family care, immunity, warmth
- Apple ads → creativity, simplicity, wonder
- BMW ads → freedom, precision, confidence

COMMERCIAL STRUCTURE (4 scenes, ~5 seconds each, ~20 seconds total):

SCENE 1 — HOOK (5 seconds):
Grab attention with an emotionally engaging opening moment.
Examples: athlete tying shoes at sunrise, mother preparing breakfast, rain hitting a window.

SCENE 2 — STORY / PROBLEM (5 seconds):
Show a relatable human situation or need where the product naturally fits.
Show the desire or aspiration — NOT the product yet.

SCENE 3 — PRODUCT REVEAL / SOLUTION (5 seconds):
Dramatic cinematic product shot showing how it answers the need from Scene 2.
Glossy reflections, depth of field, premium lighting, macro details.

SCENE 4 — EMOTIONAL CLOSE / CTA (5 seconds):
Final aspirational moment with brand feeling and call to action.
Product visible but focus on EMOTION and transformation.

For EACH scene provide THREE things:
1. visual_prompt — A detailed 60-80 word cinematic description for AI video generation (NO text/titles/logos visible in the video)
2. voiceover — Narration text to be spoken during this scene (1-2 sentences, natural speaking pace for 5 seconds)
3. overlay_text — Always use "". The commercial must rely on visuals, music, and voiceover rather than on-screen captions.

Respond in EXACTLY this JSON format:
{
  "brand_mood": "<warm|powerful|neutral|elegant|energetic>",
  "visual_style": "<overall cinematic style description>",
  "full_voiceover": "<complete narration combining all scenes into one flowing paragraph, for TTS generation>",
  "scenes": [
    {
      "scene": 1,
      "name": "Hook",
      "visual_prompt": "<60-80 word cinematic prompt for T2V model — pure visuals, NO text on screen>",
      "voiceover": "<narration for this scene only>",
      "overlay_text": "<short text or empty string>",
      "overlay_position": "<top|center|bottom>"
    },
    {
      "scene": 2,
      "name": "Story",
      "visual_prompt": "...",
      "voiceover": "...",
      "overlay_text": "",
      "overlay_position": "bottom"
    },
    {
      "scene": 3,
      "name": "Product Reveal",
      "visual_prompt": "...",
      "voiceover": "...",
      "overlay_text": "<product name or benefit>",
      "overlay_position": "bottom"
    },
    {
      "scene": 4,
      "name": "Emotional Close",
      "visual_prompt": "...",
      "voiceover": "...",
      "overlay_text": "<CTA or tagline>",
      "overlay_position": "center"
    }
  ]
}

RULES:
- Describe people abstractly: silhouetted figures, close-up of hands, out-of-focus profiles — never specific faces
- Each scene must have clear MOTION and ACTION — no static poses
- visual_prompt must NEVER mention any text, titles, logos, or words appearing on screen
- The voiceover must flow naturally when all scenes are combined in full_voiceover
- overlay_text must be empty for every scene.
- brand_mood must be exactly one of: warm, powerful, neutral, elegant, energetic
- Match cultural context to the target audience and region
- Each visual_prompt should describe CINEMATIC camera work: dolly, tracking, crane, steadicam, macro
- Include lighting details: golden hour, dramatic rim light, soft diffused, warm interior
- Include textures: condensation drops, soft fabric, polished glass, dewy skin
- IMPORTANT: voiceover and full_voiceover MUST be written in the user-requested language only. overlay_text must stay empty.`;

/* ------------------------------------------------------------------ */
/*  Negative prompt for T2V model                                      */
/* ------------------------------------------------------------------ */

const NEGATIVE_PROMPT =
  "static image, still photo, poster, slideshow, text, watermark, logo, subtitle, caption, title card, " +
  "motion graphics, lower third, deformed, disfigured, bad anatomy, low resolution, pixelated, grainy, " +
  "overexposed, underexposed, jerky motion, glitch, artifacts, ugly, amateur, flat lighting, washed out colors, " +
  "no motion, frozen frame, stock photo, clip art, cartoon, anime, 3d render";

type OptimizationProfile = "fast" | "balanced" | "quality";

interface RenderProfileConfig {
  maxArea: "480p" | "720p";
  numFrames: number;
  staggerDelayMs: number;
  maxRetries: number;
  scriptTemperature: number;
  scriptMaxTokens: number;
}

type SceneScript = {
  scene: number;
  name: string;
  visual_prompt: string;
  voiceover: string;
  overlay_text: string;
  overlay_position: "top" | "center" | "bottom";
};

type CommercialScript = {
  brand_mood: "warm" | "powerful" | "neutral" | "elegant" | "energetic";
  visual_style: string;
  full_voiceover: string;
  scenes: SceneScript[];
};

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function applyMinimalOverlayPolicy(
  script: CommercialScript
): CommercialScript {
  const scenes = script.scenes.map((scene) => ({
    ...scene,
    overlay_text: "",
  }));

  return {
    ...script,
    scenes,
  };
}

const RENDER_PROFILES: Record<OptimizationProfile, RenderProfileConfig> = {
  fast: {
    maxArea: "480p",
    numFrames: 49,
    staggerDelayMs: 7000,
    maxRetries: 2,
    scriptTemperature: 0.7,
    scriptMaxTokens: 900,
  },
  balanced: {
    maxArea: "720p",
    numFrames: 81,
    staggerDelayMs: 12000,
    maxRetries: 3,
    scriptTemperature: 0.8,
    scriptMaxTokens: 1200,
  },
  quality: {
    maxArea: "720p",
    numFrames: 121,
    staggerDelayMs: 14000,
    maxRetries: 4,
    scriptTemperature: 0.9,
    scriptMaxTokens: 1600,
  },
};

/* ------------------------------------------------------------------ */
/*  Staggered Replicate prediction creation (rate-limit safe)          */
/* ------------------------------------------------------------------ */

async function createPredictionWithRetry(
  prompt: string,
  renderConfig: RenderProfileConfig,
  maxRetries = 3
): Promise<{ id: string; status: string }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await replicate.predictions.create({
        model: "wan-video/wan-2.6-t2v",
        input: {
          prompt,
          negative_prompt: NEGATIVE_PROMPT,
          max_area: renderConfig.maxArea,
          num_frames: renderConfig.numFrames,
        },
      });
    } catch (err: unknown) {
      const is429 =
        err instanceof Error && err.message?.includes("429");
      if (is429 && attempt < maxRetries - 1) {
        // Wait for rate limit reset (Replicate returns retry_after in seconds)
        const waitMs = (attempt + 1) * 12000; // 12s, 24s, 36s
        console.log(
          `[generate-video] Rate limited, waiting ${waitMs / 1000}s before retry ${attempt + 2}/${maxRetries}`
        );
        await new Promise((r) => setTimeout(r, waitMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Failed to create prediction after retries");
}

/* ------------------------------------------------------------------ */
/*  Background TTS generation (fire-and-forget)                        */
/* ------------------------------------------------------------------ */

async function generateVoiceover(
  text: string,
  voice: string,
  jobDir: string
): Promise<void> {
  const cleanText = text.replace(/\s+/g, " ").trim();
  if (!cleanText) {
    console.warn("[generate-video] Skipping TTS because no narration text was provided");
    return;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
        input: cleanText,
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(path.join(jobDir, "voiceover.mp3"), buffer);
      console.log("[generate-video] Voiceover generated successfully");
      return;
    } catch (err) {
      const isLastAttempt = attempt === 3;
      console.error(
        `[generate-video] TTS generation failed (attempt ${attempt}/3):`,
        err
      );
      if (isLastAttempt) {
        // Job continues without voiceover — merge step checks file existence
        return;
      }
      await new Promise((r) => setTimeout(r, attempt * 1200));
    }
  }
}

function hasScriptForLanguage(text: string, languageCode: string): boolean {
  if (!text.trim()) return false;

  // Devanagari
  if (languageCode === "hi") {
    return /[\u0900-\u097F]/.test(text);
  }

  // Kannada
  if (languageCode === "kn") {
    return /[\u0C80-\u0CFF]/.test(text);
  }

  // For Latin-script languages (en/es/fr), presence of text is sufficient.
  return true;
}

async function resolveRequestedLanguage(
  language: string | undefined,
  adId: string | undefined,
  userId: string
): Promise<string> {
  if (language && SUPPORTED_LANGUAGES.has(language)) {
    return language;
  }

  if (adId) {
    const ad = await prisma.ad.findFirst({
      where: { id: adId, userId },
      select: { language: true },
    });
    if (ad?.language && SUPPORTED_LANGUAGES.has(ad.language)) {
      return ad.language;
    }
  }

  return "en";
}

async function enforceScriptLanguage(
  script: CommercialScript,
  languageCode: string,
  langName: string
): Promise<CommercialScript | null> {
  if (languageCode === "en") return script;

  const translationPrompt = `You are a precise translator for advertising content.
Translate ONLY the text fields to ${langName}.
Do not change JSON keys, scene order, brand mood, visual prompts, numbers, or structure.
Keep marketing tone natural and fluent for ${langName} audiences.

Return ONLY valid JSON in this exact schema:
{
  "brand_mood": "<warm|powerful|neutral|elegant|energetic>",
  "visual_style": "<string>",
  "full_voiceover": "<string in ${langName}>",
  "scenes": [
    {
      "scene": 1,
      "name": "<translated>",
      "visual_prompt": "<keep exactly same as input>",
      "voiceover": "<translated>",
      "overlay_text": "<translated>",
      "overlay_position": "top|center|bottom"
    }
  ]
}`;

  const translated = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 1600,
    messages: [
      { role: "system", content: translationPrompt },
      { role: "user", content: JSON.stringify(script) },
    ],
    response_format: { type: "json_object" },
  });

  const translatedRaw = translated.choices[0]?.message?.content?.trim();
  if (!translatedRaw) {
    return null;
  }

  const translatedScript = JSON.parse(translatedRaw) as CommercialScript;
  if (!translatedScript?.scenes?.length) {
    return null;
  }

  // Safety: always preserve visual prompts from the original script.
  translatedScript.scenes = translatedScript.scenes.map((scene, index) => ({
    ...scene,
    visual_prompt: script.scenes[index]?.visual_prompt || scene.visual_prompt,
  }));

  const narration = [
    translatedScript.full_voiceover,
    ...translatedScript.scenes.map((s) => `${s.voiceover || ""} ${s.overlay_text || ""}`),
  ]
    .join(" ")
    .trim();

  if (!hasScriptForLanguage(narration, languageCode)) {
    return null;
  }

  // Additional strictness for Latin-script targets to avoid silent fallback to English.
  if (languageCode === "es" || languageCode === "fr") {
    const original = normalizeForComparison(script.full_voiceover || "");
    const translatedNarration = normalizeForComparison(
      translatedScript.full_voiceover || ""
    );
    if (translatedNarration.length > 0 && translatedNarration === original) {
      return null;
    }
  }

  return translatedScript;
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  // Check API keys
  if (
    !process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY === "sk-proj-paste-your-key-here"
  ) {
    return NextResponse.json(
      {
        error:
          "OpenAI API key not configured. Add your OPENAI_API_KEY to .env.local",
      },
      { status: 503 }
    );
  }
  if (
    !process.env.REPLICATE_API_TOKEN ||
    process.env.REPLICATE_API_TOKEN === "r8_paste-your-token-here"
  ) {
    return NextResponse.json(
      {
        error:
          "Replicate API token not configured. Add your REPLICATE_API_TOKEN to .env.local",
      },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const { success, response: rateLimitResponse } = rateLimit(ip, "video");
  if (!success) return rateLimitResponse!;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      headline,
      primaryText,
      callToAction,
      platform,
      theme,
      colorPalette,
      audience,
      language,
      adId,
      optimizationProfile,
      overlayStyle,
    } = await request.json();

    const optimization = await buildOptimizationSignals(session.user.id);

    if (!headline) {
      return NextResponse.json(
        { error: "Headline is required" },
        { status: 400 }
      );
    }

    const requestedLanguage = await resolveRequestedLanguage(
      language,
      adId,
      session.user.id
    );
    const langName = LANGUAGE_NAMES[requestedLanguage] || "English";
    const requestedProfile =
      optimizationProfile === "fast" ||
      optimizationProfile === "balanced" ||
      optimizationProfile === "quality"
        ? (optimizationProfile as OptimizationProfile)
        : (optimization.recommended.videoProfile || "quality");
    const renderConfig = RENDER_PROFILES[requestedProfile];
    const selectedOverlayStyle: OverlayStyle =
      overlayStyle === "headline-center" || overlayStyle === "top-banner"
        ? overlayStyle
        : "cinematic-lower-third";

    // ── STEP 1: Generate commercial script via LLM ──────────────
    const brandContext = `Brand/Product Ad Details:
- Product Headline: "${headline}"
- Product Description: "${primaryText || "Not specified"}"
- Call to Action: "${callToAction || "Not specified"}"
- Platform: ${platform || "social media"}
- Visual Theme: ${theme || "modern, premium"}
- Color Palette: ${colorPalette || "vibrant, high-contrast"}
- Target Audience: ${audience || "general consumers"}
- Cultural Region: ${langName}
- Output Language: ${langName} (STRICT requirement for voiceover)
- On-screen text overlays: none. This commercial must feel cinematic and voice-led.
- Historical Best Platform: ${optimization.recommended.platform || "n/a"}
- Historical Best Tone: ${optimization.recommended.tone || "n/a"}
- Historical Best CTA: ${optimization.recommended.callToAction || "n/a"}
- Historical Best Theme: ${optimization.recommended.theme || "n/a"}
- Historical Best Audience: ${optimization.recommended.audience || "n/a"}

Create a complete 4-scene commercial script for this product.

Remember: The best ads sell EMOTION, not features.
- What human desire does this product fulfill?
- What transformation does it enable?
- What moment of joy, relief, confidence, or connection does it create?`;

    const scriptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: renderConfig.scriptTemperature,
      max_tokens: renderConfig.scriptMaxTokens,
      messages: [
        { role: "system", content: COMMERCIAL_SCRIPT_SYSTEM },
        { role: "user", content: brandContext },
      ],
      response_format: { type: "json_object" },
    });

    const scriptRaw = scriptResponse.choices[0]?.message?.content?.trim();
    if (!scriptRaw) throw new Error("Failed to generate commercial script");

    let script = JSON.parse(scriptRaw) as CommercialScript;

    // Validate script structure
    if (!script.scenes || !Array.isArray(script.scenes) || script.scenes.length === 0) {
      throw new Error("Invalid script: no scenes generated");
    }

    const localizedScript = await enforceScriptLanguage(
      script,
      requestedLanguage,
      langName
    );
    if (!localizedScript) {
      return NextResponse.json(
        {
          error: `Failed to enforce ${langName} output for this video. Please retry generation.`,
        },
        { status: 422 }
      );
    }

    script = applyMinimalOverlayPolicy(localizedScript);

    const narrationForValidation = [
      script.full_voiceover,
      ...script.scenes.map((s) => `${s.voiceover || ""} ${s.overlay_text || ""}`),
    ]
      .join(" ")
      .trim();

    if (!hasScriptForLanguage(narrationForValidation, requestedLanguage)) {
      return NextResponse.json(
        {
          error: `Failed to produce ${langName} narration for the commercial. Please retry generation.`,
        },
        { status: 422 }
      );
    }

    // ── STEP 2: Launch Replicate predictions SEQUENTIALLY (rate-limit safe) ──
    const predictions: { id: string; sceneIndex: number; status: string }[] = [];
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i] as { visual_prompt: string };
      if (i > 0) {
        // Stagger requests to avoid Replicate rate limits
        await new Promise((r) =>
          setTimeout(r, renderConfig.staggerDelayMs)
        );
      }
      const prediction = await createPredictionWithRetry(
        scene.visual_prompt,
        renderConfig,
        renderConfig.maxRetries
      );
      predictions.push({
        id: prediction.id,
        sceneIndex: i,
        status: prediction.status,
      });
    }

    // ── STEP 3: Create job directory and state ──────────────────
    const jobId = crypto.randomUUID();
    const jobDir = path.join(
      process.cwd(),
      "public",
      "generated-videos",
      "jobs",
      jobId
    );
    await mkdir(jobDir, { recursive: true });

    const jobState = {
      jobId,
      status: "processing",
      createdAt: Date.now(),
      adId: adId || null,
      userId: session.user.id,
      language: requestedLanguage,
      script,
      optimizationProfile: requestedProfile,
      overlayStyle: selectedOverlayStyle,
      predictions: predictions.map((p) => ({
        id: p.id,
        sceneIndex: p.sceneIndex,
        status: p.status,
        clipPath: null as string | null,
      })),
      ttsReady: false,
      voiceoverPath: path.join(jobDir, "voiceover.mp3"),
      mergeStarted: false,
      finalVideoUrl: null as string | null,
      error: null as string | null,
    };

    await writeFile(
      path.join(jobDir, "job.json"),
      JSON.stringify(jobState, null, 2)
    );

    // ── STEP 4: Fire-and-forget TTS voiceover generation ────────
    const ttsVoice =
      MOOD_TO_VOICE[script.brand_mood] || MOOD_TO_VOICE.neutral;

    // Don't await — let it run in the background
    const narrationScript =
      script.full_voiceover ||
      script.scenes.map((s: { voiceover: string }) => s.voiceover).join(" ");

    generateVoiceover(
      narrationScript,
      ttsVoice,
      jobDir
    );

    // ── STEP 5: Update Ad record ────────────────────────────────
    if (adId) {
      await prisma.ad.update({
        where: { id: adId, userId: session.user.id },
        data: {
          videoStatus: "processing",
          replicateId: jobId, // Store jobId instead of predictionId
        },
      });
    }

    return NextResponse.json({
      jobId,
      status: "processing",
      sceneCount: script.scenes.length,
      optimizationProfile: requestedProfile,
      overlayStyle: selectedOverlayStyle,
      language: requestedLanguage,
      script,
    });
  } catch (error: unknown) {
    console.error("Video generation error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start video generation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
