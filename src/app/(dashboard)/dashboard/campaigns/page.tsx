"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal, ModalHeader, ModalTitle, ModalDescription } from "@/components/ui/modal";
import {
  Plus,
  Search,
  MoreVertical,
  Calendar,
  Image as ImageIcon,
  Pause,
  Play,
  Trash2,
  FolderOpen,
  Loader2,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  budget: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count: { ads: number };
}

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "warning" | "secondary" | "default" }
> = {
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  completed: { label: "Completed", variant: "secondary" },
  draft: { label: "Draft", variant: "default" },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status } : c))
        );
      }
    } catch {
      // ignore
    }
    setMenuOpen(null);
  }

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage and organize your ad campaigns
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? "Try adjusting your search terms"
              : "Create your first campaign to get started"}
          </p>
          {!search && (
            <Link href="/dashboard/campaigns/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((campaign) => {
            const status = statusConfig[campaign.status] || statusConfig.draft;
            return (
              <Card key={campaign.id} className="group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold truncate">
                          {campaign.name}
                        </h3>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <ImageIcon className="h-4 w-4" />
                          {campaign._count.ads} ads
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {new Date(campaign.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>
                        <Badge variant="outline" className="font-normal">
                          {campaign.platform}
                        </Badge>
                        {campaign.budget > 0 && (
                          <span className="font-medium text-foreground">
                            ${campaign.budget.toLocaleString()}/mo
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setMenuOpen(
                            menuOpen === campaign.id ? null : campaign.id
                          )
                        }
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {menuOpen === campaign.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuOpen(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-md border bg-card shadow-lg p-1">
                            {campaign.status === "active" && (
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent"
                                onClick={() =>
                                  handleStatusChange(campaign.id, "paused")
                                }
                              >
                                <Pause className="h-4 w-4" />
                                Pause
                              </button>
                            )}
                            {(campaign.status === "paused" ||
                              campaign.status === "draft") && (
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent"
                                onClick={() =>
                                  handleStatusChange(campaign.id, "active")
                                }
                              >
                                <Play className="h-4 w-4" />
                                {campaign.status === "draft"
                                  ? "Activate"
                                  : "Resume"}
                              </button>
                            )}
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-destructive"
                              onClick={() => {
                                setDeleteTarget(campaign);
                                setMenuOpen(null);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <ModalHeader>
          <ModalTitle>Delete campaign</ModalTitle>
          <ModalDescription>
            Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action
            cannot be undone and all associated ads will be removed.
          </ModalDescription>
        </ModalHeader>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
