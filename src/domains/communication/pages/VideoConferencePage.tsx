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
import type { 
  VideoConference, 
  ConferenceParticipant, 
  PresentationSlide,
  ConferenceChatMessage,
} from '../../../types';

// Simulated participant video component
function ParticipantVideo({ 
  participant, 
  isLarge = false,
  isSelf = false,
}: { 
  participant: ConferenceParticipant; 
  isLarge?: boolean;
  isSelf?: boolean;
}) {
  return (
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden ${
      isLarge ? 'aspect-video' : 'aspect-video'
    }`}>
      {/* Video placeholder - would be actual video stream */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        {participant.isVideoOn ? (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {participant.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {participant.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        )}
      </div>

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
        }
      }
    };
    loadConference();
  }, [conferenceId]);

  // Generate room code
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

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
        waitingRoomEnabled: false,
        recordingEnabled: false,
        maxParticipants: 25,
      },
      chatEnabled: true,
      chatMessages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.videoConferences.add(newConference);
    setConference(newConference);
    navigate(`/communication/video/${newConference.id}`, { replace: true });
  };

  // Join conference
  const handleJoinConference = async () => {
    if (!user || !conference) return;

    const participant: ConferenceParticipant = {
      id: uuidv4(),
      oderId: uuidv4(),
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      avatar: user.avatar,
      joinedAt: new Date(),
      isHost: conference.hostId === user.id,
      isCoHost: false,
      isPresenter: conference.hostId === user.id,
      isMuted: conference.settings.muteOnEntry,
      isVideoOn: !conference.settings.videoOffOnEntry,
      isHandRaised: false,
      isScreenSharing: false,
      connectionStatus: 'connected',
    };

    const updatedParticipants = [...participants, participant];
    setParticipants(updatedParticipants);
    setIsMuted(conference.settings.muteOnEntry);
    setIsVideoOn(!conference.settings.videoOffOnEntry);
    setIsPresenter(conference.hostId === user.id);

    await db.videoConferences.update(conference.id, {
      participants: updatedParticipants,
      status: 'active',
      actualStart: conference.status === 'waiting' ? new Date() : conference.actualStart,
      updatedAt: new Date(),
    });

    setIsJoined(true);
    toast.success('Joined meeting');
  };

  // Leave conference
  const handleLeaveConference = async () => {
    if (!user || !conference) return;

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

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    setParticipants(prev => prev.map(p => 
      p.userId === user?.id ? { ...p, isScreenSharing: !isScreenSharing } : p
    ));
    if (!isScreenSharing) {
      toast.success('Screen sharing started');
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
  };

  // Copy meeting link
  const copyMeetingLink = () => {
    const link = `${window.location.origin}/communication/video/${conference?.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Meeting link copied!');
  };

  // Pre-join screen
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 max-w-lg w-full"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <Video className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
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
            ) : (
              <button
                onClick={handleCreateConference}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Start Meeting
              </button>
            )}
            <button
              onClick={() => navigate('/communication/chat')}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active meeting view
  return (
    <div className={`h-screen bg-gray-900 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Meeting header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-semibold">{conference?.title || 'Meeting'}</h1>
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
        <div className="flex-1 p-4">
          {showPresentation ? (
            <SlidePresenter
              slides={slides}
              currentIndex={currentSlideIndex}
              onNavigate={handleSlideNavigate}
              onUpload={handleSlideUpload}
              onClose={() => setShowPresentation(false)}
              isPresenter={isPresenter}
            />
          ) : (
            <div className={`h-full ${
              viewMode === 'grid' 
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                : 'flex flex-col gap-4'
            }`}>
              {viewMode === 'speaker' ? (
                <>
                  {/* Main speaker (first participant or active speaker) */}
                  <div className="flex-1">
                    {participants.length > 0 ? (
                      <ParticipantVideo 
                        participant={participants[0]} 
                        isLarge 
                        isSelf={participants[0].userId === user?.id}
                      />
                    ) : (
                      <div className="h-full bg-gray-800 rounded-xl flex items-center justify-center">
                        <p className="text-gray-400">Waiting for participants...</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Thumbnail strip */}
                  {participants.length > 1 && (
                    <div className="h-32 flex gap-2 overflow-x-auto py-2">
                      {participants.slice(1).map((p) => (
                        <div key={p.id} className="w-48 flex-shrink-0">
                          <ParticipantVideo 
                            participant={p}
                            isSelf={p.userId === user?.id}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Grid view */
                participants.map((p) => (
                  <ParticipantVideo 
                    key={p.id} 
                    participant={p}
                    isSelf={p.userId === user?.id}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Side panels */}
        <AnimatePresence>
          {/* Participants panel */}
          {showParticipants && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-gray-800 border-l border-gray-700 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-white">Participants ({participants.length})</h3>
                <button
                  onClick={() => setShowParticipants(false)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {p.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
              if (!showParticipants) setShowChat(false);
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

          {/* Chat */}
          <button
            onClick={() => {
              setShowChat(!showChat);
              if (!showChat) setShowParticipants(false);
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
    </div>
  );
}
