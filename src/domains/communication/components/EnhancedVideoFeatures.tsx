// Enhanced Video Conference Features
// Camera controls, recording, virtual backgrounds, and presenter mode

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  Camera,
  Settings,
  Circle,
  Square,
  Image as ImageIcon,
  Sparkles,
  Monitor,
  Layout,
  Download,
  Pause,
  Play,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Virtual background options
export const virtualBackgrounds = [
  { id: 'none', name: 'None', type: 'none' as const },
  { id: 'blur', name: 'Blur', type: 'blur' as const },
  { id: 'office', name: 'Office', type: 'image' as const, url: '/backgrounds/office.jpg' },
  { id: 'hospital', name: 'Hospital', type: 'image' as const, url: '/backgrounds/hospital.jpg' },
  { id: 'nature', name: 'Nature', type: 'image' as const, url: '/backgrounds/nature.jpg' },
  { id: 'abstract', name: 'Abstract', type: 'image' as const, url: '/backgrounds/abstract.jpg' },
  { id: 'solid-blue', name: 'Blue', type: 'color' as const, color: '#3b82f6' },
  { id: 'solid-green', name: 'Green', type: 'color' as const, color: '#22c55e' },
  { id: 'solid-gray', name: 'Gray', type: 'color' as const, color: '#6b7280' },
];

// Device info interface
interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: 'videoinput' | 'audioinput' | 'audiooutput';
}

