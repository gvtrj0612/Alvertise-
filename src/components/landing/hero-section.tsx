"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function HeroSection() {
  const [prompt, setPrompt] = useState("");
  const [videoLoaded, setVideoLoaded] = useState(true);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    router.push(`/dashboard/generate?prompt=${encodeURIComponent(prompt.trim())}`);
  }

  return (
    <section className="relative overflow-hidden min-h-[88vh] flex items-center">
      {/* Background video */}
      {videoLoaded && (
        <video
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoLoaded(false)}
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
      )}

      {/* Video overlay for text readability */}
      {videoLoaded && (
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95 z-[1]" />
      )}

      {/* Animated monochrome background (fallback when no video) */}
      <div className={`absolute inset-0 bg-gradient-to-br from-white/10 via-white/0 to-black/40 ${videoLoaded ? "opacity-50" : ""}`} />
      <div className="absolute inset-0 hero-grid z-[1]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_20%,hsl(var(--background))_72%)]" />

      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
        <motion.div
          className="absolute top-1/4 left-1/4 h-64 w-64 bg-white ink-orb"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 h-48 w-48 bg-white ink-orb"
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-1.5 text-sm text-slate-900 shadow-sm"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Creative Intelligence Platform
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.04]"
          >
            Launch Bold Campaigns
            <br />
            <span className="headline-metal">
              without creative bottlenecks
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-slate-800 max-w-2xl mx-auto leading-relaxed"
          >
            Describe your product once, and Alvertise composes ad copy,
            visual concepts, and conversion-focused variants for every channel.
          </motion.p>

          {/* Prompt Input */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onSubmit={handleSubmit}
            className="max-w-xl mx-auto"
          >
            <div className="flex gap-2 p-1.5 rounded-2xl border border-slate-200/80 bg-white/90 shadow-lg">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your product or service..."
                className="flex-1 bg-transparent px-4 py-3 text-sm outline-none text-slate-950 placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
              >
                Generate Ad
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Free to start. No credit card required.
            </p>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
