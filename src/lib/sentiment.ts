import OpenAI from "openai";

export interface SentimentResult {
  sentiment: string;
  score: number;
  emotion: string;
  aspects: Record<string, { rating: string; note: string }>;
}

// Advanced AI-powered sentiment analysis with emotion detection and aspect-based feedback
export async function analyzeAdvancedSentiment(text: string): Promise<SentimentResult> {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-proj-paste-your-key-here") {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `You are an advanced sentiment analysis system for advertisement feedback. Analyze the user's feedback about an ad with deep understanding.

Respond ONLY with valid JSON in this exact format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "score": <number between 0 and 1>,
  "emotion": "<one of: confident, excited, frustrated, confused, impressed, disappointed, neutral>",
  "aspects": {
    "headline": { "rating": "good" | "neutral" | "bad", "note": "<brief reason>" },
    "copy": { "rating": "good" | "neutral" | "bad", "note": "<brief reason>" },
    "cta": { "rating": "good" | "neutral" | "bad", "note": "<brief reason>" },
    "visuals": { "rating": "good" | "neutral" | "bad", "note": "<brief reason>" }
  }
}

Emotion detection guide:
- "confident": User feels the ad will perform well, expresses certainty
- "excited": User is enthusiastic, uses exclamation marks, strong positive language
- "frustrated": User is annoyed by quality issues or repeated problems
- "confused": User doesn't understand the ad's message or intent
- "impressed": User is pleasantly surprised by quality or creativity
- "disappointed": User expected more, feels let down
- "neutral": No strong emotion detected

Aspect analysis guide:
- Only include aspects the user actually mentions or implies
- "headline": Feedback about the ad title/headline effectiveness
- "copy": Feedback about the body text, description, persuasiveness
- "cta": Feedback about the call-to-action button/text
- "visuals": Feedback about images, video, design, layout

Scoring: 0.0=extremely negative, 0.5=neutral, 1.0=extremely positive.
Consider tone, sarcasm, context, and nuance — not just keyword presence.`,
          },
          {
            role: "user",
            content: `Classify this ad feedback: "${text}"`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.sentiment && typeof parsed.score === "number") {
          return {
            sentiment: parsed.sentiment,
            score: Math.max(0, Math.min(1, parsed.score)),
            emotion: parsed.emotion || "neutral",
            aspects: parsed.aspects || {},
          };
        }
      }
    } catch (error) {
      console.error("AI sentiment analysis failed, using fallback:", error);
    }
  }

  const fallback = fallbackSentiment(text);
  return { ...fallback, emotion: "neutral", aspects: {} };
}

// Fallback keyword-based sentiment when OpenAI is unavailable
function fallbackSentiment(text: string): { sentiment: string; score: number } {
  const lower = text.toLowerCase();
  const positiveWords = ["great", "excellent", "amazing", "love", "perfect", "good", "awesome", "fantastic", "wonderful", "impressive", "effective", "brilliant", "outstanding", "engaging", "compelling", "creative", "catchy", "strong", "powerful", "like", "nice", "well", "best"];
  const negativeWords = ["bad", "poor", "terrible", "hate", "awful", "boring", "weak", "generic", "bland", "dull", "unoriginal", "confusing", "misleading", "worse", "worst", "ugly", "disappointing", "ineffective", "dislike", "spam", "annoying"];

  let positiveCount = 0;
  let negativeCount = 0;
  for (const word of positiveWords) { if (lower.includes(word)) positiveCount++; }
  for (const word of negativeWords) { if (lower.includes(word)) negativeCount++; }

  const total = positiveCount + negativeCount;
  if (total === 0) return { sentiment: "neutral", score: 0.5 };
  const score = positiveCount / total;
  if (score >= 0.6) return { sentiment: "positive", score };
  if (score <= 0.4) return { sentiment: "negative", score };
  return { sentiment: "neutral", score };
}
