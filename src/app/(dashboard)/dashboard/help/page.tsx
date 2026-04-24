"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  MessageSquare,
  Mic,
  FileText,
  FolderOpen,
  Settings,
  BarChart3,
  HelpCircle,
  ExternalLink,
  Send,
  Bot,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";

const guides = [
  {
    icon: Sparkles,
    title: "Generating Ads",
    description:
      "Use the Generate page to create high-converting ad copy. Describe your product, target audience, and platform, and Alvertise will produce multiple ad variations.",
    link: "/dashboard/generate",
  },
  {
    icon: MessageSquare,
    title: "Chat with AI",
    description:
      "Have a natural conversation with Alvertise Assistant. It asks the right questions to understand your needs and generate tailored ads. You can type or use voice input.",
    link: "/dashboard/generate",
  },
  {
    icon: Mic,
    title: "Voice Input",
    description:
      "Click the microphone button to speak your requirements. Alvertise uses your browser's speech recognition to transcribe your voice in real-time. The assistant can also speak responses back to you.",
    link: "/dashboard/generate",
  },
  {
    icon: FolderOpen,
    title: "Managing Campaigns",
    description:
      "Organize your ads into campaigns. Create campaigns for different products, seasons, or platforms. You can pause, resume, or delete campaigns from the Campaigns page.",
    link: "/dashboard/campaigns",
  },
  {
    icon: FileText,
    title: "Managing Ads",
    description:
      "View all your generated ads in grid or list view. Copy ad text to your clipboard, delete ads you no longer need, and filter by status (completed, draft).",
    link: "/dashboard/ads",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Track your ad generation activity over time. View charts showing monthly trends, activity breakdowns, and your recent generation history.",
    link: "/dashboard/analytics",
  },
  {
    icon: Settings,
    title: "Settings",
    description:
      "Update your profile information, switch between light and dark themes, view your API keys, and check your current plan usage from the Settings page.",
    link: "/dashboard/settings",
  },
];

const faqs = [
  {
    question: "How does Alvertise generate ads?",
    answer:
      "Alvertise uses a multi-stage creative engine that combines prompt planning, variation scoring, and platform-specific formatting to generate high-converting ad copy.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "Alvertise supports Facebook, Instagram, Google Ads, LinkedIn, and Twitter/X. Each platform gets optimized ad copy tailored to its format and audience expectations.",
  },
  {
    question: "Can I edit the generated ads?",
    answer:
      "After ads are generated, you can ask the AI to refine them by describing what changes you want. You can also copy the ad text and edit it manually in your preferred editor.",
  },
  {
    question: "How does voice input work?",
    answer:
      "Voice input uses your browser's built-in speech recognition (Web Speech API). Click the microphone button, speak naturally, and your words will be transcribed in real-time. Works best in Chrome and Edge browsers.",
  },
  {
    question: "Are my ads saved automatically?",
    answer:
      "Yes, all ads generated through the AI chat are automatically saved to your account. You can view them anytime from the Ads page and organize them into campaigns.",
  },
  {
    question: "What is the free plan limit?",
    answer:
      "The free plan includes 10 ad generations per month and up to 5 campaigns. Check your current usage in Settings > Billing.",
  },
];

interface HelpMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function HelpBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<HelpMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm the Alvertise Help Bot. Ask me anything about using the platform, features, or troubleshooting.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const msgId = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: HelpMessage = {
      id: `help-${++msgId.current}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages.filter((m) => m.id !== "welcome"), userMsg].map(
        (m) => ({ role: m.role, content: m.content })
      );

      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error("Failed");

      const { content } = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `help-${++msgId.current}`,
          role: "assistant",
          content,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `help-${++msgId.current}`,
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again or email support@alvertise.ai.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50"
      >
        <Bot className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] z-50">
      <Card className="shadow-2xl border-primary/20">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Help Bot</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-80 overflow-y-auto px-4 py-2 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t p-3 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Ask a question..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="h-9 w-9"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HelpCircle className="h-8 w-8 text-primary" />
          Help Center
        </h1>
        <p className="text-muted-foreground mt-1">
          Learn how to get the most out of Alvertise
        </p>
      </div>

      {/* Getting Started */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {guides.map((guide) => {
            const Icon = guide.icon;
            return (
              <Link key={guide.title} href={guide.link}>
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {guide.title}
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {guide.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need More Help?</CardTitle>
          <CardDescription>
            If you could not find what you are looking for, reach out to our support team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Email us at{" "}
            <span className="font-medium text-foreground">support@alvertise.ai</span>{" "}
            and we will get back to you within 24 hours.
          </p>
        </CardContent>
      </Card>

      {/* AI Help Bot floating widget */}
      <HelpBot />
    </div>
  );
}
