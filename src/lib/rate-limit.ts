import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  chat: { maxRequests: 20, windowMs: 60 * 1000 },
  tts: { maxRequests: 30, windowMs: 60 * 1000 },
  image: { maxRequests: 5, windowMs: 60 * 1000 },
  video: { maxRequests: 3, windowMs: 5 * 60 * 1000 },
  signup: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  default: { maxRequests: 60, windowMs: 60 * 1000 },
};

export function rateLimit(
  identifier: string,
  type: string = "default"
): { success: boolean; response?: NextResponse } {
  const config = RATE_LIMITS[type] || RATE_LIMITS.default;
  const key = `${type}:${identifier}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { success: true };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(config.maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(entry.resetTime),
          },
        }
      ),
    };
  }

  entry.count++;
  return { success: true };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "127.0.0.1";
}
