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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  VideoConference as _VideoConference
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

/** ICE candidates that arrived before the peer's remote description (or before the peer existed). */
const pendingIce: Map<string, RTCIceCandidateInit[]> = new Map();

/** When we sent our current, unanswered offer to each peer. */
const offerSentAt: Map<string, number> = new Map();

/**
 * Signaling messages already handled. The conference page receives every
 * message twice - once from the realtime subscription and again from the
 * 2-second polling fallback - and a second copy of an offer or answer applied
 * to a connection that has moved on broke it.
 */
const processedMessageIds: Set<string> = new Set();
const MAX_PROCESSED_IDS = 5000;

/** An offer that has gone unanswered this long is re-sent on the next connect attempt. */
const OFFER_RETRY_MS = 15_000;

// Callback functions
let onRemoteStreamCallback: ((userId: string, stream: MediaStream) => void) | null = null;
let onParticipantDisconnectedCallback: ((userId: string) => void) | null = null;
let onSignalingMessageCallback: ((message: RTCSignalingMessage) => void) | null = null;

// Local stream reference
let localStream: MediaStream | null = null;

/** Outgoing video that replaces the camera while set (screen sharing). */
let outgoingVideoOverride: MediaStreamTrack | null = null;

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
// MEDIA ON THE WIRE
// ============================================================

/**
 * Put this device's current tracks on a connection's audio and video
 * transceivers.
 *
 * Every connection carries one audio and one video transceiver from the start,
 * whether or not anything is being sent, so changing what is sent is always a
 * replaceTrack - never a renegotiation. Tracks used to be added once with
 * addTrack when the connection was made, so a screen share (or a camera that
 * was not available at the start) never reached anyone.
 */
function attachLocalTracks(pc: RTCPeerConnection): void {
  for (const kind of ['audio', 'video'] as const) {
    const track = kind === 'video'
      ? (outgoingVideoOverride || localStream?.getVideoTracks()[0] || null)
      : (localStream?.getAudioTracks()[0] || null);
    const transceiver = pc.getTransceivers().find(t => t.receiver.track?.kind === kind);
    if (!transceiver) continue;
    if (transceiver.direction !== 'sendrecv' && transceiver.direction !== 'stopped') {
      try { transceiver.direction = 'sendrecv'; } catch { /* connection closed */ }
    }
    if (transceiver.sender.track !== track) {
      void transceiver.sender.replaceTrack(track).catch(() => { /* connection closed */ });
    }
  }
}

/**
 * Send `track` as this device's video on every connection - a screen share -
 * or go back to the camera with `null`.
 */
export function setOutgoingVideoTrack(track: MediaStreamTrack | null): void {
  outgoingVideoOverride = track;
  peerConnections.forEach(pc => attachLocalTracks(pc));
}

/** The DTLS fingerprint in an SDP: it identifies the remote peer connection instance. */
function fingerprintOf(sdp: string | undefined | null): string | null {
  const m = /a=fingerprint:\S+ (\S+)/i.exec(sdp || '');
  return m ? m[1].toUpperCase() : null;
}

const isDead = (pc: RTCPeerConnection) =>
  pc.connectionState === 'closed' || pc.connectionState === 'failed' || pc.signalingState === 'closed';

async function flushPendingIce(remoteUserId: string): Promise<void> {
  const pc = peerConnections.get(remoteUserId);
  const queued = pendingIce.get(remoteUserId);
  if (!pc || !pc.remoteDescription || !queued?.length) return;
  pendingIce.delete(remoteUserId);
  for (const candidate of queued) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      /* stale candidate */
    }
  }
}

function dropPeer(remoteUserId: string): void {
  const pc = peerConnections.get(remoteUserId);
  if (pc) {
    try { pc.close(); } catch { /* already closed */ }
  }
  peerConnections.delete(remoteUserId);
  remoteStreams.delete(remoteUserId);
  offerSentAt.delete(remoteUserId);
}

// ============================================================
// PEER CONNECTION MANAGEMENT
// ============================================================

/**
 * Create a new peer connection for a participant.
 *
 * The offering side creates the audio and video transceivers; the answering
 * side (`asOfferer = false`) gets them from the offer.
 */
