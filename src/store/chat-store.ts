import { create } from "zustand";

export interface GeneratedAd {
  id?: string;
  headline: string;
  primaryText: string;
  description: string;
  callToAction: string;
  platform: string;
  hashtags: string[];
  language?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ads?: GeneratedAd[];
  timestamp: Date;
}

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  conversationId: string | null;
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  setTyping: (typing: boolean) => void;
  clearMessages: () => void;
  setConversationId: (id: string | null) => void;
  loadConversation: (messages: ChatMessage[], conversationId: string) => void;

  // Voice state
  voiceState: VoiceState;
  setVoiceState: (state: VoiceState) => void;
  voiceEnabled: boolean;
  toggleVoice: () => void;
  interimTranscript: string;
  setInterimTranscript: (text: string) => void;
}

let msgCounter = 0;

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey! I'm your AI ad copywriter. Tap the microphone and tell me about your product or service \u2014 I'll ask a few questions and then generate high-converting ad copy for you. You can also type if you prefer.",
  timestamp: new Date(),
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [welcomeMessage],
  isTyping: false,
  conversationId: null,
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...msg, id: `msg-${++msgCounter}`, timestamp: new Date() },
      ],
    })),
  setTyping: (typing) => set({ isTyping: typing }),
  clearMessages: () => {
    msgCounter = 0;
    set({
      messages: [welcomeMessage],
      interimTranscript: "",
      conversationId: null,
    });
  },
  setConversationId: (conversationId) => set({ conversationId }),
  loadConversation: (messages, conversationId) => {
    msgCounter = messages.length;
    set({ messages: [welcomeMessage, ...messages], conversationId });
  },

  // Voice state
  voiceState: "idle",
  setVoiceState: (voiceState) => set({ voiceState }),
  voiceEnabled: true,
  toggleVoice: () => set((state) => ({ voiceEnabled: !state.voiceEnabled })),
  interimTranscript: "",
  setInterimTranscript: (interimTranscript) => set({ interimTranscript }),
}));
