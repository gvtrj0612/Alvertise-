"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceRecorderState = "idle" | "listening" | "processing";

interface UseVoiceRecorderOptions {
  silenceThreshold?: number;
  silenceTimeout?: number;
  onTranscriptReady?: (text: string) => void;
}

interface UseVoiceRecorderReturn {
  state: VoiceRecorderState;
  startListening: () => Promise<void>;
  stopListening: () => void;
  audioLevel: number;
  error: string | null;
  interimTranscript: string;
}

export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {}
): UseVoiceRecorderReturn {
  const {
    silenceThreshold = 0.01,
    silenceTimeout = 1500,
    onTranscriptReady,
  } = options;

  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const isManualStopRef = useRef(false);
  const onTranscriptReadyRef = useRef(onTranscriptReady);

  useEffect(() => {
    onTranscriptReadyRef.current = onTranscriptReady;
  }, [onTranscriptReady]);

  const cleanup = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (
      audioContextRef.current &&
      audioContextRef.current.state !== "closed"
    ) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Transcribe audio blob via Whisper API
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Transcription failed");
    }

    const data = await res.json();
    return (data.text || "").trim();
  }, []);

  // Handle recording complete: transcribe and callback
  const handleRecordingComplete = useCallback(
    async (audioBlob: Blob) => {
      if (audioBlob.size < 1000) {
        // Too small, probably just noise
        setState("idle");
        return;
      }

      setState("processing");
      setInterimTranscript("Transcribing...");

      try {
        const text = await transcribeAudio(audioBlob);
        setInterimTranscript("");

        if (text.length > 0) {
          onTranscriptReadyRef.current?.(text);
        } else {
          setState("idle");
        }
      } catch (err) {
        console.error("Transcription error:", err);
        setError("Failed to transcribe audio. Please try again.");
        setInterimTranscript("");
        setState("idle");
      }
    },
    [transcribeAudio]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  const stopListening = useCallback(() => {
    isManualStopRef.current = true;
    stopRecording();
    cleanup();
    setInterimTranscript("");
    chunksRef.current = [];
    setState("idle");
  }, [cleanup, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      )
        audioContextRef.current.close();
    };
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      hasSpokenRef.current = false;
      silenceStartRef.current = null;
      isManualStopRef.current = false;
      chunksRef.current = [];
      setInterimTranscript("");

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      // AudioContext for visualizer + silence detection
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder for capturing audio to send to Whisper
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (isManualStopRef.current) {
          isManualStopRef.current = false;
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        cleanup();
        handleRecordingComplete(audioBlob);
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setState("listening");
      setInterimTranscript("Listening...");

      // Audio level monitoring + silence detection
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudioLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        setAudioLevel(rms);

        // Silence detection: stop after silence following speech
        if (rms > silenceThreshold) {
          hasSpokenRef.current = true;
          silenceStartRef.current = null;
          setInterimTranscript("Listening...");
        } else if (hasSpokenRef.current) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > silenceTimeout) {
            // Silence detected after speech - stop recording
            stopRecording();
            // onstop handler will process the audio
            return;
          }
        }

        rafIdRef.current = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      console.error("Microphone access error:", err);
      setError(
        name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone access and try again."
          : "Could not access microphone. Please check your device settings."
      );
      setState("idle");
    }
  }, [silenceThreshold, silenceTimeout, cleanup, stopRecording, handleRecordingComplete]);

  return {
    state,
    startListening,
    stopListening,
    audioLevel,
    error,
    interimTranscript,
  };
}
