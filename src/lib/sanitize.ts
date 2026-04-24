const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?(your\s+)?instructions/i,
  /you\s+are\s+now\s+(?:a|an)\s+(?!ad|advertisement|marketing)/i,
  /system\s*:\s*/i,
  /\[\s*INST\s*\]/i,
  /<<\s*SYS\s*>>/i,
  /\bact\s+as\s+(?!a\s+marketing|an\s+ad|a\s+copywriter)/i,
  /pretend\s+(?:you(?:'re|\s+are)\s+)?(?!a\s+market|an\s+ad)/i,
  /override\s+(?:your\s+)?(?:system|instructions|prompt)/i,
  /reveal\s+(?:your\s+)?(?:system|instructions|prompt|secret)/i,
  /what\s+(?:is|are)\s+your\s+(?:system\s+)?(?:prompt|instructions)/i,
  /\bDAN\b/,
  /do\s+anything\s+now/i,
  /jailbreak/i,
];

const HTML_SCRIPT_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /on(?:error|load|click|mouseover)\s*=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
];

export interface SanitizeResult {
  safe: boolean;
  sanitized: string;
  threats: string[];
}

export function sanitizeInput(input: string): SanitizeResult {
  const threats: string[] = [];

  // Check for prompt injection attempts
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      threats.push("prompt_injection");
      break;
    }
  }

  // Check for XSS/HTML injection
  for (const pattern of HTML_SCRIPT_PATTERNS) {
    if (pattern.test(input)) {
      threats.push("xss_attempt");
      break;
    }
  }

  // Check for excessive length (potential DoS)
  if (input.length > 5000) {
    threats.push("excessive_length");
  }

  // Sanitize: strip HTML tags, trim
  let sanitized = input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .trim();

  // Truncate to max length
  if (sanitized.length > 5000) {
    sanitized = sanitized.slice(0, 5000);
  }

  return {
    safe: threats.length === 0,
    sanitized,
    threats,
  };
}

export function sanitizeMessages(
  messages: { role: string; content: string }[]
): { safe: boolean; sanitized: { role: string; content: string }[]; threats: string[] } {
  const allThreats: string[] = [];
  const sanitized = messages.map((msg) => {
    if (msg.role === "user") {
      const result = sanitizeInput(msg.content);
      allThreats.push(...result.threats);
      return { ...msg, content: result.sanitized };
    }
    return msg;
  });

  return {
    safe: allThreats.length === 0,
    sanitized,
    threats: Array.from(new Set(allThreats)),
  };
}
