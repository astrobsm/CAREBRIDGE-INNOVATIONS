import React from 'react';
import { Mic, Square, Pause, Play, RotateCcw, AlertCircle } from 'lucide-react';
import { useVoiceRecorder } from '../../../hooks/useVoiceRecorder';

interface VoiceRecorderProps {
  onSaved: (blob: Blob, durationSeconds: number) => void | Promise<void>;
  maxSeconds?: number;
  hint?: string;
}

const formatTime = (s: number): string => {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSaved,
  maxSeconds = 120,
  hint,
}) => {
  const r = useVoiceRecorder();
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (r.isRecording && r.durationSeconds >= maxSeconds) {
      r.stop();
    }
  }, [r, maxSeconds]);

  const handleSave = async () => {
    if (!r.audioBlob) return;
    setSaving(true);
    try {
      await onSaved(r.audioBlob, r.durationSeconds);
      r.reset();
    } finally {
      setSaving(false);
    }
  };

  if (!r.isSupported) {
    return (
      <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Voice recording is not supported in this browser. Use a recent version of Chrome, Edge, Firefox, or Safari.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${r.isRecording && !r.isPaused ? 'animate-pulse bg-red-500' : 'bg-gray-300'}`} />
          <span className="font-mono text-lg tabular-nums">{formatTime(r.durationSeconds)}</span>
          <span className="text-xs text-gray-500">/ {formatTime(maxSeconds)}</span>
        </div>
        <div className="flex items-center gap-2">
          {!r.isRecording && !r.audioBlob && (
            <button
              type="button"
              onClick={r.start}
              className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <Mic className="h-4 w-4" /> Record
            </button>
          )}
          {r.isRecording && !r.isPaused && (
            <button
              type="button"
              onClick={r.pause}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              <Pause className="h-4 w-4" /> Pause
            </button>
          )}
          {r.isRecording && r.isPaused && (
            <button
              type="button"
              onClick={r.resume}
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Play className="h-4 w-4" /> Resume
            </button>
          )}
          {r.isRecording && (
            <button
              type="button"
              onClick={() => r.stop()}
              className="flex items-center gap-2 rounded-md bg-gray-700 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Square className="h-4 w-4" /> Stop
            </button>
          )}
        </div>
      </div>

      {r.error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{r.error}</span>
        </div>
      )}

      {r.audioUrl && (
        <div className="space-y-2">
          <audio src={r.audioUrl} controls className="w-full" />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={r.reset}
              className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" /> Re-record
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save voice note'}
            </button>
          </div>
        </div>
      )}

      {hint && !r.audioBlob && !r.isRecording && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
};

export default VoiceRecorder;
