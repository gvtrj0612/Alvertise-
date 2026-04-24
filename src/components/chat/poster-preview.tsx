"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, Loader2, Image as ImageIcon, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

interface DesignSpec {
  width: number;
  height: number;
  backgroundColor: string;
  gradientEnd?: string | null;
  headlineStyle: { fontSize: number; color: string; fontWeight: string; y: number };
  bodyStyle: { fontSize: number; color: string; y: number };
  ctaStyle: {
    fontSize: number;
    color: string;
    bgColor: string;
    y: number;
    borderRadius: number;
  };
  accentColor: string;
  layout: string;
  decorativeElements?: {
    type: string;
    x: number;
    y: number;
    size: number;
    color: string;
  }[];
}

interface PosterPreviewProps {
  headline: string;
  primaryText: string;
  callToAction: string;
  platform: string;
  theme?: string;
  colorPalette?: string;
  audience?: string;
  posterStyle?: string;
  posterLayout?: string;
  posterIntensity?: string;
  adId?: string;
}

export function PosterPreview({
  headline,
  primaryText,
  callToAction,
  platform,
  theme,
  colorPalette,
  audience,
  posterStyle,
  posterLayout,
  posterIntensity,
  adId,
}: PosterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [designSpec, setDesignSpec] = useState<DesignSpec | null>(null);
  const [generated, setGenerated] = useState(false);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const posterLanguage = "en";

  async function generatePoster() {
    setLoading(true);
    try {
      const res = await fetch("/api/poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          primaryText,
          callToAction,
          platform,
          language: posterLanguage,
          theme,
          colorPalette,
          audience,
          posterStyle,
          posterLayout,
          posterIntensity,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate");

      const { designSpec: spec } = await res.json();
      setDesignSpec(spec);
      setGenerated(true);
    } catch {
      // Fallback design spec
      setDesignSpec(buildFallbackPosterSpec());
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }

  async function generateAiPoster() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          primaryText,
          callToAction,
          platform,
          language: posterLanguage,
          theme,
          colorPalette,
          audience,
          posterStyle,
          posterLayout,
          posterIntensity,
          adId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate AI image");
      }
      const { imageUrl } = await res.json();
      setAiImageUrl(imageUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI image generation failed");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    if (!designSpec || aiImageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = 0.4;
    const w = designSpec.width;
    const h = designSpec.height;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w * scale}px`;
    canvas.style.height = `${h * scale}px`;

    drawPosterBackdrop(ctx, designSpec, w, h);

    // Decorative elements
    if (designSpec.decorativeElements) {
      for (const el of designSpec.decorativeElements) {
        ctx.fillStyle = el.color;
        if (el.type === "circle") {
          ctx.beginPath();
          ctx.arc(el.x, el.y, el.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (el.type === "rectangle") {
          ctx.fillRect(el.x, el.y, el.size, el.size * 0.5);
        } else if (el.type === "line") {
          ctx.strokeStyle = el.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(el.x, el.y);
          ctx.lineTo(el.x + el.size, el.y);
          ctx.stroke();
        }
      }
    }

    // High-contrast text panel improves readability across all backgrounds
    const textPanelX = 70;
    const textPanelY = 145;
    const textPanelW = w - 140;
    const textPanelH = Math.min(810, h - 380);
    ctx.save();
    ctx.fillStyle = "rgba(8, 12, 18, 0.56)";
    roundRect(ctx, textPanelX, textPanelY, textPanelW, textPanelH, 36);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    roundRect(ctx, textPanelX, textPanelY, textPanelW, textPanelH, 36);
    ctx.stroke();
    ctx.restore();

    const headlineFontStack = getFontStack(posterLanguage);
    const bodyFontStack = getFontStack(posterLanguage);

    // Keep the poster text-forward but compact so the layout stays clean.
    const safeHeadline = normalizePosterText(headline);
    const headlineMaxWidth = textPanelW - 96;
    const headlineMaxLines = 2;
    const headlineFontSize = fitTextSize({
      ctx,
      text: safeHeadline,
      maxWidth: headlineMaxWidth,
      maxLines: headlineMaxLines,
      startSize: Math.max(designSpec.headlineStyle.fontSize, 64),
      minSize: 42,
      weight: designSpec.headlineStyle.fontWeight || "800",
      fontFamily: headlineFontStack,
    });
    const headlineLineHeight = Math.round(headlineFontSize * 1.16);
    const headlineLines = getWrappedLines(
      ctx,
      safeHeadline,
      headlineMaxWidth,
      headlineMaxLines,
      `${designSpec.headlineStyle.fontWeight || "800"} ${headlineFontSize}px ${headlineFontStack}`
    );

    ctx.fillStyle = designSpec.headlineStyle.color || "#FFFFFF";
    ctx.font = `${designSpec.headlineStyle.fontWeight || "800"} ${headlineFontSize}px ${headlineFontStack}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.42)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    const headlineStartY = textPanelY + 120;
    headlineLines.forEach((line, i) => {
      ctx.fillText(line, w / 2, headlineStartY + i * headlineLineHeight);
    });

    ctx.save();
    ctx.strokeStyle = "rgba(126,224,255,0.38)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(textPanelX + 120, headlineStartY + headlineLines.length * headlineLineHeight + 26);
    ctx.lineTo(w - 120, headlineStartY + headlineLines.length * headlineLineHeight + 26);
    ctx.stroke();
    ctx.restore();

    // Body copy: keep it short so the poster stays readable and premium.
    const safeBody = normalizePosterText(primaryText).slice(0, 120);
    const bodyMaxWidth = textPanelW - 120;
    const bodyText = safeBody;
    let bodyBottomY = headlineStartY + headlineLines.length * headlineLineHeight + 66;
    if (bodyText) {
      const bodyFontSize = fitTextSize({
        ctx,
        text: bodyText,
        maxWidth: bodyMaxWidth,
        maxLines: 3,
        startSize: Math.max(designSpec.bodyStyle.fontSize, 34),
        minSize: 22,
        weight: "500",
        fontFamily: bodyFontStack,
      });
      const bodyLineHeight = Math.round(bodyFontSize * 1.4);
      const bodyLines = getWrappedLines(
        ctx,
        bodyText,
        bodyMaxWidth,
        3,
        `500 ${bodyFontSize}px ${bodyFontStack}`
      );

      ctx.fillStyle = designSpec.bodyStyle.color || "#E6EEF8";
      ctx.font = `500 ${bodyFontSize}px ${bodyFontStack}`;
      const bodyStartY =
        headlineStartY +
        headlineLines.length * headlineLineHeight +
        66;
      bodyLines.forEach((line, i) => {
        ctx.fillText(line, w / 2, bodyStartY + i * bodyLineHeight);
      });

      bodyBottomY = bodyStartY + bodyLines.length * bodyLineHeight;
    }
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // CTA button
    const cs = designSpec.ctaStyle;
    const ctaLabel = normalizePosterText(callToAction).slice(0, 20) || "Order Today";
    const ctaWidth = ctx.measureText(ctaLabel).width + 80;
    const ctaX = w / 2 - ctaWidth / 2;
    const ctaY = Math.max(cs.y, Math.max(textPanelY + textPanelH - 145, bodyBottomY + 36));

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(textPanelX + 150, ctaY - 24);
    ctx.lineTo(w - 150, ctaY - 24);
    ctx.stroke();
    ctx.restore();

    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = cs.bgColor;
    roundRect(ctx, ctaX, ctaY, ctaWidth, cs.fontSize + 30, cs.borderRadius);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = cs.color;
    ctx.font = `bold ${cs.fontSize}px ${headlineFontStack}`;
    ctx.textAlign = "center";
    ctx.fillText(ctaLabel, w / 2, ctaY + cs.fontSize + 8);

    // Platform badge
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = `16px ${headlineFontStack}`;
    ctx.textAlign = "right";
    ctx.fillText(platform.toUpperCase(), w - 40, h - 30);
  }, [designSpec, headline, primaryText, callToAction, platform, aiImageUrl]);

  function downloadPoster() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `alvertise-poster-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  if (!generated && !aiImageUrl) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <ImageIcon className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Generate a visual poster for this ad
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Button variant="outline" onClick={generatePoster} disabled={loading || aiLoading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="mr-2 h-4 w-4" />
              )}
              Premium Poster
            </Button>
            <Button onClick={generateAiPoster} disabled={loading || aiLoading}>
              {aiLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              AI Background
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Premium Poster is instant and polished. AI Background uses the visual generation engine (~10 sec).
          </p>
        </CardContent>
      </Card>
    );
  }

  if (aiImageUrl) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>AI-Generated Poster</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const link = document.createElement("a");
                link.href = aiImageUrl;
                link.download = `alvertise-ai-poster-${Date.now()}.png`;
                link.click();
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={aiImageUrl}
            alt={headline}
            className="rounded-lg shadow-lg max-w-full"
            style={{ maxHeight: "432px" }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Ad Poster Preview</span>
          <Button size="sm" variant="outline" onClick={downloadPoster}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center">
        <canvas
          ref={canvasRef}
          className="rounded-2xl shadow-2xl border"
        />
      </CardContent>
    </Card>
  );
}

function buildFallbackPosterSpec(): DesignSpec {
  return {
    width: 1080,
    height: 1350,
    backgroundColor: "#060B1A",
    gradientEnd: "#182B63",
    headlineStyle: { fontSize: 62, color: "#FFFFFF", fontWeight: "800", y: 210 },
    bodyStyle: { fontSize: 28, color: "#D8E3FF", y: 430 },
    ctaStyle: {
      fontSize: 24,
      color: "#08111F",
      bgColor: "#F7C948",
      y: 1110,
      borderRadius: 999,
    },
    accentColor: "#7EE0FF",
    layout: "editorial",
    decorativeElements: [
      { type: "circle", x: 920, y: 180, size: 260, color: "rgba(126,224,255,0.12)" },
      { type: "circle", x: 140, y: 1110, size: 300, color: "rgba(247,201,72,0.08)" },
      { type: "rectangle", x: 90, y: 280, size: 900, color: "rgba(255,255,255,0.04)" },
    ],
  };
}

function drawPosterBackdrop(
  ctx: CanvasRenderingContext2D,
  designSpec: DesignSpec,
  width: number,
  height: number
) {
  const background = designSpec.backgroundColor || "#060B1A";
  const gradientEnd = designSpec.gradientEnd || background;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, background);
  gradient.addColorStop(1, gradientEnd);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = designSpec.accentColor || "#7EE0FF";
  ctx.beginPath();
  ctx.arc(width * 0.82, height * 0.16, Math.min(width, height) * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.08;
  ctx.beginPath();
  ctx.arc(width * 0.14, height * 0.82, Math.min(width, height) * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, width - 56, height - 56);
  ctx.restore();
}

function normalizePosterText(text: string) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function getFontStack(language?: string) {
  if (language === "hi") {
    return '"Noto Sans Devanagari", "Nirmala UI", "Mangal", Inter, ui-sans-serif, system-ui, sans-serif';
  }
  if (language === "kn") {
    return '"Noto Sans Kannada", "Nirmala UI", Inter, ui-sans-serif, system-ui, sans-serif';
  }
  return 'Inter, "Noto Sans", ui-sans-serif, system-ui, sans-serif';
}

function tokenizeForWrap(text: string) {
  if (/\s/.test(text)) {
    return text.split(/\s+/).filter(Boolean);
  }
  return Array.from(text);
}

function fitTokenToWidth(
  ctx: CanvasRenderingContext2D,
  token: string,
  maxWidth: number
) {
  if (ctx.measureText(token).width <= maxWidth) return token;
  let out = "";
  for (const ch of Array.from(token)) {
    const candidate = out + ch;
    if (ctx.measureText(candidate).width > maxWidth) break;
    out = candidate;
  }
  return out || token.slice(0, 1);
}

function getWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  font: string
) {
  ctx.font = font;
  const words = tokenizeForWrap(text);
  const lines: string[] = [];
  let line = "";
  const joiner = /\s/.test(text) ? " " : "";

  for (let i = 0; i < words.length; i++) {
    const token = words[i];
    const safeToken =
      ctx.measureText(token).width > maxWidth
        ? fitTokenToWidth(ctx, token, maxWidth)
        : token;
    const candidate = line ? `${line}${joiner}${safeToken}` : safeToken;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) lines.push(line);
    line = safeToken;

    if (lines.length === maxLines - 1) {
      const rest = [line, ...words.slice(i + 1)].join(joiner);
      lines.push(ellipsizeToWidth(ctx, rest, maxWidth));
      return lines;
    }
  }

  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function ellipsizeToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 0 && ctx.measureText(`${out}...`).width > maxWidth) {
    out = out.slice(0, -1).trimEnd();
  }
  return out ? `${out}...` : "...";
}

function fitTextSize({
  ctx,
  text,
  maxWidth,
  maxLines,
  startSize,
  minSize,
  weight,
  fontFamily,
}: {
  ctx: CanvasRenderingContext2D;
  text: string;
  maxWidth: number;
  maxLines: number;
  startSize: number;
  minSize: number;
  weight: string;
  fontFamily: string;
}) {
  for (let size = startSize; size >= minSize; size -= 2) {
    const font = `${weight} ${size}px ${fontFamily}`;
    const lines = getWrappedLines(ctx, text, maxWidth, maxLines, font);
    const hasOverflow =
      lines.length === maxLines &&
      lines[lines.length - 1]?.endsWith("...");
    if (!hasOverflow) return size;
  }
  return minSize;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