// Camera and media hook
export function useMediaDevices() {
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([]);
  const [audioInputDevices, setAudioInputDevices] = useState<DeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<DeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get available devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      setVideoDevices(
        devices
          .filter(d => d.kind === 'videoinput')
          .map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}`, kind: d.kind }))
      );
      
      setAudioInputDevices(
        devices
          .filter(d => d.kind === 'audioinput')
          .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`, kind: d.kind }))
      );
      
      setAudioOutputDevices(
        devices
          .filter(d => d.kind === 'audiooutput')
          .map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}`, kind: d.kind }))
      );
    } catch (err) {
      console.error('Error enumerating devices:', err);
      setError('Failed to get media devices');
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setError(null);
      
      // Update device selection
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        setSelectedVideoDevice(videoTrack.getSettings().deviceId || '');
      }
      
      return newStream;
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Failed to access camera. Please check permissions.');
      return null;
    }
  }, [stream, selectedAudioInput]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Switch camera
  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
    return startCamera(deviceId);
  }, [startCamera]);

  // Toggle video track
  const toggleVideo = useCallback((enabled: boolean) => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, [stream]);

  // Toggle audio track
  const toggleAudio = useCallback((enabled: boolean) => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, [stream]);

  // Initialize on mount
  useEffect(() => {
    enumerateDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, [enumerateDevices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    videoDevices,
    audioInputDevices,
    audioOutputDevices,
    selectedVideoDevice,
    selectedAudioInput,
    selectedAudioOutput,
    setSelectedAudioInput,
    setSelectedAudioOutput,
    stream,
    error,
    startCamera,
    stopCamera,
    switchCamera,
    toggleVideo,
    toggleAudio,
  };
}

// Recording hook
export function useMediaRecorder(stream: MediaStream | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording
  const startRecording = useCallback(() => {
    if (!stream) {
      toast.error('No media stream available');
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setIsRecording(false);
        setIsPaused(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      toast.success('Recording started');
    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error('Failed to start recording');
    }
  }, [stream]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
        setIsPaused(false);
        toast.success('Recording resumed');
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setIsPaused(true);
        toast.success('Recording paused');
      }
    }
  }, [isRecording, isPaused]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      toast.success('Recording stopped');
    }
  }, [isRecording]);

  // Download recording
  const downloadRecording = useCallback(() => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Recording downloaded');
    }
  }, [recordedBlob]);

  // Format duration
  const formatDuration = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    isPaused,
    recordingDuration,
    recordedBlob,
    startRecording,
    pauseRecording,
    stopRecording,
    downloadRecording,
    formatDuration,
  };
}

// Virtual background hook (simplified - would need ML library for real implementation)
export function useVirtualBackground(_videoRef: React.RefObject<HTMLVideoElement>) {
  const [selectedBackground, setSelectedBackground] = useState(virtualBackgrounds[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Apply virtual background (simplified demo)
  const applyBackground = useCallback((background: typeof virtualBackgrounds[0]) => {
    setSelectedBackground(background);
    setIsProcessing(true);
    
    // In a real implementation, this would use TensorFlow.js or similar
    // for body segmentation and background replacement
    setTimeout(() => {
      setIsProcessing(false);
      if (background.type !== 'none') {
        toast.success(`Applied ${background.name} background`);
      }
    }, 500);
  }, []);

  return {
    selectedBackground,
    isProcessing,
    applyBackground,
    backgrounds: virtualBackgrounds,
  };
}

// Camera preview component
interface CameraPreviewProps {
  stream: MediaStream | null;
  isVideoOn: boolean;
  userName: string;
  virtualBackground?: typeof virtualBackgrounds[0];
  className?: string;
}

export function CameraPreview({ stream, isVideoOn, userName, virtualBackground, className = '' }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden ${className}`}>
      {isVideoOn && stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              filter: virtualBackground?.type === 'blur' ? 'blur(0px)' : 'none',
            }}
          />
          {/* Virtual background overlay (simplified) */}
          {virtualBackground?.type === 'color' && (
            <div
              className="absolute inset-0 mix-blend-multiply pointer-events-none"
              style={{ backgroundColor: virtualBackground.color }}
            />
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {(userName || '??').split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

// Device settings modal component
interface DeviceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  videoDevices: DeviceInfo[];
  audioInputDevices: DeviceInfo[];
  audioOutputDevices: DeviceInfo[];
  selectedVideoDevice: string;
  selectedAudioInput: string;
  selectedAudioOutput: string;
  onVideoDeviceChange: (deviceId: string) => void;
  onAudioInputChange: (deviceId: string) => void;
  onAudioOutputChange: (deviceId: string) => void;
}

export function DeviceSettingsModal({
  isOpen,
  onClose,
  videoDevices,
  audioInputDevices,
  audioOutputDevices,
  selectedVideoDevice,
  selectedAudioInput,
  selectedAudioOutput,
  onVideoDeviceChange,
  onAudioInputChange,
  onAudioOutputChange,
}: DeviceSettingsProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings size={24} />
            Device Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Camera selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Camera size={16} />
              Camera
            </label>
            <select
              value={selectedVideoDevice}
              onChange={(e) => onVideoDeviceChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              title="Select camera device"
            >
              {videoDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          {/* Microphone selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mic size={16} />
              Microphone
            </label>
            <select
              value={selectedAudioInput}
              onChange={(e) => onAudioInputChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              title="Select microphone device"
            >
              {audioInputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          {/* Speaker selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Monitor size={16} />
              Speaker
            </label>
            <select
              value={selectedAudioOutput}
              onChange={(e) => onAudioOutputChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              title="Select speaker device"
            >
              {audioOutputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// Virtual background selector component
interface VirtualBackgroundSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBackground: typeof virtualBackgrounds[0];
  onSelectBackground: (bg: typeof virtualBackgrounds[0]) => void;
  onUploadCustom: (file: File) => void;
}

export function VirtualBackgroundSelector({
  isOpen,
  onClose,
  selectedBackground,
  onSelectBackground,
  onUploadCustom,
}: VirtualBackgroundSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={24} className="text-purple-500" />
            Virtual Background
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
            ×
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {virtualBackgrounds.map((bg) => (
            <button
              key={bg.id}
              onClick={() => onSelectBackground(bg)}
              className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                selectedBackground.id === bg.id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {bg.type === 'none' ? (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <VideoOff size={24} className="text-gray-400" />
                </div>
              ) : bg.type === 'blur' ? (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-medium">Blur</span>
                </div>
              ) : bg.type === 'color' ? (
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: bg.color }}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <ImageIcon size={20} className="text-gray-400" />
                </div>
              )}
              <span className="absolute bottom-1 left-1 right-1 text-xs text-center bg-black/50 text-white rounded px-1 py-0.5 truncate">
                {bg.name}
              </span>
            </button>
          ))}
          
          {/* Upload custom */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-video rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-gray-400 transition-colors"
          >
            <ImageIcon size={24} className="text-gray-400 mb-1" />
            <span className="text-xs text-gray-500">Upload</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          title="Upload custom background image"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadCustom(file);
          }}
        />
      </div>
    </div>
  );
}

// Recording controls component
interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  hasRecording: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onDownload: () => void;
  formatDuration: (seconds: number) => string;
}

export function RecordingControls({
  isRecording,
  isPaused,
  duration,
  hasRecording,
  onStart,
  onPause,
  onStop,
  onDownload,
  formatDuration,
}: RecordingControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
        >
          <Circle size={14} className="fill-current" />
          Record
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg">
            <span className={`w-2 h-2 bg-red-500 rounded-full ${!isPaused ? 'animate-pulse' : ''}`} />
            <span className="font-mono text-sm">{formatDuration(duration)}</span>
          </div>
          <button
            onClick={onPause}
            className="p-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            title={isPaused ? "Resume recording" : "Pause recording"}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            onClick={onStop}
            className="p-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            title="Stop recording"
          >
            <Square size={16} />
          </button>
        </>
      )}
      {hasRecording && !isRecording && (
        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
        >
          <Download size={14} />
          Download
        </button>
      )}
    </div>
  );
}

