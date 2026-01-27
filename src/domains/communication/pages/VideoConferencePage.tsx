import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  Users,
  MessageSquare,
  Maximize,
  Minimize,
  Hand,
  Copy,
  ChevronLeft,
  ChevronRight,
  Upload,
  Presentation,
  X,
  Send,
  Grid3X3,
  User,
  Crown,
  Plus,
  Clock,
  Link2,
  Settings,
  Sparkles,
  Layout,
  Camera,
  FileText,
  Download,
  Mail,
  MessageCircle,
  ScrollText,
  Loader2,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Bell,
  DoorOpen,
} from 'lucide-react';
import {
  useMediaDevices,
  useMediaRecorder,
  useVirtualBackground,
  DeviceSettingsModal,
  VirtualBackgroundSelector,
  RecordingControls,
} from '../components/EnhancedVideoFeatures';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import MeetingMinutesService from '../../../services/meetingMinutesService';
import WebRTCSignalingService from '../../../services/webrtcSignalingService';
import type { 
  VideoConference,
  MeetingMinutes,
  MeetingTranscriptSegment, 
  ConferenceParticipant, 
  PresentationSlide,
  ConferenceChatMessage,
  RTCSignalingMessage,
} from '../../../types';

// Supabase client for real-time subscriptions
let supabaseClient: ReturnType<typeof import('@supabase/supabase-js').createClient> | null = null;

// Initialize Supabase client dynamically
const getSupabaseClient = async () => {
  if (supabaseClient) return supabaseClient;
  try {
    const { supabase } = await import('../../../services/supabaseClient');
    supabaseClient = supabase;
    return supabase;
  } catch {
    return null;
  }
};

