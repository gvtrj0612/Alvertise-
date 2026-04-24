"use client";

import { useState, useRef, useCallback } from "react";

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  play: (text: string) => Promise<void>;
  stop: () => void;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback(
    async (text: string): Promise<void> => {
      stop();

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("TTS request failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      return new Promise<void>((resolve, reject) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        setIsPlaying(true);

        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          objectUrlRef.current = null;
          audioRef.current = null;
          resolve();
        };

        audio.onerror = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
          objectUrlRef.current = null;
          audioRef.current = null;
          reject(new Error("Audio playback failed"));
        };

        audio.play().catch(reject);
      });
    },
    [stop]
  );

  return { isPlaying, play, stop };
}