export function createPeerConnection(
  conferenceId: string,
  localUserId: string,
  localUserName: string,
  remoteUserId: string,
  asOfferer = true
): RTCPeerConnection {
  // Reuse a live connection; a failed or closed one is replaced.
  const existingConnection = peerConnections.get(remoteUserId);
  if (existingConnection && !isDead(existingConnection)) {
    return existingConnection;
  }
  if (existingConnection) dropPeer(remoteUserId);

  const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  peerConnections.set(remoteUserId, peerConnection);

  if (asOfferer) {
    peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
    peerConnection.addTransceiver('video', { direction: 'sendrecv' });
    attachLocalTracks(peerConnection);
  }

  // Handle incoming tracks from remote peer. A track sent on a transceiver may
  // arrive without a stream; the peer's tracks are gathered into one stream.
  peerConnection.ontrack = (event) => {
    console.log('[WebRTC] Received remote track from:', remoteUserId);
    let remoteStream = remoteStreams.get(remoteUserId) || event.streams[0];
    if (!remoteStream) remoteStream = new MediaStream();
    if (!remoteStream.getTracks().includes(event.track)) remoteStream.addTrack(event.track);
    remoteStreams.set(remoteUserId, remoteStream);
    if (onRemoteStreamCallback) {
      onRemoteStreamCallback(remoteUserId, remoteStream);
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

  // Handle connection state changes. 'disconnected' is often a brief network
  // blip that recovers by itself, so only a failed or closed connection ends
  // the participant's tile; it is then dropped so the next connect attempt
  // starts afresh instead of reusing a dead connection forever.
  peerConnection.onconnectionstatechange = () => {
    console.log(`[WebRTC] Connection state with ${remoteUserId}:`, peerConnection.connectionState);

    if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'closed') {
      if (peerConnections.get(remoteUserId) === peerConnection) dropPeer(remoteUserId);
      if (onParticipantDisconnectedCallback) {
        onParticipantDisconnectedCallback(remoteUserId);
      }
    }
  };

  // Handle ICE connection state
  peerConnection.oniceconnectionstatechange = () => {
    console.log(`[WebRTC] ICE state with ${remoteUserId}:`, peerConnection.iceConnectionState);
  };

  return peerConnection;
}

/**
 * Create and send an SDP offer to a remote peer.
 *
 * The conference page calls this every few seconds for anyone whose video has
 * not arrived yet. It used to re-offer each time, renegotiating a connection
 * that was still being set up; now an unanswered offer is left alone (and
 * re-sent only once it is clearly lost), and a connected peer is not
 * re-offered.
 */
export async function createOffer(
  conferenceId: string,
  localUserId: string,
  localUserName: string,
  remoteUserId: string
): Promise<void> {
  const existing = peerConnections.get(remoteUserId);
  if (existing && !isDead(existing)) {
    const sentAt = offerSentAt.get(remoteUserId) ?? 0;
    if (existing.signalingState === 'have-local-offer' && Date.now() - sentAt < OFFER_RETRY_MS) return;
    if (existing.signalingState === 'have-remote-offer') return;
    // Already negotiated (connected, connecting, or still gathering): leave it.
    if (existing.signalingState === 'stable' && existing.remoteDescription) return;
    if (existing.signalingState === 'have-local-offer') dropPeer(remoteUserId); // lost offer: start again
  }

  const peerConnection = createPeerConnection(conferenceId, localUserId, localUserName, remoteUserId);

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    offerSentAt.set(remoteUserId, Date.now());

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
 * Handle an incoming SDP offer and create an answer.
 *
 * When both sides offer at once (both join, both call), exactly one must give
 * way or neither connects. The participant with the greater id is "polite":
 * it rolls back its own offer and answers. The other ignores the incoming
 * offer and waits for the answer to its own.
 */
export async function handleOffer(
  conferenceId: string,
  localUserId: string,
  localUserName: string,
  fromUserId: string,
  offerSdp: RTCSessionDescriptionInit
): Promise<void> {
  try {
    let existing = peerConnections.get(fromUserId);

    // A different fingerprint means the peer reloaded and this is a new
    // connection on their side; the old one cannot be renegotiated into it.
    if (existing?.remoteDescription
        && fingerprintOf(existing.remoteDescription.sdp) !== fingerprintOf(offerSdp.sdp)) {
      dropPeer(fromUserId);
      existing = undefined;
    }

    if (existing && existing.signalingState === 'have-local-offer') {
      const polite = localUserId > fromUserId;
      if (!polite) {
        console.log('[WebRTC] Offer collision with', fromUserId, '- keeping ours');
        return;
      }
      await existing.setLocalDescription({ type: 'rollback' });
      offerSentAt.delete(fromUserId);
    } else if (existing && existing.signalingState !== 'stable') {
      dropPeer(fromUserId);
    }

    const peerConnection = createPeerConnection(conferenceId, localUserId, localUserName, fromUserId, false);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));
    attachLocalTracks(peerConnection);
    await flushPendingIce(fromUserId);
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
  // Only an answer to an offer we are waiting on applies. Any other is stale
  // (a duplicate, or for a connection we have since replaced) - not an error.
  if (!peerConnection || peerConnection.signalingState !== 'have-local-offer') {
    return;
  }

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
    offerSentAt.delete(fromUserId);
    await flushPendingIce(fromUserId);
    console.log('[WebRTC] Set remote description from answer:', fromUserId);
  } catch (error) {
    console.error('[WebRTC] Error handling answer:', error);
  }
}

