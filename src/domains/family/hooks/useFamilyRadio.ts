// React hook for the Family Radio announcer.
// Manages: enable/disable, polling, dedupe via cooldown, a speech queue,
// and a rolling log of what was just announced.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelSpeech,
  collectAnnouncements,
  DEFAULT_RADIO_OPTIONS,
  isSpeechSupported,
  listVoices,
  speak,
  type Announcement,
  type RadioOptions,
} from '../services/familyRadio';

const STORAGE_KEY = 'astrohealth.family.radio.v1';
const POLL_INTERVAL_MS = 60_000; // refetch every minute
const MAX_LOG_ENTRIES = 100;

export interface RadioLogEntry extends Announcement {
  spokenAt: number;
}

interface PersistedState {
  enabled: boolean;
  options: RadioOptions;
}

function loadPersisted(): PersistedState {
  if (typeof window === 'undefined') {
    return { enabled: false, options: DEFAULT_RADIO_OPTIONS };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: false, options: DEFAULT_RADIO_OPTIONS };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      enabled: !!parsed.enabled,
      options: { ...DEFAULT_RADIO_OPTIONS, ...(parsed.options || {}) },
    };
  } catch {
    return { enabled: false, options: DEFAULT_RADIO_OPTIONS };
  }
}

function persist(state: PersistedState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function useFamilyRadio(parentId: string | undefined) {
  const initial = loadPersisted();
  const [enabled, setEnabledState] = useState<boolean>(initial.enabled);
  const [options, setOptionsState] = useState<RadioOptions>(initial.options);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(listVoices());
  const [pending, setPending] = useState<Announcement[]>([]);
  const [log, setLog] = useState<RadioLogEntry[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastPolledAt, setLastPolledAt] = useState<number | null>(null);

  // last spoken time per announcement id (cooldown tracking)
  const spokenAtRef = useRef<Map<string, number>>(new Map());
  // an in-flight speech to allow cancellation
  const isSpeakingRef = useRef(false);

  // ------------------------------------------------------------------------
  // Persist whenever enabled / options change
  // ------------------------------------------------------------------------
  useEffect(() => {
    persist({ enabled, options });
  }, [enabled, options]);

  // ------------------------------------------------------------------------
  // Voices list (loads asynchronously in some browsers)
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (!isSpeechSupported()) return;
    const update = () => setVoices(listVoices());
    update();
    window.speechSynthesis.addEventListener?.('voiceschanged', update);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', update);
    };
  }, []);

  // ------------------------------------------------------------------------
  // The speech queue. Speaks announcements one at a time, applying cooldown.
  // ------------------------------------------------------------------------
  const speakQueue = useCallback(
    async (items: Announcement[]) => {
      if (!enabled || isSpeakingRef.current) return;
      if (!isSpeechSupported()) {
        setLastError('Speech synthesis is not supported in this browser.');
        return;
      }
      const now = Date.now();
      const cooldownMs = options.cooldownMinutes * 60_000;
      const toSpeak = items.filter((a) => {
        const last = spokenAtRef.current.get(a.id);
        return !last || now - last > cooldownMs;
      });
      if (toSpeak.length === 0) return;

      isSpeakingRef.current = true;
      setSpeaking(true);
      try {
        for (const a of toSpeak) {
          try {
            await speak(a.text, options, voices);
            spokenAtRef.current.set(a.id, Date.now());
            setLog((prev) =>
              [{ ...a, spokenAt: Date.now() }, ...prev].slice(0, MAX_LOG_ENTRIES)
            );
          } catch (err) {
            setLastError(err instanceof Error ? err.message : String(err));
            break; // stop on first error so we don't spam
          }
        }
      } finally {
        isSpeakingRef.current = false;
        setSpeaking(false);
      }
    },
    [enabled, options, voices]
  );

  // ------------------------------------------------------------------------
  // Poller — fetches every POLL_INTERVAL_MS while enabled.
  // ------------------------------------------------------------------------
  const poll = useCallback(async () => {
    if (!parentId) return;
    try {
      const items = await collectAnnouncements(parentId, options);
      setPending(items);
      setLastPolledAt(Date.now());
      setLastError(null);
      if (enabled) await speakQueue(items);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
    }
  }, [parentId, options, enabled, speakQueue]);

  useEffect(() => {
    if (!parentId) return;
    // initial fetch (always — even when disabled, so the UI shows pending)
    poll();
    const id = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [parentId, poll]);

  // ------------------------------------------------------------------------
  // Public controls
  // ------------------------------------------------------------------------
  const setEnabled = useCallback(
    (next: boolean) => {
      setEnabledState(next);
      if (!next) {
        cancelSpeech();
        isSpeakingRef.current = false;
        setSpeaking(false);
      } else {
        // Speak whatever is currently pending right away.
        // Need a fresh tick so React commits the new `enabled=true`.
        setTimeout(() => {
          speakQueue(pending);
        }, 0);
      }
    },
    [pending, speakQueue]
  );

  const updateOptions = useCallback((next: Partial<RadioOptions>) => {
    setOptionsState((prev) => ({ ...prev, ...next }));
  }, []);

  const updateEnabledKind = useCallback(
    (kind: keyof RadioOptions['enabled'], on: boolean) => {
      setOptionsState((prev) => ({
        ...prev,
        enabled: { ...prev.enabled, [kind]: on },
      }));
    },
    []
  );

  const test = useCallback(async () => {
    setLastError(null);
    try {
      await speak(
        'This is the AstroHEALTH Family Radio. Sound check, one, two, three.',
        options,
        voices
      );
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
    }
  }, [options, voices]);

  const speakOne = useCallback(
    async (a: Announcement) => {
      setLastError(null);
      try {
        await speak(a.text, options, voices);
        spokenAtRef.current.set(a.id, Date.now());
        setLog((prev) =>
          [{ ...a, spokenAt: Date.now() }, ...prev].slice(0, MAX_LOG_ENTRIES)
        );
      } catch (err) {
        setLastError(err instanceof Error ? err.message : String(err));
      }
    },
    [options, voices]
  );

  const refreshNow = useCallback(() => poll(), [poll]);

  const clearLog = useCallback(() => setLog([]), []);

  const resetCooldowns = useCallback(() => {
    spokenAtRef.current.clear();
  }, []);

  return {
    // state
    enabled,
    options,
    voices,
    pending,
    log,
    speaking,
    lastError,
    lastPolledAt,
    supported: isSpeechSupported(),
    // actions
    setEnabled,
    updateOptions,
    updateEnabledKind,
    test,
    speakOne,
    refreshNow,
    clearLog,
    resetCooldowns,
  };
}
