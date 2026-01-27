/**
 * WebRTC Signaling Service
 * AstroHEALTH Innovations in Healthcare
 * 
 * Handles peer-to-peer video/audio connections between meeting participants:
 * - SDP offer/answer exchange via Supabase Realtime
 * - ICE candidate exchange for NAT traversal
 * - Peer connection lifecycle management
 * - Waiting room admission control
 */

import { v4 as uuidv4 } from 'uuid';
import type { 
  ConferenceParticipant, 
  RTCSignalingMessage,
  VideoConference 
} from '../types';

// STUN/TURN servers for NAT traversal
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

// Store peer connections by participant ID
const peerConnections: Map<string, RTCPeerConnection> = new Map();
const remoteStreams: Map<string, MediaStream> = new Map();

// Callback functions
let onRemoteStreamCallback: ((userId: string, stream: MediaStream) => void) | null = null;
let onParticipantDisconnectedCallback: ((userId: string) => void) | null = null;
let onSignalingMessageCallback: ((message: RTCSignalingMessage) => void) | null = null;

// Local stream reference
let localStream: MediaStream | null = null;

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize the WebRTC service with local stream
 */
export function initializeWebRTC(stream: MediaStream): void {
  localStream = stream;
  console.log('[WebRTC] Initialized with local stream');
}

/**
 * Set callback for when remote streams are received
 */
export function onRemoteStream(callback: (userId: string, stream: MediaStream) => void): void {
  onRemoteStreamCallback = callback;
}

/**
 * Set callback for when a participant disconnects
 */
export function onParticipantDisconnected(callback: (userId: string) => void): void {
  onParticipantDisconnectedCallback = callback;
}

/**
 * Set callback for outgoing signaling messages (to send via Supabase)
 */
export function onSignalingMessage(callback: (message: RTCSignalingMessage) => void): void {
  onSignalingMessageCallback = callback;
}

// ============================================================
// PEER CONNECTION MANAGEMENT
// ============================================================

/**
 * Create a new peer connection for a participant
 */
export function createPeerConnection(
  conferenceId: string,
  localUserId: string,
  localUserName: string,
  remoteUserId: string
): RTCPeerConnection {
  // Check if connection already exists
  const existingConnection = peerConnections.get(remoteUserId);
  if (existingConnection && existingConnection.connectionState !== 'closed') {
    return existingConnection;
  }

  const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  // Add local tracks to the connection
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream!);
    });
  }

  // Handle incoming tracks from remote peer
  peerConnection.ontrack = (event) => {
    console.log('[WebRTC] Received remote track from:', remoteUserId);
    const remoteStream = event.streams[0];
    if (remoteStream) {
      remoteStreams.set(remoteUserId, remoteStream);
      if (onRemoteStreamCallback) {
        onRemoteStreamCallback(remoteUserId, remoteStream);
      }
    }
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && onSignalingMessageCallback) {
      const message: RTCSignalingMessage = {
        id: uuidv4(),
        conferenceId,
        fromUserId: localUserId,
        fromUserName: localUserName,
        toUserId: remoteUserId,
        type: 'ice-candidate',
        payload: JSON.stringify(event.candidate.toJSON()),
        createdAt: new Date(),
      };
      onSignalingMessageCallback(message);
    }
  };

  // Handle connection state changes
  peerConnection.onconnectionstatechange = () => {
    console.log(`[WebRTC] Connection state with ${remoteUserId}:`, peerConnection.connectionState);
    
    if (peerConnection.connectionState === 'disconnected' || 
        peerConnection.connectionState === 'failed' ||
        peerConnection.connectionState === 'closed') {
      if (onParticipantDisconnectedCallback) {
        onParticipantDisconnectedCallback(remoteUserId);
      }
      remoteStreams.delete(remoteUserId);
    }
  };

  // Handle ICE connection state
  peerConnection.oniceconnectionstatechange = () => {
    console.log(`[WebRTC] ICE state with ${remoteUserId}:`, peerConnection.iceConnectionState);
  };

  peerConnections.set(remoteUserId, peerConnection);
  return peerConnection;
}

/**
 * Create and send an SDP offer to a remote peer
 */
export async function createOffer(
  conferenceId: string,
  localUserId: string,
  localUserName: string,
  remoteUserId: string
): Promise<void> {
  const peerConnection = createPeerConnection(conferenceId, localUserId, localUserName, remoteUserId);
  
  try {
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peerConnection.setLocalDescription(offer);

    if (onSignalingMessageCallback) {
      const message: RTCSignalingMessage = {
        id: uuidv4(),
        conferenceId,
        fromUserId: localUserId,
        fromUserName: localUserName,
        toUserId: remoteUserId,
        type: 'offer',
        payload: JSON.stringify(offer),
        createdAt: new Date(),
      };
      onSignalingMessageCallback(message);
    }
    console.log('[WebRTC] Sent offer to:', remoteUserId);
  } catch (error) {
    console.error('[WebRTC] Error creating offer:', error);
  }
}

/**
 * Handle an incoming SDP offer and create an answer
 */
export async function handleOffer(
  conferenceId: string,
  localUserId: string,
  localUserName: string,
  fromUserId: string,
  offerSdp: RTCSessionDescriptionInit
): Promise<void> {
  const peerConnection = createPeerConnection(conferenceId, localUserId, localUserName, fromUserId);
  
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    if (onSignalingMessageCallback) {
      const message: RTCSignalingMessage = {
        id: uuidv4(),
        conferenceId,
        fromUserId: localUserId,
        fromUserName: localUserName,
        toUserId: fromUserId,
        type: 'answer',
        payload: JSON.stringify(answer),
        createdAt: new Date(),
      };
      onSignalingMessageCallback(message);
    }
    console.log('[WebRTC] Sent answer to:', fromUserId);
  } catch (error) {
    console.error('[WebRTC] Error handling offer:', error);
  }
}

