"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { VoiceControls } from "@/components/chat/voice-controls";
import { useChatStore } from "@/store/chat-store";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { AdCustomizationPanel, CustomizationOptions } from "@/components/chat/ad-customization-panel";
import { Send, Trash2, Sparkles, Mic, Keyboard } from "lucide-react";
import toast from "react-hot-toast";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "kn", label: "Kannada" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
] as const;

function enforceLanguage(content: string, language: string) {
  if (language === "en") return content;
  const label =
    LANGUAGE_OPTIONS.find((l) => l.value === language)?.label || "English";
  return `${content}\n\nIMPORTANT: Generate all future ad copy, ad variants, hashtags, and CTA text in ${label}.`;
}

export default function GenerateAdPage() {
  const {
    messages,
    isTyping,
    addMessage,
    setTyping,
    clearMessages,
    voiceState,
    setVoiceState,
    voiceEnabled,
    toggleVoice,
    conversationId,
    setConversationId,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [customizationLoading, setCustomizationLoading] = useState(false);
  const [showCustomizationPanel, setShowCustomizationPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioPlayer = useAudioPlayer();

  // Check if any ads have been generated in this conversation
  const hasAds = messages.some((m) => m.ads && m.ads.length > 0);

  // Handle ad customization / regeneration
  async function handleCustomize(options: CustomizationOptions) {
    setCustomizationLoading(true);
    const prompt = `Please regenerate the ads with these customizations: Theme: ${options.theme}, Target Audience: ${options.audience}, Platform: ${options.platform}, Tone: ${options.tone}, Color Palette: ${options.colorPalette}, Call to Action: "${options.callToAction}", Language: ${options.language}, Objective: ${options.objective}, Hook Style: ${options.hookStyle}, Offer Type: ${options.offerType}, Social Proof: ${options.proofStyle}, Urgency: ${options.urgency}. Generate 2-3 new ad variations using these exact settings.`;

    addMessage({ role: "user", content: prompt });
    setTyping(true);

    try {
      const currentMessages = useChatStore.getState().messages;
      const chatHistory = currentMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      if (chatHistory.length > 0) {
        const last = chatHistory[chatHistory.length - 1];
        if (last.role === "user") {
          last.content = enforceLanguage(last.content, selectedLanguage);
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          customization: options,
          preferredLanguage: selectedLanguage,
          conversationId,
        }),
      });

      if (!res.ok) throw new Error("Failed to regenerate");

      const { content, ads, conversationId: newConvId } = await res.json();
      addMessage({ role: "assistant", content, ads });
      if (newConvId) setConversationId(newConvId);
    } catch {
      toast.error("Failed to regenerate ads. Please try again.");
    } finally {
      setTyping(false);
      setCustomizationLoading(false);
    }
  }

  // Core voice conversation handler - receives transcript text directly
  const handleTranscriptReady = useCallback(
    async (text: string) => {
      setVoiceState("processing");

      try {
        // Step 1: Add user message
        addMessage({ role: "user", content: text });

        // Step 2: Get AI response
        setTyping(true);
        const currentMessages = useChatStore.getState().messages;
        const chatHistory = currentMessages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content }));

        if (chatHistory.length > 0) {
          const last = chatHistory[chatHistory.length - 1];
          if (last.role === "user") {
            last.content = enforceLanguage(last.content, selectedLanguage);
          }
        }

        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: chatHistory,
            preferredLanguage: selectedLanguage,
            conversationId: useChatStore.getState().conversationId,
          }),
        });

        if (!chatRes.ok) {
          throw new Error("Failed to get AI response");
        }

        const { content, ads, conversationId: newConvId } = await chatRes.json();
        addMessage({ role: "assistant", content, ads });
        if (newConvId) setConversationId(newConvId);
        setTyping(false);

        const hasFinalVariants = Array.isArray(ads) && ads.length > 0;

        // Step 3: Speak the response via TTS
        setVoiceState("speaking");
        try {
          await audioPlayer.play(content);
        } catch {
          // TTS failed silently, text is still shown
        }

        // Step 4: Continue conversation only while we are still collecting details.
        // Once the assistant returns the final variants, stop listening completely.
        if (hasFinalVariants) {
          voiceRecorderRef.current?.stopListening();
          setVoiceState("idle");
          return;
        }

        setVoiceState("idle");

        if (voiceEnabled) {
          setTimeout(() => {
            if (useChatStore.getState().voiceEnabled) {
              voiceRecorderRef.current?.startListening();
            }
          }, 500);
        }
      } catch (error) {
        console.error("Voice conversation error:", error);
        setVoiceState("idle");
        setTyping(false);
        toast.error("Something went wrong. Please try again.");
      }
    },
    [addMessage, setTyping, setVoiceState, setConversationId, audioPlayer, voiceEnabled, selectedLanguage]
  );

  const voiceRecorder = useVoiceRecorder({
    silenceThreshold: 0.01,
    silenceTimeout: 1500,
    onTranscriptReady: handleTranscriptReady,
  });

  // Store ref for auto-resume
  const voiceRecorderRef = useRef(voiceRecorder);
  useEffect(() => {
    voiceRecorderRef.current = voiceRecorder;
  }, [voiceRecorder]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // Keep the customization panel collapsed by default so generated variants stay in focus.
  useEffect(() => {
    if (!hasAds) {
      setShowCustomizationPanel(false);
    }
  }, [hasAds]);

  // Text mode: send message via AI
  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    addMessage({ role: "user", content: trimmed });
    setInput("");
    setTyping(true);

    try {
      const currentMessages = useChatStore.getState().messages;
      const chatHistory = currentMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      if (chatHistory.length > 0) {
        const last = chatHistory[chatHistory.length - 1];
        if (last.role === "user") {
          last.content = enforceLanguage(last.content, selectedLanguage);
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          preferredLanguage: selectedLanguage,
          conversationId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const { content, ads, conversationId: newConvId } = await res.json();
      addMessage({ role: "assistant", content, ads });
      if (newConvId) setConversationId(newConvId);

      // If voice is enabled, also speak the response
      if (voiceEnabled) {
        setVoiceState("speaking");
        try {
          await audioPlayer.play(content);
        } catch {
          // TTS failed silently
        }
        setVoiceState("idle");
      }
    } catch {
      toast.error("Failed to get response. Please try again.");
    } finally {
      setTyping(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleStopSpeaking() {
    audioPlayer.stop();
    setVoiceState("idle");
  }

  function handleToggleMode() {
    voiceRecorder.stopListening();
    audioPlayer.stop();
    setVoiceState("idle");
    toggleVoice();
  }

  function handleClearChat() {
    voiceRecorder.stopListening();
    audioPlayer.stop();
    setVoiceState("idle");
    clearMessages();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Alvertise Creative Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {voiceEnabled
              ? "Speak naturally \u2014 I'll listen and respond"
              : "Describe your product and I'll craft the perfect ad copy"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
            title="Conversation language"
          >
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleMode}
            className="text-muted-foreground"
          >
            {voiceEnabled ? (
              <Keyboard className="mr-2 h-4 w-4" />
            ) : (
              <Mic className="mr-2 h-4 w-4" />
            )}
            {voiceEnabled ? "Type mode" : "Voice mode"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-muted-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-4 pr-2">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Customization panel (shown after ads are generated) */}
      {hasAds && !voiceEnabled && (
        <div className="pb-3 space-y-2">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomizationPanel((prev) => !prev)}
            >
              {showCustomizationPanel ? "Hide customization" : "Customize variants"}
            </Button>
          </div>

          {showCustomizationPanel && (
            <AdCustomizationPanel
              onCustomize={handleCustomize}
              loading={customizationLoading}
              initialLanguage={selectedLanguage}
            />
          )}
        </div>
      )}

      {/* Interim transcript (voice mode) */}
      {voiceEnabled && voiceRecorder.interimTranscript && (
        <div className="text-sm text-muted-foreground italic px-4 py-2 border-t">
          {voiceRecorder.interimTranscript}
        </div>
      )}

      {/* Suggestion chips (shown when few messages and not in voice active state) */}
      {messages.length <= 1 &&
        voiceState === "idle" &&
        !voiceEnabled && (
          <div className="flex flex-wrap gap-2 pb-3">
            {[
              "Write a Facebook ad for my SaaS product",
              "Create Instagram copy for a fitness app",
              "Generate LinkedIn ads targeting CTOs",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setInput(suggestion);
                  inputRef.current?.focus();
                }}
                className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

      {/* Input area: voice or text mode */}
      <div className="border-t pt-4">
        {voiceEnabled ? (
          <VoiceControls
            voiceState={voiceState}
            audioLevel={voiceRecorder.audioLevel}
            onStartListening={() => voiceRecorder.startListening()}
            onStopListening={() => voiceRecorder.stopListening()}
            onStopSpeaking={handleStopSpeaking}
            onToggleMode={handleToggleMode}
            error={voiceRecorder.error}
          />
        ) : (
          <>
            <div className="flex items-end gap-3">
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your product, audience, or what kind of ad you need..."
                  rows={1}
                  className="flex w-full rounded-lg border border-input bg-background px-4 py-3 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  disabled={isTyping}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </>
        )}
      </div>
    </div>
  );
}
