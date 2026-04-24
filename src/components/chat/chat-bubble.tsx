"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/store/chat-store";
import { Sparkles, User } from "lucide-react";
import { AdPreviewCard } from "./ad-preview-card";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex gap-3 max-w-[85%]",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary" : "bg-primary/10"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className="space-y-3 min-w-0">
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted rounded-tl-sm"
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Inline ad previews */}
        {message.ads && message.ads.length > 0 && (
          <div className="space-y-3">
            {message.ads.map((ad, idx) => (
              <AdPreviewCard key={idx} ad={ad} index={idx} adId={ad.id} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            "text-xs text-muted-foreground",
            isUser ? "text-right" : "text-left"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}
