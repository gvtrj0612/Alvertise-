"use client";

import { useCallback, useRef, useEffect } from "react";
import axios from "axios";

type EngagementType = "impression" | "click" | "like" | "share";

export function useEngagement() {
  const trackedImpressions = useRef<Set<string>>(new Set());

  const trackEngagement = useCallback(
    async (adId: string, type: EngagementType) => {
      // Prevent duplicate impression tracking per session
      if (type === "impression") {
        if (trackedImpressions.current.has(adId)) return;
        trackedImpressions.current.add(adId);
      }

      try {
        await axios.post("/api/ads/engagement", { adId, type });
      } catch (error) {
        // Silently fail - engagement tracking shouldn't break the UI
        console.error(`Failed to track ${type} for ad ${adId}:`, error);
      }
    },
    []
  );

  return { trackEngagement, trackedImpressions };
}

// Separate hook for impression tracking via IntersectionObserver
export function useImpressionTracker(
  adId: string,
  trackEngagement: (adId: string, type: EngagementType) => Promise<void>
) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !adId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackEngagement(adId, "impression");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [adId, trackEngagement]);

  return ref;
}
