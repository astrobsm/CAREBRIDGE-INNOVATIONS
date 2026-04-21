import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseVoiceRecorderResult {
  isSupported: boolean;
  isRecording: boolean;
  isPaused: boolean;
  error: string | null;
  durationSeconds: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

/**
 * Voice recorder hook backed by MediaRecorder.
 * Produces an audio Blob (audio/webm or audio/mp4 depending on browser).
 * Works fully offline once microphone permission is granted.
 */
export function useVoiceRecorder(): UseVoiceRecorderResult {
  const isSupported =
    typeof navigator !== 'undefined' &&
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof window.MediaRecorder !== 'undefined';

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);

  useEffect(() => () => {
    cleanup();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [cleanup, audioUrl]);

  const reset = useCallback(() => {
    cleanup();
    chunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
    setDurationSeconds(0);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setError(null);
  }, [cleanup, audioUrl]);

  const start = useCallback(async () => {
    setError(null);
    if (!isSupported) {
      setError('Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const mimeType = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(250);
      startTimeRef.current = Date.now();
      setDurationSeconds(0);
      tickRef.current = window.setInterval(() => {
        setDurationSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 250);
      setIsRecording(true);
      setIsPaused(false);
    } catch (err: any) {
      setError(err?.message || 'Microphone permission denied.');
      cleanup();
    }
  }, [isSupported, cleanup]);

  const stop = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setIsRecording(false);
        setIsPaused(false);
        if (tickRef.current) clearInterval(tickRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        recorderRef.current = null;
        streamRef.current = null;
        resolve(blob);
      };
      try {
        recorder.stop();
      } catch {
        resolve(null);
      }
    });
  }, []);

  const pause = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state === 'recording') {
      r.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state === 'paused') {
      r.resume();
      setIsPaused(false);
    }
  }, []);

  return {
    isSupported,
    isRecording,
    isPaused,
    error,
    durationSeconds,
    audioBlob,
    audioUrl,
    start,
    stop,
    pause,
    resume,
    reset,
  };
}
