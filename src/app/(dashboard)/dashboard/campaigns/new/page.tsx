"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";

const platformOptions = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google Ads" },
  { value: "twitter", label: "Twitter / X" },
  { value: "linkedin", label: "LinkedIn" },
];

const budgetOptions = [
  { value: "low", label: "Low ($100-500/mo)" },
  { value: "medium", label: "Medium ($500-2,000/mo)" },
  { value: "high", label: "High ($2,000-10,000/mo)" },
  { value: "enterprise", label: "Enterprise ($10,000+/mo)" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [budget, setBudget] = useState("medium");
  const [targetUrl, setTargetUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const budgetMap: Record<string, number> = {
        low: 300,
        medium: 1000,
        high: 5000,
        enterprise: 15000,
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          platform,
          budget: budgetMap[budget] || 0,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create campaign");
      }

      router.push("/dashboard/campaigns");
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Campaign</h1>
          <p className="text-muted-foreground mt-1">
            Set up a new advertising campaign
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Details</CardTitle>
            <CardDescription>
              Basic information about your campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Campaign Name"
              placeholder="e.g. Summer Sale 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Textarea
              label="Description"
              placeholder="Describe the goals and strategy of this campaign..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              label="Target URL"
              type="url"
              placeholder="https://yoursite.com/landing"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Platform and budget */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Platform & Budget</CardTitle>
            <CardDescription>
              Choose where your ads will run and set your budget
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Platform"
              options={platformOptions}
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
            <Select
              label="Budget Range"
              options={budgetOptions}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Schedule</CardTitle>
            <CardDescription>
              Set the start and end dates for your campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Campaign
              </>
            )}
          </Button>
          <Link href="/dashboard/campaigns">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
