"use client";

import { Sparkles } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 mr-auto max-w-[85%]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
          <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
