"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VoiceVisualizer } from "./voice-visualizer";
import { Mic, Square, Keyboard, Volume2 } from "lucide-react";
import type { VoiceState } from "@/store/chat-store";

interface VoiceControlsProps {
  voiceState: VoiceState;
  audioLevel: number;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopSpeaking: () => void;
  onToggleMode: () => void;
  error: string | null;
}

const stateLabel: Record<VoiceState, string> = {
  idle: "Tap to speak",
  listening: "Listening...",
  processing: "Thinking...",
  speaking: "AI is speaking...",
};

export function VoiceControls({
  voiceState,
  audioLevel,
  onStartListening,
  onStopListening,
  onStopSpeaking,
  onToggleMode,
  error,
}: VoiceControlsProps) {
  function handleMicClick() {
    switch (voiceState) {
      case "idle":
        onStartListening();
        break;
      case "listening":
        onStopListening();
        break;
      case "speaking":
        onStopSpeaking();
        break;
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Mic button with visualizer */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <VoiceVisualizer
          audioLevel={audioLevel}
          isActive={voiceState === "listening"}
        />
        <Button
          onClick={handleMicClick}
          disabled={voiceState === "processing"}
          size="icon"
          className={cn(
            "relative z-10 h-16 w-16 rounded-full transition-all",
            voiceState === "listening" && "bg-red-500 hover:bg-red-600",
            voiceState === "speaking" && "bg-primary/80",
            voiceState === "processing" && "bg-muted animate-pulse"
          )}
        >
          {voiceState === "listening" ? (
            <Square className="h-6 w-6" />
          ) : voiceState === "speaking" ? (
            <Volume2 className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* State label */}
      <p className="text-sm text-muted-foreground">{stateLabel[voiceState]}</p>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive text-center max-w-xs">
          {error}
        </p>
      )}

      {/* Switch to text mode */}
      <button
        onClick={onToggleMode}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
      >
        <Keyboard className="h-3.5 w-3.5" />
        Switch to typing
      </button>
    </div>
  );
}
