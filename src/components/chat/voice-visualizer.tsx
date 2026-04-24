"use client";

import { motion } from "framer-motion";

interface VoiceVisualizerProps {
  audioLevel: number;
  isActive: boolean;
}

export function VoiceVisualizer({ audioLevel, isActive }: VoiceVisualizerProps) {
  const scale = isActive ? 1 + audioLevel * 3 : 1;
  const opacity = isActive ? 0.15 + audioLevel * 0.6 : 0;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <motion.div
        className="absolute rounded-full bg-primary"
        animate={{
          width: `${scale * 100}%`,
          height: `${scale * 100}%`,
          opacity: opacity * 0.3,
        }}
        transition={{ duration: 0.1 }}
      />
      <motion.div
        className="absolute rounded-full bg-primary"
        animate={{
          width: `${scale * 0.85 * 100}%`,
          height: `${scale * 0.85 * 100}%`,
          opacity: opacity * 0.5,
        }}
        transition={{ duration: 0.1 }}
      />
      <motion.div
        className="absolute rounded-full bg-primary"
        animate={{
          width: `${scale * 0.7 * 100}%`,
          height: `${scale * 0.7 * 100}%`,
          opacity: opacity * 0.7,
        }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
}