// Presenter mode layout component
interface PresenterModeLayoutProps {
  presenterStream: MediaStream | null;
  presenterName: string;
  presentationContent: React.ReactNode;
  isPresenterVideoOn: boolean;
  layout: 'side-by-side' | 'picture-in-picture' | 'presentation-only';
  onLayoutChange: (layout: 'side-by-side' | 'picture-in-picture' | 'presentation-only') => void;
}

export function PresenterModeLayout({
  presenterStream,
  presenterName,
  presentationContent,
  isPresenterVideoOn,
  layout,
  onLayoutChange,
}: PresenterModeLayoutProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && presenterStream) {
      videoRef.current.srcObject = presenterStream;
    }
  }, [presenterStream]);

  return (
    <div className="relative w-full h-full">
      {/* Layout controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/50 rounded-lg p-1">
        <button
          onClick={() => onLayoutChange('side-by-side')}
          className={`p-2 rounded ${layout === 'side-by-side' ? 'bg-white/20' : 'hover:bg-white/10'}`}
          title="Side by Side"
        >
          <Layout size={16} className="text-white" />
        </button>
        <button
          onClick={() => onLayoutChange('picture-in-picture')}
          className={`p-2 rounded ${layout === 'picture-in-picture' ? 'bg-white/20' : 'hover:bg-white/10'}`}
          title="Picture in Picture"
        >
          <Monitor size={16} className="text-white" />
        </button>
        <button
          onClick={() => onLayoutChange('presentation-only')}
          className={`p-2 rounded ${layout === 'presentation-only' ? 'bg-white/20' : 'hover:bg-white/10'}`}
          title="Presentation Only"
        >
          <Video size={16} className="text-white" />
        </button>
      </div>

      {layout === 'side-by-side' ? (
        // Side by side: 50/50 split
        <div className="flex h-full gap-2">
          {/* Presenter video */}
          <div className="w-1/2 bg-gray-900 rounded-xl overflow-hidden">
            {isPresenterVideoOn && presenterStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                  {(presenterName || '??').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 text-white rounded-lg text-sm">
              {presenterName} (Presenter)
            </div>
          </div>
          
          {/* Presentation */}
          <div className="w-1/2 bg-gray-800 rounded-xl overflow-hidden">
            {presentationContent}
          </div>
        </div>
      ) : layout === 'picture-in-picture' ? (
        // Picture in picture: Large presentation, small presenter
        <div className="relative h-full">
          {/* Large presentation */}
          <div className="w-full h-full bg-gray-800 rounded-xl overflow-hidden">
            {presentationContent}
          </div>
          
          {/* Small presenter */}
          <div className="absolute bottom-4 right-4 w-48 aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-xl border border-gray-700">
            {isPresenterVideoOn && presenterStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {(presenterName || '??').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Presentation only
        <div className="w-full h-full bg-gray-800 rounded-xl overflow-hidden">
          {presentationContent}
        </div>
      )}
    </div>
  );
}