/**
 * Handle an incoming SDP answer
 */
export async function handleAnswer(
  fromUserId: string,
  answerSdp: RTCSessionDescriptionInit
): Promise<void> {
  const peerConnection = peerConnections.get(fromUserId);
  if (!peerConnection) {
    console.error('[WebRTC] No peer connection for:', fromUserId);
    return;
  }

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
    console.log('[WebRTC] Set remote description from answer:', fromUserId);
  } catch (error) {
    console.error('[WebRTC] Error handling answer:', error);
  }
}

/**
 * Handle an incoming ICE candidate
 */
export async function handleIceCandidate(
  fromUserId: string,
  candidate: RTCIceCandidateInit
): Promise<void> {
  const peerConnection = peerConnections.get(fromUserId);
  if (!peerConnection) {
    console.warn('[WebRTC] No peer connection for ICE candidate from:', fromUserId);
    return;
  }

  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    console.log('[WebRTC] Added ICE candidate from:', fromUserId);
  } catch (error) {
    console.error('[WebRTC] Error adding ICE candidate:', error);
  }
}

/**
 * Process an incoming signaling message
 */
export async function processSignalingMessage(
  conferenceId: string,
  localUserId: string,
  localUserName: string,
  message: RTCSignalingMessage
): Promise<void> {
  // Ignore messages from self
  if (message.fromUserId === localUserId) return;
  
  // Ignore messages not meant for us
  if (message.toUserId !== localUserId && message.toUserId !== 'all') return;

  const payload = JSON.parse(message.payload);

  switch (message.type) {
    case 'offer':
      await handleOffer(conferenceId, localUserId, localUserName, message.fromUserId, payload);
      break;
    case 'answer':
      await handleAnswer(message.fromUserId, payload);
      break;
    case 'ice-candidate':
      await handleIceCandidate(message.fromUserId, payload);
      break;
    default:
      console.log('[WebRTC] Unknown message type:', message.type);
  }
}

/**
 * Connect to all admitted participants in a conference
 */
export async function connectToParticipants(
  conferenceId: string,
  localUserId: string,
  localUserName: string,
  participants: ConferenceParticipant[]
): Promise<void> {
  const admittedParticipants = participants.filter(
    p => p.userId !== localUserId && 
         p.admissionStatus === 'admitted' && 
         !p.leftAt &&
         p.connectionStatus !== 'disconnected'
  );

  for (const participant of admittedParticipants) {
    // Only create offer if we haven't connected yet
    if (!peerConnections.has(participant.userId)) {
      await createOffer(conferenceId, localUserId, localUserName, participant.userId);
    }
  }
}

/**
 * Close a specific peer connection
 */
export function closePeerConnection(userId: string): void {
  const peerConnection = peerConnections.get(userId);
  if (peerConnection) {
    peerConnection.close();
    peerConnections.delete(userId);
    remoteStreams.delete(userId);
    console.log('[WebRTC] Closed connection to:', userId);
  }
}

/**
 * Close all peer connections
 */
export function closeAllConnections(): void {
  peerConnections.forEach((connection, userId) => {
    connection.close();
    console.log('[WebRTC] Closed connection to:', userId);
  });
  peerConnections.clear();
  remoteStreams.clear();
  localStream = null;
}

/**
 * Get remote stream for a participant
 */
export function getRemoteStream(userId: string): MediaStream | undefined {
  return remoteStreams.get(userId);
}

/**
 * Get all remote streams
 */
export function getAllRemoteStreams(): Map<string, MediaStream> {
  return new Map(remoteStreams);
}

/**
 * Update local stream (e.g., when camera/mic changes)
 */
export async function updateLocalStream(newStream: MediaStream): Promise<void> {
  localStream = newStream;
  
  // Update tracks in all peer connections
  for (const [userId, peerConnection] of peerConnections) {
    const senders = peerConnection.getSenders();
    
    for (const track of newStream.getTracks()) {
      const sender = senders.find(s => s.track?.kind === track.kind);
      if (sender) {
        await sender.replaceTrack(track);
        console.log('[WebRTC] Replaced', track.kind, 'track for:', userId);
      }
    }
  }
}

// ============================================================
// WAITING ROOM HELPERS
// ============================================================

/**
 * Check if a participant is in waiting room
 */
export function isInWaitingRoom(participant: ConferenceParticipant): boolean {
  return participant.admissionStatus === 'waiting';
}

/**
 * Get all participants in waiting room
 */
export function getWaitingParticipants(participants: ConferenceParticipant[]): ConferenceParticipant[] {
  return participants.filter(p => p.admissionStatus === 'waiting' && !p.leftAt);
}

/**
 * Get all admitted participants
 */
export function getAdmittedParticipants(participants: ConferenceParticipant[]): ConferenceParticipant[] {
  return participants.filter(p => p.admissionStatus === 'admitted' && !p.leftAt);
}

// ============================================================
// EXPORTS
// ============================================================

const WebRTCSignalingService = {
  // Initialization
  initializeWebRTC,
  onRemoteStream,
  onParticipantDisconnected,
  onSignalingMessage,
  
  // Peer connection management
  createPeerConnection,
  createOffer,
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  processSignalingMessage,
  connectToParticipants,
  closePeerConnection,
  closeAllConnections,
  
  // Stream management
  getRemoteStream,
  getAllRemoteStreams,
  updateLocalStream,
  
  // Waiting room
  isInWaitingRoom,
  getWaitingParticipants,
  getAdmittedParticipants,
};

export default WebRTCSignalingService;
