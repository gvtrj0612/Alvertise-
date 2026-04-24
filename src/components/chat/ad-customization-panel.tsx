"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, Wand2 } from "lucide-react";

const themeOptions = [
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
  { value: "luxury", label: "Luxury" },
  { value: "colorful", label: "Colorful" },
  { value: "retro", label: "Retro" },
];

const audienceOptions = [
  { value: "students", label: "Students" },
  { value: "professionals", label: "Professionals" },
  { value: "families", label: "Families" },
  { value: "seniors", label: "Seniors" },
  { value: "teens", label: "Teens" },
  { value: "small-business", label: "Small Business Owners" },
];

const platformOptions = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google Ads" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter / X" },
  { value: "youtube", label: "YouTube" },
];

const toneOptions = [
  { value: "professional", label: "Professional" },
  { value: "emotional", label: "Emotional" },
  { value: "funny", label: "Funny" },
  { value: "urgent", label: "Urgent" },
  { value: "casual", label: "Casual" },
  { value: "luxury", label: "Luxury" },
  { value: "empathetic", label: "Empathetic" },
  { value: "bold", label: "Bold" },
];

const colorOptions = [
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "dark", label: "Dark" },
  { value: "vibrant", label: "Vibrant" },
  { value: "pastel", label: "Pastel" },
];

const ctaOptions = [
  { value: "Buy Now", label: "Buy Now" },
  { value: "Visit Today", label: "Visit Today" },
  { value: "Order Online", label: "Order Online" },
  { value: "Limited Offer", label: "Limited Offer" },
  { value: "Learn More", label: "Learn More" },
  { value: "Sign Up Free", label: "Sign Up Free" },
  { value: "Get Started", label: "Get Started" },
  { value: "Book Now", label: "Book Now" },
];

const languageOptions = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "kn", label: "Kannada" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];

const objectiveOptions = [
  { value: "sales", label: "Increase Sales" },
  { value: "leads", label: "Generate Leads" },
  { value: "awareness", label: "Brand Awareness" },
  { value: "traffic", label: "Drive Website Traffic" },
  { value: "app-installs", label: "App Installs" },
];

const hookStyleOptions = [
  { value: "pain-point", label: "Pain Point Hook" },
  { value: "benefit-first", label: "Benefit First" },
  { value: "question", label: "Question Hook" },
  { value: "stat-based", label: "Data / Stat Hook" },
  { value: "story", label: "Mini Story" },
  { value: "fomo", label: "FOMO / Urgency" },
];

const offerTypeOptions = [
  { value: "none", label: "No Offer" },
  { value: "discount", label: "Discount Offer" },
  { value: "free-trial", label: "Free Trial" },
  { value: "limited-time", label: "Limited-Time Deal" },
  { value: "bundle", label: "Bundle Offer" },
];

const proofStyleOptions = [
  { value: "none", label: "No Social Proof" },
  { value: "testimonial", label: "Customer Testimonial" },
  { value: "ratings", label: "Ratings & Reviews" },
  { value: "numbers", label: "Numbers / Metrics" },
  { value: "expert", label: "Expert Authority" },
];

const urgencyOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

interface AdCustomizationPanelProps {
  onCustomize: (options: CustomizationOptions) => void;
  loading?: boolean;
  initialLanguage?: string;
}

export interface CustomizationOptions {
  theme: string;
  audience: string;
  platform: string;
  tone: string;
  colorPalette: string;
  callToAction: string;
  language: string;
  objective: string;
  hookStyle: string;
  offerType: string;
  proofStyle: string;
  urgency: string;
}

export function AdCustomizationPanel({
  onCustomize,
  loading,
  initialLanguage = "en",
}: AdCustomizationPanelProps) {
  const [options, setOptions] = useState<CustomizationOptions>({
    theme: "modern",
    audience: "professionals",
    platform: "facebook",
    tone: "professional",
    colorPalette: "vibrant",
    callToAction: "Learn More",
    language: initialLanguage,
    objective: "sales",
    hookStyle: "benefit-first",
    offerType: "discount",
    proofStyle: "numbers",
    urgency: "medium",
  });

  function update(key: keyof CustomizationOptions, value: string) {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    setOptions((prev) => ({ ...prev, language: initialLanguage }));
  }, [initialLanguage]);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          Customize Your Ad
        </CardTitle>
        <CardDescription>
          Fine-tune the generated ad with manual selections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Select
            label="Theme"
            options={themeOptions}
            value={options.theme}
            onChange={(e) => update("theme", e.target.value)}
          />
          <Select
            label="Target Audience"
            options={audienceOptions}
            value={options.audience}
            onChange={(e) => update("audience", e.target.value)}
          />
          <Select
            label="Platform"
            options={platformOptions}
            value={options.platform}
            onChange={(e) => update("platform", e.target.value)}
          />
          <Select
            label="Tone"
            options={toneOptions}
            value={options.tone}
            onChange={(e) => update("tone", e.target.value)}
          />
          <Select
            label="Color Palette"
            options={colorOptions}
            value={options.colorPalette}
            onChange={(e) => update("colorPalette", e.target.value)}
          />
          <Select
            label="Call to Action"
            options={ctaOptions}
            value={options.callToAction}
            onChange={(e) => update("callToAction", e.target.value)}
          />
          <Select
            label="Language"
            options={languageOptions}
            value={options.language}
            onChange={(e) => update("language", e.target.value)}
          />
          <Select
            label="Campaign Objective"
            options={objectiveOptions}
            value={options.objective}
            onChange={(e) => update("objective", e.target.value)}
          />
          <Select
            label="Hook Style"
            options={hookStyleOptions}
            value={options.hookStyle}
            onChange={(e) => update("hookStyle", e.target.value)}
          />
          <Select
            label="Offer Type"
            options={offerTypeOptions}
            value={options.offerType}
            onChange={(e) => update("offerType", e.target.value)}
          />
          <Select
            label="Social Proof"
            options={proofStyleOptions}
            value={options.proofStyle}
            onChange={(e) => update("proofStyle", e.target.value)}
          />
          <Select
            label="Urgency Level"
            options={urgencyOptions}
            value={options.urgency}
            onChange={(e) => update("urgency", e.target.value)}
          />
          <div className="flex items-end">
            <Button
              onClick={() => onCustomize(options)}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Regenerate Ad
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
