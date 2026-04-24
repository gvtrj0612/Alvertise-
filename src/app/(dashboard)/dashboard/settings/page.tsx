"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUIStore } from "@/store/ui-store";
import { Save, Loader2, CreditCard, User, Palette, Shield } from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  plan: string;
  _count: { ads: number; campaigns: number };
}

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>
        <TabsContent value="billing">
          <BillingSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileSettings() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data: UserData) => {
        setName(data.name);
        setEmail(data.email);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (res.ok) {
        setMessage("Profile updated successfully");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update profile");
      }
    } catch {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal details and public profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {message && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {message}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </form>
  );
}

function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setMessage("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to change password");
      }
    } catch {
      setError("Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleChangePassword} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your account password. You will need your current password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
          {message && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {message}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving || !currentPassword || !newPassword}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Changing...
          </>
        ) : (
          <>
            <Shield className="mr-2 h-4 w-4" />
            Change Password
          </>
        )}
      </Button>
    </form>
  );
}

function AppearanceSettings() {
  const { theme, setTheme } = useUIStore();

  const languageOptions = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Theme
          </CardTitle>
          <CardDescription>Choose your preferred appearance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setTheme("light");
                document.documentElement.classList.remove("dark");
              }}
              className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                theme === "light"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="w-full h-20 rounded-md bg-white border flex items-center justify-center">
                <div className="w-3/4 space-y-1.5">
                  <div className="h-2 rounded bg-gray-200 w-full" />
                  <div className="h-2 rounded bg-gray-200 w-2/3" />
                </div>
              </div>
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => {
                setTheme("dark");
                document.documentElement.classList.add("dark");
              }}
              className={`flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                theme === "dark"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="w-full h-20 rounded-md bg-gray-900 border border-gray-700 flex items-center justify-center">
                <div className="w-3/4 space-y-1.5">
                  <div className="h-2 rounded bg-gray-700 w-full" />
                  <div className="h-2 rounded bg-gray-700 w-2/3" />
                </div>
              </div>
              <span className="text-sm font-medium">Dark</span>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Language</CardTitle>
          <CardDescription>Select your preferred language</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            options={languageOptions}
            defaultValue="en"
            className="max-w-xs"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function BillingSettings() {
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => setUserData(data))
      .catch(() => {});
  }, []);

  const adCount = userData?._count?.ads ?? 0;
  const campaignCount = userData?._count?.campaigns ?? 0;
  const plan = userData?.plan ?? "free";
  const maxAds = plan === "free" ? 10 : 100;
  const maxCampaigns = plan === "free" ? 5 : 50;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg capitalize">{plan} Plan</h3>
                <Badge>Current</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {maxAds} ad generations per month, {maxCampaigns} active campaigns
              </p>
            </div>
            {plan === "free" && <Button>Upgrade to Pro</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Ad Generations</span>
              <span className="font-medium">{adCount} / {maxAds}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min((adCount / maxAds) * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Campaigns</span>
              <span className="font-medium">{campaignCount} / {maxCampaigns}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min((campaignCount / maxCampaigns) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
