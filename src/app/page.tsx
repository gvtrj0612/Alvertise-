import Link from "next/link";
import {
  Sparkles,
  Mic,
  Video,
  Image,
  BarChart3,
  ArrowRight,
  Target,
  Languages,
} from "lucide-react";
import { HeroSection } from "@/components/landing/hero-section";
import { AnimatedSection } from "@/components/landing/animated-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/70 bg-background/75 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl glass flex items-center justify-center">
              <span className="text-primary font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Alvertise</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/gallery"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Gallery
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl glass px-4 py-2 text-sm font-semibold hover:scale-[1.02] transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <HeroSection />

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <AnimatedSection>
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything You Need to Create Winning Ads
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built on a multi-stage creative generation engine for copy, visuals, and video.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatedSection delay={0.1}>
            <FeatureCard
              icon={Sparkles}
              title="AI Ad Copy Generation"
              emoji="✨"
              iconColor="text-amber-500"
              iconBg="bg-amber-500/10"
              description="Chat naturally about your product and get 2-3 high-converting ad variations instantly. Supports Facebook, Instagram, Google, LinkedIn, and Twitter."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.15}>
            <FeatureCard
              icon={Mic}
              title="Voice-First Experience"
              emoji="🎙️"
              iconColor="text-rose-500"
              iconBg="bg-rose-500/10"
              description="Speak naturally to describe your product. Built-in voice recognition with auto-silence detection and AI text-to-speech responses."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <FeatureCard
              icon={Image}
              title="AI Poster Generation"
              emoji="🎨"
              iconColor="text-zinc-300"
              iconBg="bg-zinc-200/10"
              description="Generate brand-consistent ad posters with platform-specific dimensions and multiple visual directions."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.25}>
            <FeatureCard
              icon={Video}
              title="Dynamic AI Video Ads"
              emoji="🎬"
              iconColor="text-sky-500"
              iconBg="bg-sky-500/10"
              description="Create cinematic multi-scene video ads powered by AI text-to-video. Dynamic camera movements, transitions, and professional motion graphics."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.3}>
            <FeatureCard
              icon={Languages}
              title="Multi-Language Support"
              emoji="🌍"
              iconColor="text-emerald-500"
              iconBg="bg-emerald-500/10"
              description="Generate ads in English, Hindi, Kannada, Spanish, and French. Reach your global audience in their preferred language."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.35}>
            <FeatureCard
              icon={BarChart3}
              title="Analytics Dashboard"
              emoji="📊"
              iconColor="text-orange-500"
              iconBg="bg-orange-500/10"
              description="Track ad performance with real-time analytics. Monitor impressions, clicks, engagement, sentiment analysis, and campaign metrics."
            />
          </AnimatedSection>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 border-y">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <AnimatedSection>
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground">
                Three simple steps to generate professional ads
              </p>
            </div>
          </AnimatedSection>

          <div className="grid gap-12 md:grid-cols-3">
            <AnimatedSection delay={0.1}>
              <Step
                number="01"
                title="Describe Your Product"
                description="Tell Alvertise about your product, target audience, and goals. Use voice or text."
              />
            </AnimatedSection>
            <AnimatedSection delay={0.2}>
              <Step
                number="02"
                title="AI Generates Ads"
                description="Get 2-3 ad variations with headline, copy, description, CTA, and hashtags."
              />
            </AnimatedSection>
            <AnimatedSection delay={0.3}>
              <Step
                number="03"
                title="Generate Visuals & Video"
                description="Create polished posters and cinematic video concepts tuned for your target platform."
              />
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <AnimatedSection>
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Built For Every Platform
            </h2>
            <p className="text-lg text-muted-foreground">
              Optimized ad copy and dimensions for major advertising platforms
            </p>
          </div>
        </AnimatedSection>
        <AnimatedSection delay={0.2}>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {["Facebook", "Instagram", "Google Ads", "LinkedIn", "Twitter / X", "YouTube"].map(
              (platform) => (
                <div
                  key={platform}
                  className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm transition-all duration-200 hover:scale-105"
                >
                  <Target className="h-4 w-4 text-slate-700" />
                  {platform}
                </div>
              )
            )}
          </div>
        </AnimatedSection>
      </section>

      {/* CTA */}
      <AnimatedSection>
        <section className="border-t">
          <div className="max-w-7xl mx-auto px-6 py-24">
            <div className="max-w-2xl mx-auto text-center space-y-6 rounded-3xl border border-slate-200/80 bg-white/95 p-10 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Ready to Create Your Next Ad?
              </h2>
              <p className="text-lg text-slate-700">
                Sign up for free and start generating professional ad copy,
                posters, and videos in seconds.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors animate-pulse-glow"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg glass flex items-center justify-center">
                <span className="text-primary font-bold">A</span>
              </div>
              <span className="font-semibold">Alvertise</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for creative teams, founders, and student builders.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  emoji,
  iconColor,
  iconBg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  emoji?: string;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 space-y-4 transition-all duration-300 shadow-[0_14px_40px_rgba(15,23,42,0.08)] group">
      <div className={`h-12 w-12 rounded-xl ${iconBg || "bg-primary/10"} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`h-6 w-6 ${iconColor || "text-primary"}`} />
      </div>
      <h3 className="text-lg font-semibold text-slate-950 flex items-center gap-2">
        {emoji && <span>{emoji}</span>}
        {title}
      </h3>
      <p className="text-sm text-slate-700 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center space-y-4">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold shadow-sm">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
      <p className="text-slate-700">{description}</p>
    </div>
  );
}
