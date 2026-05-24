/**
 * Synthesised audio chime via Web Audio API.
 * No external asset required. Safe on mobile (will silently no-op until
 * the user has interacted with the page, per browser autoplay policy).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

interface ChimeOptions {
  /** Frequencies in Hz to play sequentially. */
  notes?: number[];
  /** Duration of each note in seconds. */
  noteDurationMs?: number;
  /** Peak gain (0..1). */
  volume?: number;
  /** Repeat the whole sequence N times. */
  repeat?: number;
}

/**
 * Play a soft bell-like chime sequence.
 *  - 'upcoming' → single ascending two-note chime (default).
 *  - 'due'      → triple ding.
 *  - 'overdue'  → urgent four-note descending pattern.
 */
export function playChime(kind: 'upcoming' | 'due' | 'overdue' = 'upcoming'): void {
  const presets: Record<typeof kind, ChimeOptions> = {
    upcoming: { notes: [880, 1320], noteDurationMs: 180, volume: 0.15, repeat: 1 },
    due:      { notes: [1320, 1320, 1320], noteDurationMs: 160, volume: 0.22, repeat: 1 },
    overdue:  { notes: [1760, 1320, 1320, 880], noteDurationMs: 200, volume: 0.28, repeat: 2 },
  };
  playChimeRaw(presets[kind]);
}

export function playChimeRaw(opts: ChimeOptions = {}): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') {
    audio.resume().catch(() => { /* ignore */ });
  }

  const notes = opts.notes ?? [880, 1320];
  const noteDur = (opts.noteDurationMs ?? 180) / 1000;
  const vol = opts.volume ?? 0.15;
  const repeat = Math.max(1, opts.repeat ?? 1);
  const gap = 0.04;

  let t = audio.currentTime + 0.02;
  for (let r = 0; r < repeat; r++) {
    for (const freq of notes) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + noteDur);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + noteDur + 0.02);
      t += noteDur + gap;
    }
    t += 0.1;
  }
}

/** Call once after a user gesture (button click) to unlock audio on iOS/Safari. */
export function unlockAudio(): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') {
    audio.resume().catch(() => { /* ignore */ });
  }
}