// Simulated participant video component with real video stream support
function ParticipantVideo({ 
  participant, 
  isLarge = false,
  isSelf = false,
  videoStream = null,
}: { 
  participant: ConferenceParticipant; 
  isLarge?: boolean;
  isSelf?: boolean;
  videoStream?: MediaStream | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Connect video stream to video element
  useEffect(() => {
    if (videoRef.current && videoStream && participant.isVideoOn) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream, participant.isVideoOn]);

  return (
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden ${
      isLarge ? 'aspect-video' : 'aspect-video'
    }`}>
      {/* Video element - shows actual camera feed when video is on */}
      {participant.isVideoOn && videoStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf} // Mute self to prevent echo
          className="w-full h-full object-cover"
          style={{
            transform: isSelf ? 'scaleX(-1)' : 'none', // Mirror self-view
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className={`${isLarge ? 'w-32 h-32' : 'w-20 h-20'} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white ${isLarge ? 'text-4xl' : 'text-2xl'} font-bold`}>
            {participant.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        </div>
      )}

      {/* Participant info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium truncate">
              {participant.userName} {isSelf && '(You)'}
            </span>
            {participant.isHost && (
              <Crown size={14} className="text-yellow-400" />
            )}
            {participant.isPresenter && (
              <Presentation size={14} className="text-green-400" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {participant.isMuted ? (
              <MicOff size={14} className="text-red-400" />
            ) : (
              <Mic size={14} className="text-white" />
            )}
            {participant.isHandRaised && (
              <Hand size={14} className="text-yellow-400 animate-bounce" />
            )}
          </div>
        </div>
      </div>

      {/* Screen sharing indicator */}
      {participant.isScreenSharing && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
          <Monitor size={12} />
          Sharing
        </div>
      )}
    </div>
  );
}

// Slide presenter component
function SlidePresenter({
  slides,
  currentIndex,
  onNavigate,
  onUpload,
  onClose,
  isPresenter,
}: {
  slides: PresentationSlide[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onUpload: (files: FileList) => void;
  onClose: () => void;
  isPresenter: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentSlide = slides[currentIndex];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isPresenter) return;
    if (e.key === 'ArrowRight' || e.key === 'Space') {
      if (currentIndex < slides.length - 1) {
        onNavigate(currentIndex + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      if (currentIndex > 0) {
        onNavigate(currentIndex - 1);
      }
    }
  }, [isPresenter, currentIndex, slides.length, onNavigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Presentation header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Presentation className="text-green-400" size={20} />
          <span className="text-white font-medium">Presentation Mode</span>
          <span className="text-gray-400 text-sm">
            Slide {currentIndex + 1} of {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isPresenter && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Upload size={16} />
              Add Slides
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onUpload(e.target.files)}
        />
      </div>

      {/* Main slide area */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {slides.length === 0 ? (
          <div className="text-center">
            <Presentation className="w-20 h-20 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Slides Uploaded</h3>
            <p className="text-gray-400 mb-6">
              {isPresenter 
                ? 'Upload images to start your presentation'
                : 'Waiting for presenter to share slides'}
            </p>
            {isPresenter && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <Upload size={20} />
                Upload Slides
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Current slide */}
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-4xl max-h-full"
            >
              <img
                src={currentSlide.imageUrl}
                alt={currentSlide.title || `Slide ${currentIndex + 1}`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
              />
              {currentSlide.title && (
                <p className="text-center text-white mt-4 text-lg">{currentSlide.title}</p>
              )}
            </motion.div>

            {/* Navigation arrows */}
            {isPresenter && (
              <>
                <button
                  onClick={() => onNavigate(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={28} className="text-white" />
                </button>
                <button
                  onClick={() => onNavigate(currentIndex + 1)}
                  disabled={currentIndex === slides.length - 1}
                  className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={28} className="text-white" />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Slide thumbnails */}
      {slides.length > 0 && (
        <div className="p-4 border-t border-gray-700 overflow-x-auto">
          <div className="flex gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => isPresenter && onNavigate(index)}
                className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  index === currentIndex
                    ? 'border-blue-500'
                    : 'border-transparent hover:border-gray-500'
                } ${!isPresenter && 'cursor-default'}`}
              >
                <img
                  src={slide.thumbnailUrl || slide.imageUrl}
                  alt={`Slide ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Presenter notes */}
      {isPresenter && currentSlide?.notes && (
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Speaker Notes</h4>
          <p className="text-white text-sm">{currentSlide.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function VideoConferencePage() {
  const { conferenceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Conference state
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Screen sharing stream
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // UI state
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('speaker');
  const [chatMessage, setChatMessage] = useState('');

  // Enhanced UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showVirtualBackground, setShowVirtualBackground] = useState(false);
  const [presenterLayout, setPresenterLayout] = useState<'side-by-side' | 'picture-in-picture' | 'presentation-only'>('side-by-side');

  // Presentation state
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPresenter, setIsPresenter] = useState(false);

  // Conference data
  const [conference, setConference] = useState<VideoConference | null>(null);
  const [participants, setParticipants] = useState<ConferenceParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<ConferenceChatMessage[]>([]);

  // Join with Code State
  const [showJoinWithCode, setShowJoinWithCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoiningWithCode, setIsJoiningWithCode] = useState(false);
  const [joinCodeError, setJoinCodeError] = useState('');

  // Meeting Minutes & Transcription State
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinutes | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptSegments, setTranscriptSegments] = useState<MeetingTranscriptSegment[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showMinutesModal, setShowMinutesModal] = useState(false);
  const [isGeneratingMinutes, setIsGeneratingMinutes] = useState(false);
  const [minutesGenerated, setMinutesGenerated] = useState(false);

  // WebRTC & Remote Streams State
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isWebRTCInitialized, setIsWebRTCInitialized] = useState(false);

  // Waiting Room State
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [waitingParticipants, setWaitingParticipants] = useState<ConferenceParticipant[]>([]);
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  const [waitingRoomNotification, setWaitingRoomNotification] = useState(false);

  // Enhanced features hooks
  const {
    videoDevices,
    audioInputDevices,
    audioOutputDevices,
    selectedVideoDevice,
    selectedAudioInput,
    selectedAudioOutput,
    setSelectedAudioInput,
    setSelectedAudioOutput,
    stream,
    error: mediaError,
    startCamera,
    switchCamera,
    toggleVideo: toggleVideoTrack,
    toggleAudio: toggleAudioTrack,
  } = useMediaDevices();

  const {
    isRecording,
    isPaused,
    recordingDuration,
    recordedBlob,
    startRecording,
    pauseRecording,
    stopRecording,
    downloadRecording,
    formatDuration,
  } = useMediaRecorder(stream);

  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    selectedBackground,
    applyBackground,
  } = useVirtualBackground(videoRef);

  // Start camera on join
  useEffect(() => {
    if (isJoined && !stream) {
      startCamera();
    }
  }, [isJoined, stream, startCamera]);

  // Cleanup screen sharing on unmount
  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [screenStream]);

  // Handle custom background upload
  const handleCustomBackgroundUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const customBg = {
        id: `custom-${uuidv4()}`,
        name: 'Custom',
        type: 'image' as const,
        url: e.target?.result as string,
      };
      applyBackground(customBg as any);
    };
    reader.readAsDataURL(file);
  };

  // Load or create conference
  useEffect(() => {
    const loadConference = async () => {
      if (conferenceId && conferenceId !== 'new') {
        const conf = await db.videoConferences.get(conferenceId);
        if (conf) {
          setConference(conf);
          setParticipants(conf.participants);
          setChatMessages(conf.chatMessages || []);
          if (conf.presentation) {
            setSlides(conf.presentation.slides);
            setCurrentSlideIndex(conf.presentation.currentSlideIndex);
            setShowPresentation(conf.presentation.isActive);
          }
          // Update waiting participants
          const waiting = conf.participants.filter(p => p.admissionStatus === 'waiting' && !p.leftAt);
          setWaitingParticipants(waiting);
          if (waiting.length > 0 && conf.hostId === user?.id) {
            setWaitingRoomNotification(true);
          }
          // Load existing meeting minutes if any
          const existingMinutes = await db.meetingMinutes.where('conferenceId').equals(conf.id).first();
          if (existingMinutes) {
            setMeetingMinutes(existingMinutes);
            setTranscriptSegments(existingMinutes.transcript || []);
            if (existingMinutes.status !== 'draft') {
              setMinutesGenerated(true);
            }
          }
        }
      }
    };
    loadConference();
  }, [conferenceId, user?.id]);

  // Subscribe to real-time conference updates via Supabase AND poll for updates
  useEffect(() => {
    if (!conferenceId || conferenceId === 'new') return;

    let subscription: { unsubscribe: () => void } | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;

    // Process conference updates (from real-time or polling)
    const processConferenceUpdate = async (conferenceData: Record<string, unknown>) => {
      // Parse participants from Supabase format
      const supabaseParticipants = (conferenceData.participants as ConferenceParticipant[]) || [];
      
      // Update local state with Supabase data
      const updatedConf: VideoConference = {
        id: conferenceData.id as string,
        roomId: conferenceData.room_id as string,
        roomCode: conferenceData.room_code as string,
        title: conferenceData.title as string,
        description: conferenceData.description as string,
        scheduledStart: conferenceData.scheduled_start ? new Date(conferenceData.scheduled_start as string) : undefined,
        scheduledEnd: conferenceData.scheduled_end ? new Date(conferenceData.scheduled_end as string) : undefined,
        actualStart: conferenceData.actual_start ? new Date(conferenceData.actual_start as string) : undefined,
        actualEnd: conferenceData.actual_end ? new Date(conferenceData.actual_end as string) : undefined,
        status: conferenceData.status as 'scheduled' | 'waiting' | 'active' | 'ended' | 'cancelled',
        hostId: conferenceData.host_id as string,
        coHostIds: (conferenceData.co_host_ids as string[]) || [],
        hospitalId: conferenceData.hospital_id as string,
        participants: supabaseParticipants,
        settings: (conferenceData.settings as VideoConference['settings']) || {},
        chatEnabled: conferenceData.chat_enabled as boolean,
        chatMessages: (conferenceData.chat_messages as ConferenceChatMessage[]) || [],
        presentation: conferenceData.presentation as VideoConference['presentation'],
        createdAt: new Date(conferenceData.created_at as string),
        updatedAt: new Date(conferenceData.updated_at as string),
      };

      setConference(updatedConf);
      setParticipants(supabaseParticipants);

      // Also update local IndexedDB to keep in sync
      await db.videoConferences.put(updatedConf);

      // Update waiting participants for host
      const waiting = supabaseParticipants.filter(
        (p: ConferenceParticipant) => p.admissionStatus === 'waiting' && !p.leftAt
      );
      setWaitingParticipants(waiting);
      if (waiting.length > 0 && updatedConf.hostId === user?.id) {
        setWaitingRoomNotification(true);
      }

      // Check if current user was admitted
      if (user) {
        const myParticipant = supabaseParticipants.find((p: ConferenceParticipant) => p.userId === user.id);
        if (myParticipant?.admissionStatus === 'admitted' && isInWaitingRoom) {
          setIsInWaitingRoom(false);
          setIsJoined(true);
          toast.success('You have been admitted to the meeting!');
        } else if (myParticipant?.admissionStatus === 'rejected') {
          toast.error('Your request to join was declined');
          navigate('/communication/chat');
        }
      }

      // Connect to new admitted participants
      if (isJoined && isWebRTCInitialized && user) {
        const newAdmitted = supabaseParticipants.filter(
          (p: ConferenceParticipant) =>
            p.admissionStatus === 'admitted' &&
            p.userId !== user.id &&
            !p.leftAt &&
            !remoteStreams.has(p.userId)
        );
        for (const participant of newAdmitted) {
          console.log('[VideoConference] Creating offer to new participant:', participant.userName);
          WebRTCSignalingService.createOffer(
            conferenceId,
            user.id,
            `${user.firstName} ${user.lastName}`,
            participant.userId
          );
        }
      }
    };

    const setupRealtimeSubscription = async () => {
      const supabase = await getSupabaseClient();
      if (!supabase) return;

      // Subscribe to conference changes
      subscription = supabase
        .channel(`conference:${conferenceId}:updates`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'video_conferences',
            filter: `id=eq.${conferenceId}`,
          },
          async (payload: { new?: Record<string, unknown> }) => {
            if (payload.new) {
              console.log('[VideoConference] Real-time update received');
              await processConferenceUpdate(payload.new);
            }
          }
        )
        .subscribe((status) => {
          console.log('[VideoConference] Conference subscription status:', status);
        });

      // Polling fallback - check for conference updates every 3 seconds
      pollingInterval = setInterval(async () => {
        try {
          const { data: confData, error } = await supabase
            .from('video_conferences')
            .select('*')
            .eq('id', conferenceId)
            .single();

          if (error) {
            // Conference might not be in Supabase yet (offline-first)
            return;
          }

          if (confData) {
            await processConferenceUpdate(confData);
          }
        } catch (err) {
          console.error('[VideoConference] Conference polling error:', err);
        }
      }, 3000);
    };

    setupRealtimeSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [conferenceId, user, isJoined, isInWaitingRoom, isWebRTCInitialized, navigate, remoteStreams]);

  // Initialize WebRTC when joined and stream is available
  useEffect(() => {
    if (!isJoined || !stream || !conference || !user || isWebRTCInitialized) return;

    // Initialize WebRTC service
    WebRTCSignalingService.initializeWebRTC(stream);

    // Set up callbacks
    WebRTCSignalingService.onRemoteStream((userId, remoteStream) => {
      setRemoteStreams(prev => new Map(prev).set(userId, remoteStream));
      toast.success('Participant video connected');
    });

    WebRTCSignalingService.onParticipantDisconnected((userId) => {
      setRemoteStreams(prev => {
        const updated = new Map(prev);
        updated.delete(userId);
        return updated;
      });
    });

    WebRTCSignalingService.onSignalingMessage(async (message) => {
      // Send signaling message via Supabase
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from('rtc_signaling').insert({
          id: message.id,
          conference_id: message.conferenceId,
          from_user_id: message.fromUserId,
          from_user_name: message.fromUserName,
          to_user_id: message.toUserId,
          type: message.type,
          payload: message.payload,
          created_at: message.createdAt,
        });
      }
    });

    setIsWebRTCInitialized(true);

    // Connect to existing admitted participants
    const admittedParticipants = conference.participants.filter(
      p => p.admissionStatus === 'admitted' && p.userId !== user.id && !p.leftAt
    );
    
    setTimeout(() => {
      WebRTCSignalingService.connectToParticipants(
        conference.id,
        user.id,
        `${user.firstName} ${user.lastName}`,
        admittedParticipants
      );
    }, 1000);

    return () => {
      WebRTCSignalingService.closeAllConnections();
      setIsWebRTCInitialized(false);
    };
  }, [isJoined, stream, conference, user, isWebRTCInitialized]);

  // Subscribe to WebRTC signaling messages AND poll for updates
  useEffect(() => {
    if (!conferenceId || !user || !isJoined) return;

    let signalingSubscription: { unsubscribe: () => void } | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    let lastSignalingCheck = new Date();

    const setupSignalingSubscription = async () => {
      const supabase = await getSupabaseClient();
      if (!supabase) return;

      // Real-time subscription for signaling messages
      signalingSubscription = supabase
        .channel(`signaling:${conferenceId}:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'rtc_signaling',
            filter: `conference_id=eq.${conferenceId}`,
          },
          async (payload: { new?: Record<string, unknown> }) => {
            if (payload.new) {
              const message: RTCSignalingMessage = {
                id: payload.new.id as string,
                conferenceId: payload.new.conference_id as string,
                fromUserId: payload.new.from_user_id as string,
                fromUserName: payload.new.from_user_name as string,
                toUserId: payload.new.to_user_id as string,
                type: payload.new.type as 'offer' | 'answer' | 'ice-candidate' | 'participant-update',
                payload: payload.new.payload as string,
                createdAt: new Date(payload.new.created_at as string),
              };

              console.log('[VideoConference] Received signaling message:', message.type, 'from:', message.fromUserName);

              // Process the signaling message
              await WebRTCSignalingService.processSignalingMessage(
                conferenceId,
                user.id,
                `${user.firstName} ${user.lastName}`,
                message
              );
            }
          }
        )
        .subscribe((status) => {
          console.log('[VideoConference] Signaling subscription status:', status);
        });

      // Polling fallback - check for new signaling messages every 2 seconds
      pollingInterval = setInterval(async () => {
        try {
          const { data: messages, error } = await supabase
            .from('rtc_signaling')
            .select('*')
            .eq('conference_id', conferenceId)
            .gt('created_at', lastSignalingCheck.toISOString())
            .order('created_at', { ascending: true });

          if (error) {
            console.error('[VideoConference] Polling error:', error);
            return;
          }

          if (messages && messages.length > 0) {
            console.log('[VideoConference] Polled', messages.length, 'new signaling messages');
            for (const msg of messages) {
              const message: RTCSignalingMessage = {
                id: msg.id,
                conferenceId: msg.conference_id,
                fromUserId: msg.from_user_id,
                fromUserName: msg.from_user_name,
                toUserId: msg.to_user_id,
                type: msg.type,
                payload: msg.payload,
                createdAt: new Date(msg.created_at),
              };

              await WebRTCSignalingService.processSignalingMessage(
                conferenceId,
                user.id,
                `${user.firstName} ${user.lastName}`,
                message
              );
            }
            lastSignalingCheck = new Date(messages[messages.length - 1].created_at);
          }
        } catch (err) {
          console.error('[VideoConference] Polling error:', err);
        }
      }, 2000);
    };

    setupSignalingSubscription();

    return () => {
      if (signalingSubscription) {
        signalingSubscription.unsubscribe();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [conferenceId, user, isJoined]);

  // Generate room code using enhanced service (XXX-XXXX-XXX format)
  const generateRoomCode = () => {
    return MeetingMinutesService.generateRoomCode();
  };

  // ============================================================
  // TRANSCRIPTION FUNCTIONS
  // ============================================================

  // Start live transcription
  const startTranscription = useCallback(() => {
    if (!user) return;
    
    const speakerName = `${user.firstName} ${user.lastName}`;
    const started = MeetingMinutesService.startTranscription(
      speakerName,
      (segments) => {
        setTranscriptSegments(segments);
        // Auto-scroll transcript view
      },
      (error) => {
        toast.error(error);
        setIsTranscribing(false);
      }
    );
    
    if (started) {
      setIsTranscribing(true);
      toast.success('Live transcription started');
    }
  }, [user]);

  // Stop transcription
  const stopTranscription = useCallback(() => {
    const segments = MeetingMinutesService.stopTranscription();
    setTranscriptSegments(segments);
    setIsTranscribing(false);
    toast.success('Transcription stopped');
  }, []);

  // Toggle transcription
  const toggleTranscription = useCallback(() => {
    if (isTranscribing) {
      stopTranscription();
    } else {
      startTranscription();
    }
  }, [isTranscribing, startTranscription, stopTranscription]);

  // Initialize meeting minutes when joining
  const initializeMeetingMinutes = useCallback(async () => {
    if (!conference || !user || meetingMinutes) return;
    
    try {
      const minutes = await MeetingMinutesService.createMinutes(
        conference,
        user.id,
        `${user.firstName} ${user.lastName}`,
        user.hospitalId
      );
      setMeetingMinutes(minutes);
      toast.success('Meeting minutes initialized');
    } catch (error) {
      console.error('Failed to initialize meeting minutes:', error);
    }
  }, [conference, user, meetingMinutes]);

  // Generate AI-powered meeting minutes
  const generateMeetingMinutes = useCallback(async () => {
    if (!meetingMinutes || !user) return;
    
    setIsGeneratingMinutes(true);
    
    try {
      // Update transcript in meeting minutes
      await db.meetingMinutes.update(meetingMinutes.id, {
        transcript: transcriptSegments,
        rawTranscriptText: transcriptSegments.map(s => s.text).join(' '),
        updatedAt: new Date(),
      });
      
      // Finalize with AI summary
      const finalizedMinutes = await MeetingMinutesService.finalizeMinutes(
        meetingMinutes.id,
        new Date(),
        user.id,
        recordedBlob ? URL.createObjectURL(recordedBlob) : undefined,
        recordingDuration
      );
      
      if (finalizedMinutes) {
        setMeetingMinutes(finalizedMinutes);
        setMinutesGenerated(true);
        setShowMinutesModal(true);
        toast.success('Meeting minutes generated successfully!');
      }
    } catch (error) {
      console.error('Failed to generate meeting minutes:', error);
      toast.error('Failed to generate meeting minutes');
    } finally {
      setIsGeneratingMinutes(false);
    }
  }, [meetingMinutes, user, transcriptSegments, recordedBlob, recordingDuration]);

  // Download meeting minutes PDF
  const downloadMinutesPDF = useCallback(() => {
    if (!meetingMinutes) return;
    MeetingMinutesService.downloadPDF(meetingMinutes);
    toast.success('PDF downloaded');
  }, [meetingMinutes]);

  // Share via WhatsApp
  const shareViaWhatsApp = useCallback(() => {
    if (!meetingMinutes) return;
    MeetingMinutesService.shareWhatsApp(meetingMinutes);
  }, [meetingMinutes]);

  // Share via Email
  const shareViaEmail = useCallback(() => {
    if (!meetingMinutes) return;
    MeetingMinutesService.shareEmail(meetingMinutes);
  }, [meetingMinutes]);

  // Create new conference
  const handleCreateConference = async () => {
    if (!user) return;

    const newConference: VideoConference = {
      id: uuidv4(),
      title: 'New Meeting',
      hostId: user.id,
      hostName: `${user.firstName} ${user.lastName}`,
      participants: [],
      invitedUsers: [],
      scheduledStart: new Date(),
      status: 'waiting',
      roomCode: generateRoomCode(),
      settings: {
        allowParticipantsToUnmute: true,
        allowParticipantsToShareScreen: true,
        allowParticipantsToChat: true,
        muteOnEntry: true,
        videoOffOnEntry: false,
        waitingRoomEnabled: true, // Enable waiting room by default
        recordingEnabled: false,
        maxParticipants: 25,
      },
      chatEnabled: true,
      chatMessages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.videoConferences.add(newConference);
    syncRecord('videoConferences', newConference as unknown as Record<string, unknown>);
    setConference(newConference);
    navigate(`/communication/video/${newConference.id}`, { replace: true });
  };

  // Join conference
  const handleJoinConference = async () => {
    if (!user || !conference) return;

    // Check if user is already a participant
    const existingParticipant = conference.participants.find(p => p.userId === user.id && !p.leftAt);
    
    if (existingParticipant) {
      // User is already in the meeting, just rejoin
      setParticipants(conference.participants);
      setIsMuted(existingParticipant.isMuted);
      setIsVideoOn(existingParticipant.isVideoOn);
      setIsPresenter(existingParticipant.isPresenter);
      
      if (existingParticipant.admissionStatus === 'waiting') {
        setIsInWaitingRoom(true);
        toast('Waiting for host to admit you...', { icon: '⏳' });
        return;
      }
      
      setIsJoined(true);
      toast.success('Rejoined meeting');
      return;
    }

    const isHost = conference.hostId === user.id;
    const shouldWait = conference.settings.waitingRoomEnabled && !isHost;

    const participant: ConferenceParticipant = {
      id: uuidv4(),
      oderId: uuidv4(),
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      avatar: user.avatar,
      joinedAt: new Date(),
      isHost: isHost,
      isCoHost: false,
      isPresenter: isHost,
      isMuted: conference.settings.muteOnEntry,
      isVideoOn: !conference.settings.videoOffOnEntry,
      isHandRaised: false,
      isScreenSharing: false,
      connectionStatus: shouldWait ? 'connecting' : 'connected',
      admissionStatus: shouldWait ? 'waiting' : 'admitted',
    };

    const updatedParticipants = [...participants, participant];
    setParticipants(updatedParticipants);
    setIsMuted(conference.settings.muteOnEntry);
    setIsVideoOn(!conference.settings.videoOffOnEntry);
    setIsPresenter(isHost);

    await db.videoConferences.update(conference.id, {
      participants: updatedParticipants,
      status: isHost ? 'active' : conference.status,
      actualStart: isHost && conference.status === 'waiting' ? new Date() : conference.actualStart,
      updatedAt: new Date(),
    });
    const updatedConf = await db.videoConferences.get(conference.id);
    if (updatedConf) {
      syncRecord('videoConferences', updatedConf as unknown as Record<string, unknown>);
      setConference(updatedConf);
      // Update waiting participants for host notification
      if (isHost) {
        const waiting = updatedConf.participants.filter(p => p.admissionStatus === 'waiting' && !p.leftAt);
        setWaitingParticipants(waiting);
        if (waiting.length > 0) {
          setWaitingRoomNotification(true);
        }
      }
    }

    if (shouldWait) {
      setIsInWaitingRoom(true);
      toast('Waiting for host to admit you...', { icon: '⏳' });
    } else {
      setIsJoined(true);
      toast.success('Joined meeting');
      
      // Initialize meeting minutes if host
      if (isHost) {
        setTimeout(() => initializeMeetingMinutes(), 500);
      }
    }
  };

  // Admit a participant from waiting room
  const admitParticipant = async (participantId: string) => {
    if (!conference || !user || conference.hostId !== user.id) return;

    const updatedParticipants = participants.map(p =>
      p.id === participantId
        ? { ...p, admissionStatus: 'admitted' as const, connectionStatus: 'connected' as const, joinedAt: new Date() }
        : p
    );

    setParticipants(updatedParticipants);
    setWaitingParticipants(prev => prev.filter(p => p.id !== participantId));

    await db.videoConferences.update(conference.id, {
      participants: updatedParticipants,
      updatedAt: new Date(),
    });
    const updatedConf = await db.videoConferences.get(conference.id);
    if (updatedConf) {
      syncRecord('videoConferences', updatedConf as unknown as Record<string, unknown>);
      setConference(updatedConf);
    }

    const admittedUser = participants.find(p => p.id === participantId);
    toast.success(`${admittedUser?.userName || 'Participant'} admitted to meeting`);
  };

  // Reject a participant from waiting room
  const rejectParticipant = async (participantId: string) => {
    if (!conference || !user || conference.hostId !== user.id) return;

    const updatedParticipants = participants.map(p =>
      p.id === participantId
        ? { ...p, admissionStatus: 'rejected' as const, connectionStatus: 'disconnected' as const, leftAt: new Date() }
        : p
    );

    setParticipants(updatedParticipants);
    setWaitingParticipants(prev => prev.filter(p => p.id !== participantId));

    await db.videoConferences.update(conference.id, {
      participants: updatedParticipants,
      updatedAt: new Date(),
    });
    const updatedConf = await db.videoConferences.get(conference.id);
    if (updatedConf) {
      syncRecord('videoConferences', updatedConf as unknown as Record<string, unknown>);
      setConference(updatedConf);
    }

    const rejectedUser = participants.find(p => p.id === participantId);
    toast(`${rejectedUser?.userName || 'Participant'} was not admitted`);
  };

  // Admit all waiting participants
  const admitAllParticipants = async () => {
    if (!conference || !user || conference.hostId !== user.id) return;

    const updatedParticipants = participants.map(p =>
      p.admissionStatus === 'waiting'
        ? { ...p, admissionStatus: 'admitted' as const, connectionStatus: 'connected' as const, joinedAt: new Date() }
        : p
    );

    setParticipants(updatedParticipants);
    setWaitingParticipants([]);

    await db.videoConferences.update(conference.id, {
      participants: updatedParticipants,
      updatedAt: new Date(),
    });
    const updatedConf = await db.videoConferences.get(conference.id);
    if (updatedConf) {
      syncRecord('videoConferences', updatedConf as unknown as Record<string, unknown>);
      setConference(updatedConf);
    }

    toast.success('All participants admitted');
  };

  // Leave conference
  const handleLeaveConference = async () => {
    if (!user || !conference) return;

    // Close WebRTC connections
    WebRTCSignalingService.closeAllConnections();
    setRemoteStreams(new Map());
    setIsWebRTCInitialized(false);

    // Stop transcription if active
    if (isTranscribing) {
      stopTranscription();
    }

    // Stop screen sharing if active
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    const updatedParticipants = participants.map(p => 
      p.userId === user.id 
        ? { ...p, leftAt: new Date(), connectionStatus: 'disconnected' as const }
        : p
    );

    await db.videoConferences.update(conference.id, {
      participants: updatedParticipants,
      status: updatedParticipants.every(p => p.leftAt) ? 'ended' : conference.status,
      actualEnd: updatedParticipants.every(p => p.leftAt) ? new Date() : undefined,
      updatedAt: new Date(),
    });
    const updatedConfLeave = await db.videoConferences.get(conference.id);
    if (updatedConfLeave) syncRecord('videoConferences', updatedConfLeave as unknown as Record<string, unknown>);

    // If host and have transcript, offer to generate minutes
    if (conference.hostId === user.id && transcriptSegments.length > 0 && !minutesGenerated) {
      const shouldGenerate = window.confirm('Would you like to generate AI-powered meeting minutes before leaving?');
      if (shouldGenerate) {
        await generateMeetingMinutes();
      }
    }

    setIsJoined(false);
    toast.success('Left meeting');
    navigate('/communication/chat');
  };

  // Toggle controls
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    toggleAudioTrack(!newMutedState);
    setParticipants(prev => prev.map(p => 
      p.userId === user?.id ? { ...p, isMuted: newMutedState } : p
    ));
  };

  const toggleVideo = () => {
    const newVideoState = !isVideoOn;
    setIsVideoOn(newVideoState);
    toggleVideoTrack(newVideoState);
    setParticipants(prev => prev.map(p => 
      p.userId === user?.id ? { ...p, isVideoOn: newVideoState } : p
    ));
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        // Request screen sharing
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
          },
          audio: true,
        });

        setScreenStream(displayStream);
        setIsScreenSharing(true);
        
        // Listen for when user stops sharing via browser UI
        displayStream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          setParticipants(prev => prev.map(p => 
            p.userId === user?.id ? { ...p, isScreenSharing: false } : p
          ));
          toast.success('Screen sharing stopped');
        });

        setParticipants(prev => prev.map(p => 
          p.userId === user?.id ? { ...p, isScreenSharing: true } : p
        ));
        toast.success('Screen sharing started');
      } catch (err) {
        console.error('Error sharing screen:', err);
        toast.error('Failed to share screen');
      }
    } else {
      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      setParticipants(prev => prev.map(p => 
        p.userId === user?.id ? { ...p, isScreenSharing: false } : p
      ));
      toast.success('Screen sharing stopped');
    }
  };

  const toggleHandRaise = () => {
    setIsHandRaised(!isHandRaised);
    setParticipants(prev => prev.map(p => 
      p.userId === user?.id ? { ...p, isHandRaised: !isHandRaised } : p
    ));
    if (!isHandRaised) {
      toast.success('Hand raised');
    }
  };

  // Handle slide upload
  const handleSlideUpload = async (files: FileList) => {
    const newSlides: PresentationSlide[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      await new Promise<void>((resolve) => {
        reader.onload = (e) => {
          newSlides.push({
            id: uuidv4(),
            index: slides.length + i,
            title: file.name.replace(/\.[^/.]+$/, ''),
            imageUrl: e.target?.result as string,
            thumbnailUrl: e.target?.result as string,
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    const updatedSlides = [...slides, ...newSlides];
    setSlides(updatedSlides);
    setShowPresentation(true);

    if (conference) {
      await db.videoConferences.update(conference.id, {
        presentation: {
          isActive: true,
          presenterId: user?.id,
          presenterName: `${user?.firstName} ${user?.lastName}`,
          slides: updatedSlides,
          currentSlideIndex: currentSlideIndex,
          totalSlides: updatedSlides.length,
          startedAt: new Date(),
        },
        updatedAt: new Date(),
      });
      const updatedConfSlides = await db.videoConferences.get(conference.id);
      if (updatedConfSlides) syncRecord('videoConferences', updatedConfSlides as unknown as Record<string, unknown>);
    }

    toast.success(`${newSlides.length} slide(s) added`);
  };

  // Navigate slides
  const handleSlideNavigate = async (index: number) => {
    if (index < 0 || index >= slides.length) return;
    setCurrentSlideIndex(index);

    if (conference) {
      await db.videoConferences.update(conference.id, {
        'presentation.currentSlideIndex': index,
        updatedAt: new Date(),
      });
      const updatedConfNav = await db.videoConferences.get(conference.id);
      if (updatedConfNav) syncRecord('videoConferences', updatedConfNav as unknown as Record<string, unknown>);
    }
  };

  // Send chat message
  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() || !user || !conference) return;

    const newMessage: ConferenceChatMessage = {
      id: uuidv4(),
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      content: chatMessage.trim(),
      type: 'text',
      isPrivate: false,
      createdAt: new Date(),
    };

    const updatedMessages = [...chatMessages, newMessage];
    setChatMessages(updatedMessages);
    setChatMessage('');

    await db.videoConferences.update(conference.id, {
      chatMessages: updatedMessages,
      updatedAt: new Date(),
    });
    const updatedConfChat = await db.videoConferences.get(conference.id);
    if (updatedConfChat) syncRecord('videoConferences', updatedConfChat as unknown as Record<string, unknown>);
  };

  // Copy meeting link
  const copyMeetingLink = () => {
    const link = `${window.location.origin}/communication/video/${conference?.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Meeting link copied!');
  };

  // Join meeting with room code
  const joinWithRoomCode = async () => {
    if (!joinCode.trim()) {
      setJoinCodeError('Please enter a meeting code');
      return;
    }

    setIsJoiningWithCode(true);
    setJoinCodeError('');

    try {
      // Normalize the code (remove spaces, dashes, convert to uppercase)
      const normalizedCode = joinCode.trim().toUpperCase().replace(/[\s-]/g, '');
      
      // Try different formats
      const codeFormats = [
        normalizedCode,
        // Try with dashes (XXX-XXXX-XXX format)
        normalizedCode.length === 10 
          ? `${normalizedCode.slice(0, 3)}-${normalizedCode.slice(3, 7)}-${normalizedCode.slice(7)}`
          : normalizedCode,
      ];

      let foundConference: VideoConference | undefined;
      
      for (const code of codeFormats) {
        foundConference = await db.videoConferences.where('roomCode').equals(code).first();
        if (foundConference) break;
      }

      if (foundConference) {
        // Navigate to the found conference
        navigate(`/communication/video/${foundConference.id}`);
        toast.success('Meeting found! Joining...');
      } else {
        setJoinCodeError('Invalid meeting code. Please check and try again.');
      }
    } catch (error) {
      console.error('Error joining with code:', error);
      setJoinCodeError('Failed to find meeting. Please try again.');
    } finally {
      setIsJoiningWithCode(false);
    }
  };

  // Format room code as user types (add dashes)
  const handleJoinCodeChange = (value: string) => {
    // Remove any non-alphanumeric characters
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Format with dashes: XXX-XXXX-XXX
    let formatted = cleaned;
    if (cleaned.length > 3) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }
    if (cleaned.length > 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 10)}`;
    }
    
    setJoinCode(formatted);
    setJoinCodeError('');
  };

  // Waiting room screen (for non-host participants waiting to be admitted)
  if (isInWaitingRoom) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-6">
            <DoorOpen className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Waiting Room</h1>
          <p className="text-gray-600 mb-6">
            Please wait while the host admits you to the meeting
          </p>

          {/* Meeting info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Meeting</span>
              <span className="font-medium">{conference?.title || 'Meeting'}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Host</span>
              <span className="font-medium">{conference?.hostName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Room Code</span>
              <span className="font-mono font-bold">{conference?.roomCode}</span>
            </div>
          </div>

          {/* Animated waiting indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-gray-500 ml-2">Waiting for host...</span>
          </div>

          {/* Camera preview */}
          <div className="relative aspect-video bg-gray-900 rounded-xl mb-6 overflow-hidden">
            {stream && isVideoOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              </div>
            )}
            
            {/* Preview controls */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button
                onClick={toggleMute}
                className={`p-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {isMuted ? <MicOff size={18} className="text-white" /> : <Mic size={18} className="text-white" />}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-2 rounded-full ${!isVideoOn ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                {isVideoOn ? <Video size={18} className="text-white" /> : <VideoOff size={18} className="text-white" />}
              </button>
            </div>
          </div>

          {/* Leave waiting room button */}
          <button
            onClick={() => {
              setIsInWaitingRoom(false);
              navigate('/communication/chat');
            }}
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Leave Waiting Room
          </button>
        </motion.div>
      </div>
    );
  }

  // Pre-join screen
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 sm:p-8 max-w-lg w-full"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <Video className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {conference ? 'Join Meeting' : 'Start a New Meeting'}
            </h1>
            {conference && (
              <p className="text-gray-500 mt-2">{conference.title}</p>
            )}
          </div>

          {/* Preview camera with actual video stream */}
          <div className="relative aspect-video bg-gray-900 rounded-xl mb-6 overflow-hidden">
            {stream && isVideoOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{
                  transform: 'scaleX(-1)', // Mirror the preview
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              </div>
            )}
            
            {/* Preview controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full ${
                  isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {isMuted ? (
                  <MicOff size={20} className="text-white" />
                ) : (
                  <Mic size={20} className="text-white" />
                )}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${
                  !isVideoOn ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {isVideoOn ? (
                  <Video size={20} className="text-white" />
                ) : (
                  <VideoOff size={20} className="text-white" />
                )}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"
                title="Settings"
              >
                <Settings size={20} className="text-white" />
              </button>
              <button
                onClick={() => setShowVirtualBackground(true)}
                className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"
                title="Virtual Background"
              >
                <Sparkles size={20} className="text-white" />
              </button>
            </div>
            
            {/* Camera error message */}
            {mediaError && (
              <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white text-sm p-2 rounded-lg">
                {mediaError}
              </div>
            )}
            
            {/* Virtual background indicator */}
            {selectedBackground.type !== 'none' && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-purple-500 text-white text-xs rounded-full flex items-center gap-1">
                <Sparkles size={12} />
                {selectedBackground.name}
              </div>
            )}
          </div>

          {/* Device selection quick preview */}
          {videoDevices.length > 1 && (
            <div className="mb-4">
              <label className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                <Camera size={14} />
                Camera
              </label>
              <select
                value={selectedVideoDevice}
                onChange={(e) => switchCamera(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Meeting info */}
          {conference && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Room Code</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg">{conference.roomCode}</span>
                  <button
                    onClick={copyMeetingLink}
                    className="p-1.5 hover:bg-gray-200 rounded"
                  >
                    <Copy size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Host</span>
                <span className="font-medium">{conference.hostName}</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {conference ? (
              <button
                onClick={handleJoinConference}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Video size={20} />
                Join Meeting
              </button>
            ) : showJoinWithCode ? (
              /* Join with Code Form */
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Enter Meeting Code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => handleJoinCodeChange(e.target.value)}
                    placeholder="XXX-XXXX-XXX"
                    maxLength={12}
                    className={`w-full px-4 py-3 border rounded-lg text-center font-mono text-lg tracking-wider uppercase ${
                      joinCodeError ? 'border-red-500' : 'border-gray-300'
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    onKeyDown={(e) => e.key === 'Enter' && joinWithRoomCode()}
                    autoFocus
                  />
                  {joinCodeError && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {joinCodeError}
                    </p>
                  )}
                </div>
                <button
                  onClick={joinWithRoomCode}
                  disabled={isJoiningWithCode || joinCode.length < 10}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoiningWithCode ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Finding Meeting...
                    </>
                  ) : (
                    <>
                      <Video size={20} />
                      Join Meeting
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowJoinWithCode(false);
                    setJoinCode('');
                    setJoinCodeError('');
                  }}
                  className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              </div>
            ) : (
              /* Default: Start or Join options */
              <>
                <button
                  onClick={handleCreateConference}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Start New Meeting
                </button>
                <button
                  onClick={() => setShowJoinWithCode(true)}
                  className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Link2 size={20} />
                  Join with Code
                </button>
              </>
            )}
            {!showJoinWithCode && (
              <button
                onClick={() => navigate('/communication/chat')}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Active meeting view
  return (
    <div className={`h-screen bg-gray-900 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Meeting header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-gray-800/50">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <h1 className="text-sm sm:text-base text-white font-semibold">{conference?.title || 'Meeting'}</h1>
          <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Live
          </span>
          <span className="text-gray-400 text-sm flex items-center gap-1">
            <Clock size={14} />
            {format(new Date(), 'HH:mm')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyMeetingLink}
            className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <Link2 size={14} />
            Copy Link
          </button>
          <span className="text-gray-400 font-mono">{conference?.roomCode}</span>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isFullscreen ? (
              <Minimize size={18} className="text-gray-400" />
            ) : (
              <Maximize size={18} className="text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid or presentation */}
        <div className="flex-1 p-2 sm:p-4">
          {showPresentation ? (
            <SlidePresenter
              slides={slides}
              currentIndex={currentSlideIndex}
              onNavigate={handleSlideNavigate}
              onUpload={handleSlideUpload}
              onClose={() => setShowPresentation(false)}
              isPresenter={isPresenter}
            />
          ) : isScreenSharing && screenStream ? (
            /* Screen sharing view */
            <div className="h-full flex flex-col gap-4 relative">
              {/* Main screen share display */}
              <div className="flex-1 bg-gray-800 rounded-xl overflow-hidden relative">
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                  ref={(el) => {
                    if (el && screenStream) {
                      el.srcObject = screenStream;
                    }
                  }}
                />
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-green-500 text-white text-sm rounded-full flex items-center gap-2">
                  <Monitor size={16} />
                  You are sharing your screen
                </div>
              </div>
              
              {/* Self-view PIP (Picture-in-Picture) */}
              {stream && isVideoOn && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute bottom-4 right-4 w-48 aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700"
                >
                  <video
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                    ref={(el) => {
                      if (el && stream) {
                        el.srcObject = stream;
                      }
                    }}
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                    You
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className={`h-full relative ${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4'
                : 'flex flex-col gap-2 sm:gap-4'
            }`}>
              {viewMode === 'speaker' ? (
                <>
                  {/* Main speaker (first participant or active speaker) */}
                  <div className="flex-1">
                    {participants.filter(p => p.admissionStatus === 'admitted' && !p.leftAt).length > 0 ? (
                      <ParticipantVideo 
                        participant={participants.filter(p => p.admissionStatus === 'admitted' && !p.leftAt)[0]} 
                        isLarge 
                        isSelf={participants.filter(p => p.admissionStatus === 'admitted' && !p.leftAt)[0].userId === user?.id}
                        videoStream={
                          participants.filter(p => p.admissionStatus === 'admitted' && !p.leftAt)[0].userId === user?.id 
                            ? stream 
                            : remoteStreams.get(participants.filter(p => p.admissionStatus === 'admitted' && !p.leftAt)[0].userId) || null
                        }
                      />
                    ) : (
                      <div className="h-full bg-gray-800 rounded-xl flex items-center justify-center">
                        <p className="text-gray-400">Waiting for participants...</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Thumbnail strip */}
                  {participants.filter(p => p.admissionStatus === 'admitted' && !p.leftAt).length > 1 && (
                    <div className="h-32 flex gap-2 overflow-x-auto py-2">
                      {participants.filter(p => p.admissionStatus === 'admitted' && !p.leftAt).slice(1).map((p) => (
                        <div key={p.id} className="w-48 flex-shrink-0">
                          <ParticipantVideo 
                            participant={p}
                            isSelf={p.userId === user?.id}
                            videoStream={p.userId === user?.id ? stream : remoteStreams.get(p.userId) || null}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Grid view */
                participants.filter(p => p.admissionStatus === 'admitted' && !p.leftAt).map((p) => (
                  <ParticipantVideo 
                    key={p.id} 
                    participant={p}
                    isSelf={p.userId === user?.id}
                    videoStream={p.userId === user?.id ? stream : remoteStreams.get(p.userId) || null}
                  />
                ))
              )}

              {/* Self-view PIP when in speaker/grid view and multiple participants */}
              {stream && isVideoOn && participants.length > 0 && !participants.find(p => p.userId === user?.id && participants[0].userId === user?.id) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute bottom-4 right-4 w-48 aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 z-10"
                >
                  <video
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                    ref={(el) => {
                      if (el && stream) {
                        el.srcObject = stream;
                      }
                    }}
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                    You
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Side panels */}
        <AnimatePresence>
          {/* Waiting Room Panel (Host only) */}
          {showWaitingRoom && conference?.hostId === user?.id && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-gray-800 border-l border-gray-700 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <DoorOpen size={18} />
                  Waiting Room ({waitingParticipants.length})
                </h3>
                <button
                  onClick={() => {
                    setShowWaitingRoom(false);
                    setWaitingRoomNotification(false);
                  }}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-250px)]">
                {waitingParticipants.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-4">
                    No one is waiting to join
                  </p>
                ) : (
                  <>
                    {/* Admit all button */}
                    <button
                      onClick={admitAllParticipants}
                      className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <UserCheck size={16} />
                      Admit All ({waitingParticipants.length})
                    </button>
                    
                    {/* Individual waiting participants */}
                    {waitingParticipants.map((p) => (
                      <div
                        key={p.id}
                        className="bg-gray-700/50 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-sm font-semibold">
                            {p.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1">
                            <span className="text-white font-medium text-sm block">
                              {p.userName}
                            </span>
                            <span className="text-xs text-gray-400 capitalize">
                              {p.userRole.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => admitParticipant(p.id)}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <UserCheck size={14} />
                            Admit
                          </button>
                          <button
                            onClick={() => rejectParticipant(p.id)}
                            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <UserX size={14} />
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Participants panel */}
          {showParticipants && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-gray-800 border-l border-gray-700 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-white">
                  Participants ({participants.filter(p => p.admissionStatus === 'admitted' && !p.leftAt).length})
                </h3>
                <button
                  onClick={() => setShowParticipants(false)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
                {participants.filter(p => p.admissionStatus === 'admitted' && !p.leftAt).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                        {p.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      {/* Connection indicator */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-800 ${
                        remoteStreams.has(p.userId) || p.userId === user?.id ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm">
                          {p.userName}
                        </span>
                        {p.isHost && <Crown size={14} className="text-yellow-400" />}
                        {p.userId === user?.id && (
                          <span className="text-xs text-gray-400">(You)</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 capitalize">
                        {p.userRole.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.isMuted ? (
                        <MicOff size={14} className="text-red-400" />
                      ) : (
                        <Mic size={14} className="text-green-400" />
                      )}
                      {p.isVideoOn ? (
                        <Video size={14} className="text-green-400" />
                      ) : (
                        <VideoOff size={14} className="text-red-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Chat panel */}
          {showChat && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-white">Chat</h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatMessages.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm">No messages yet</p>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {msg.senderName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">
                            {msg.senderName}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {format(new Date(msg.createdAt), 'HH:mm')}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat input */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendChatMessage}
                    disabled={!chatMessage.trim()}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control bar */}
      <div className="px-4 py-4 bg-gray-800/90 backdrop-blur">
        <div className="flex items-center justify-center gap-3">
          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-colors ${
              isMuted 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff size={22} className="text-white" />
            ) : (
              <Mic size={22} className="text-white" />
            )}
          </button>

          {/* Video */}
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-colors ${
              !isVideoOn 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? (
              <Video size={22} className="text-white" />
            ) : (
              <VideoOff size={22} className="text-white" />
            )}
          </button>

          {/* Screen share */}
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-colors ${
              isScreenSharing 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? (
              <MonitorOff size={22} className="text-white" />
            ) : (
              <Monitor size={22} className="text-white" />
            )}
          </button>

          {/* Present slides */}
          <button
            onClick={() => setShowPresentation(!showPresentation)}
            className={`p-4 rounded-full transition-colors ${
              showPresentation 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Present slides"
          >
            <Presentation size={22} className="text-white" />
          </button>

          {/* Raise hand */}
          <button
            onClick={toggleHandRaise}
            className={`p-4 rounded-full transition-colors ${
              isHandRaised 
                ? 'bg-yellow-500 hover:bg-yellow-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          >
            <Hand size={22} className="text-white" />
          </button>

          {/* View mode */}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'speaker' : 'grid')}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title={viewMode === 'grid' ? 'Speaker view' : 'Grid view'}
          >
            {viewMode === 'grid' ? (
              <User size={22} className="text-white" />
            ) : (
              <Grid3X3 size={22} className="text-white" />
            )}
          </button>

          <div className="w-px h-10 bg-gray-600 mx-2" />

          {/* Participants */}
          <button
            onClick={() => {
              setShowParticipants(!showParticipants);
              if (!showParticipants) {
                setShowChat(false);
                setShowWaitingRoom(false);
              }
            }}
            className={`p-4 rounded-full transition-colors ${
              showParticipants 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Participants"
          >
            <Users size={22} className="text-white" />
          </button>

          {/* Waiting Room (Host only) */}
          {conference?.hostId === user?.id && (
            <button
              onClick={() => {
                setShowWaitingRoom(!showWaitingRoom);
                setWaitingRoomNotification(false);
                if (!showWaitingRoom) {
                  setShowChat(false);
                  setShowParticipants(false);
                }
              }}
              className={`p-4 rounded-full transition-colors relative ${
                showWaitingRoom 
                  ? 'bg-yellow-500 hover:bg-yellow-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Waiting Room"
            >
              <DoorOpen size={22} className="text-white" />
              {waitingRoomNotification && waitingParticipants.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {waitingParticipants.length}
                </span>
              )}
            </button>
          )}

          {/* Chat */}
          <button
            onClick={() => {
              setShowChat(!showChat);
              if (!showChat) {
                setShowParticipants(false);
                setShowWaitingRoom(false);
              }
            }}
            className={`p-4 rounded-full transition-colors relative ${
              showChat 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Chat"
          >
            <MessageSquare size={22} className="text-white" />
            {chatMessages.length > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {chatMessages.length}
              </span>
            )}
          </button>

          <div className="w-px h-10 bg-gray-600 mx-2" />

          {/* Recording controls */}
          <RecordingControls
            isRecording={isRecording}
            isPaused={isPaused}
            duration={recordingDuration}
            hasRecording={!!recordedBlob}
            onStart={startRecording}
            onPause={pauseRecording}
            onStop={stopRecording}
            onDownload={downloadRecording}
            formatDuration={formatDuration}
          />

          {/* Live Transcription Toggle */}
          <button
            onClick={toggleTranscription}
            className={`p-4 rounded-full transition-colors relative ${
              isTranscribing 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isTranscribing ? 'Stop transcription' : 'Start live transcription'}
          >
            <ScrollText size={22} className="text-white" />
            {isTranscribing && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* View Transcript */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`p-4 rounded-full transition-colors relative ${
              showTranscript 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="View transcript"
          >
            <FileText size={22} className="text-white" />
            {transcriptSegments.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {transcriptSegments.length}
              </span>
            )}
          </button>

          {/* Generate/View Meeting Minutes */}
          <button
            onClick={() => {
              if (minutesGenerated) {
                setShowMinutesModal(true);
              } else {
                generateMeetingMinutes();
              }
            }}
            disabled={isGeneratingMinutes || transcriptSegments.length === 0}
            className={`p-4 rounded-full transition-colors ${
              minutesGenerated
                ? 'bg-green-500 hover:bg-green-600'
                : transcriptSegments.length > 0
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-gray-700 opacity-50 cursor-not-allowed'
            }`}
            title={minutesGenerated ? 'View meeting minutes' : 'Generate meeting minutes'}
          >
            {isGeneratingMinutes ? (
              <Loader2 size={22} className="text-white animate-spin" />
            ) : minutesGenerated ? (
              <CheckCircle size={22} className="text-white" />
            ) : (
              <Sparkles size={22} className="text-white" />
            )}
          </button>

          <div className="w-px h-10 bg-gray-600 mx-2" />

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Settings"
          >
            <Settings size={22} className="text-white" />
          </button>

          {/* Virtual Background */}
          <button
            onClick={() => setShowVirtualBackground(true)}
            className={`p-4 rounded-full transition-colors ${
              selectedBackground.type !== 'none'
                ? 'bg-purple-500 hover:bg-purple-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Virtual Background"
          >
            <Sparkles size={22} className="text-white" />
          </button>

          {/* Presenter layout (when presenting) */}
          {showPresentation && (
            <button
              onClick={() => setPresenterLayout(
                presenterLayout === 'side-by-side' ? 'picture-in-picture' :
                presenterLayout === 'picture-in-picture' ? 'presentation-only' : 'side-by-side'
              )}
              className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
              title="Change presenter layout"
            >
              <Layout size={22} className="text-white" />
            </button>
          )}

          <div className="w-px h-10 bg-gray-600 mx-2" />

          {/* Leave */}
          <button
            onClick={handleLeaveConference}
            className="px-6 py-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center gap-2"
            title="Leave meeting"
          >
            <PhoneOff size={22} className="text-white" />
            <span className="text-white font-medium">Leave</span>
          </button>
        </div>
      </div>

      {/* Device Settings Modal */}
      <DeviceSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        videoDevices={videoDevices}
        audioInputDevices={audioInputDevices}
        audioOutputDevices={audioOutputDevices}
        selectedVideoDevice={selectedVideoDevice}
        selectedAudioInput={selectedAudioInput}
        selectedAudioOutput={selectedAudioOutput}
        onVideoDeviceChange={switchCamera}
        onAudioInputChange={setSelectedAudioInput}
        onAudioOutputChange={setSelectedAudioOutput}
      />

      {/* Virtual Background Selector */}
      <VirtualBackgroundSelector
        isOpen={showVirtualBackground}
        onClose={() => setShowVirtualBackground(false)}
        selectedBackground={selectedBackground}
        onSelectBackground={applyBackground}
        onUploadCustom={handleCustomBackgroundUpload}
      />

      {/* Live Transcript Panel */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-28 left-4 right-4 md:left-auto md:right-4 md:w-96 max-h-64 bg-gray-900/95 backdrop-blur rounded-xl border border-gray-700 shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScrollText size={18} className="text-blue-400" />
                <h3 className="text-white font-medium text-sm">Live Transcript</h3>
                {isTranscribing && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    Recording
                  </span>
                )}
              </div>
              <button onClick={() => setShowTranscript(false)} className="p-1 hover:bg-gray-700 rounded">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-48 space-y-2">
              {transcriptSegments.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  <ScrollText size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No transcript yet</p>
                  <p className="text-xs mt-1">Start transcription to capture speech</p>
                </div>
              ) : (
                transcriptSegments.map((segment, idx) => (
                  <div key={segment.id || idx} className="text-sm">
                    <span className="text-blue-400 font-medium">{segment.speakerName}: </span>
                    <span className="text-gray-300">{segment.text}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meeting Minutes Modal */}
      <AnimatePresence>
        {showMinutesModal && meetingMinutes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={() => setShowMinutesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <FileText size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Meeting Minutes</h2>
                      <p className="text-white/80 text-sm">{meetingMinutes.title}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMinutesModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={24} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                {/* Meeting Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-2 font-medium">{format(new Date(meetingMinutes.meetingDate), 'PPP')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <span className="ml-2 font-medium">{meetingMinutes.duration || 0} minutes</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Host:</span>
                      <span className="ml-2 font-medium">{meetingMinutes.hostName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Attendees:</span>
                      <span className="ml-2 font-medium">{meetingMinutes.attendees.length}</span>
                    </div>
                  </div>
                </div>

                {/* AI Summary */}
                {meetingMinutes.aiSummary && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Sparkles size={18} className="text-purple-500" />
                      AI Summary
                    </h3>
                    <p className="text-gray-700">{meetingMinutes.aiSummary}</p>
                  </div>
                )}

                {/* Key Decisions */}
                {meetingMinutes.decisionsReached.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-500" />
                      Key Decisions
                    </h3>
                    <ul className="space-y-2">
                      {meetingMinutes.decisionsReached.map((decision, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="text-green-500 mt-1">•</span>
                          {decision}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {meetingMinutes.actionItems.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <AlertCircle size={18} className="text-orange-500" />
                      Action Items
                    </h3>
                    <ul className="space-y-2">
                      {meetingMinutes.actionItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="text-orange-500 mt-1">•</span>
                          <div>
                            <span>{item.content}</span>
                            {item.assigneeName && (
                              <span className="ml-2 text-sm text-gray-500">
                                (Assigned: {item.assigneeName})
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Steps */}
                {meetingMinutes.nextSteps.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Next Steps</h3>
                    <ul className="space-y-2">
                      {meetingMinutes.nextSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="text-blue-500 mt-1">→</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Modal Footer - Share Options */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Share Meeting Minutes</h4>
                <div className="flex items-center gap-3">
                  <button
                    onClick={downloadMinutesPDF}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download size={18} />
                    Download PDF
                  </button>
                  <button
                    onClick={shareViaEmail}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Mail size={18} />
                    Email
                  </button>
                  <button
                    onClick={shareViaWhatsApp}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <MessageCircle size={18} />
                    WhatsApp
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