/**
 * Handle an incoming ICE candidate.
 *
 * Candidates often arrive before the offer or answer they belong to has been
 * applied. They used to be dropped, which on hospital networks - where the
 * first candidates are often the only ones that work - meant no media at all.
 * They are now held and applied once the remote description is in place.
 */
export async function handleIceCandidate(
  fromUserId: string,
  candidate: RTCIceCandidateInit
): Promise<void> {
  const peerConnection = peerConnections.get(fromUserId);
  if (!peerConnection || !peerConnection.remoteDescription) {
    const queued = pendingIce.get(fromUserId) || [];
    queued.push(candidate);
    pendingIce.set(fromUserId, queued);
    return;
  }

  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.warn('[WebRTC] Error adding ICE candidate:', error);
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

  // Each message once (realtime and polling both deliver it).
  if (message.id) {
    if (processedMessageIds.has(message.id)) return;
    processedMessageIds.add(message.id);
    if (processedMessageIds.size > MAX_PROCESSED_IDS) {
      const oldest = processedMessageIds.values().next().value;
      if (oldest !== undefined) processedMessageIds.delete(oldest);
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(message.payload);
  } catch {
    console.warn('[WebRTC] Unreadable signaling payload from:', message.fromUserId);
    return;
  }

  switch (message.type) {
    case 'offer':
      await handleOffer(conferenceId, localUserId, localUserName, message.fromUserId, payload as RTCSessionDescriptionInit);
      break;
    case 'answer':
      await handleAnswer(message.fromUserId, payload as RTCSessionDescriptionInit);
      break;
    case 'ice-candidate':
      await handleIceCandidate(message.fromUserId, payload as RTCIceCandidateInit);
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
    // createOffer leaves a live or pending connection alone.
    await createOffer(conferenceId, localUserId, localUserName, participant.userId);
  }
}

/**
 * Close a specific peer connection
 */
export function closePeerConnection(userId: string): void {
  if (peerConnections.has(userId)) {
    dropPeer(userId);
    console.log('[WebRTC] Closed connection to:', userId);
  }
  pendingIce.delete(userId);
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
  pendingIce.clear();
  offerSentAt.clear();
  processedMessageIds.clear();
  localStream = null;
  outgoingVideoOverride = null;
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
 * Update local stream (e.g., when camera/mic changes). Reaches every peer,
 * including one connected while this device had no camera.
 */
export async function updateLocalStream(newStream: MediaStream): Promise<void> {
  localStream = newStream;
  peerConnections.forEach(pc => attachLocalTracks(pc));
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
  setOutgoingVideoTrack,
  
  // Waiting room
  isInWaitingRoom,
  getWaitingParticipants,
  getAdmittedParticipants,
};

export default WebRTCSignalingService;
