// ---------------------------------------------------------------------------
// Video conference connections survive the real order of events: ICE
// candidates before the offer, every message delivered twice (realtime and
// polling), both sides offering at once, the page asking to connect every few
// seconds, a peer reloading, and media that changes after connecting.
//
// Runs against a small fake RTCPeerConnection that enforces the same
// signaling-state rules as the browser.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { RTCSignalingMessage } from '../../types';
import * as rtc from '../webrtcSignalingService';

type Desc = { type: string; sdp?: string };

class FakeTrack {
  constructor(public kind: 'audio' | 'video', public id = Math.random().toString(36).slice(2)) {}
}

class FakeStream {
  tracks: FakeTrack[];
  constructor(tracks: FakeTrack[] = []) { this.tracks = [...tracks]; }
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio'); }
  getVideoTracks() { return this.tracks.filter(t => t.kind === 'video'); }
  addTrack(t: FakeTrack) { this.tracks.push(t); }
}

class FakeTransceiver {
  direction: string;
  receiver: { track: FakeTrack };
  sender: { track: FakeTrack | null; replaceTrack: (t: FakeTrack | null) => Promise<void> };
  constructor(kind: 'audio' | 'video', direction = 'sendrecv') {
    this.direction = direction;
    this.receiver = { track: new FakeTrack(kind) };
    const sender = {
      track: null as FakeTrack | null,
      replaceTrack: async (t: FakeTrack | null) => { sender.track = t; },
    };
    this.sender = sender;
  }
}

let fingerprintCounter = 0;
const created: FakePC[] = [];

class FakePC {
  signalingState = 'stable';
  connectionState = 'new';
  iceConnectionState = 'new';
  localDescription: Desc | null = null;
  remoteDescription: Desc | null = null;
  transceivers: FakeTransceiver[] = [];
  addedCandidates: unknown[] = [];
  fingerprint = `AA:${++fingerprintCounter}`;
  ontrack: ((e: unknown) => void) | null = null;
  onicecandidate: ((e: unknown) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  constructor() { created.push(this); }
  addTransceiver(kind: 'audio' | 'video', init?: { direction?: string }) {
    const t = new FakeTransceiver(kind, init?.direction);
    this.transceivers.push(t);
    return t;
  }
  getTransceivers() { return this.transceivers; }
  async createOffer(): Promise<Desc> { return { type: 'offer', sdp: `v=0\r\na=fingerprint:sha-256 ${this.fingerprint}\r\n` }; }
  async createAnswer(): Promise<Desc> {
    if (this.signalingState !== 'have-remote-offer') throw new Error('InvalidStateError: no offer');
    return { type: 'answer', sdp: `v=0\r\na=fingerprint:sha-256 ${this.fingerprint}\r\n` };
  }
  async setLocalDescription(d: Desc) {
    if (d.type === 'rollback') {
      if (this.signalingState !== 'have-local-offer') throw new Error('InvalidStateError: nothing to roll back');
      this.signalingState = 'stable';
      this.localDescription = null;
      return;
    }
    if (d.type === 'offer') this.signalingState = 'have-local-offer';
    if (d.type === 'answer') { this.signalingState = 'stable'; this.connectionState = 'connecting'; }
    this.localDescription = d;
  }
  async setRemoteDescription(d: Desc) {
    if (d.type === 'offer') {
      if (this.signalingState !== 'stable') throw new Error('InvalidStateError: offer in ' + this.signalingState);
      this.signalingState = 'have-remote-offer';
      if (!this.transceivers.length) {
        this.transceivers.push(new FakeTransceiver('audio', 'recvonly'), new FakeTransceiver('video', 'recvonly'));
      }
    } else if (d.type === 'answer') {
      if (this.signalingState !== 'have-local-offer') throw new Error('InvalidStateError: answer in ' + this.signalingState);
      this.signalingState = 'stable';
      this.connectionState = 'connecting';
    }
    this.remoteDescription = d;
  }
  async addIceCandidate(c: unknown) {
    if (!this.remoteDescription) throw new Error('InvalidStateError: no remote description');
    this.addedCandidates.push(c);
  }
  close() { this.signalingState = 'closed'; this.connectionState = 'closed'; }
}

const sent: RTCSignalingMessage[] = [];
let seq = 0;
const msg = (type: RTCSignalingMessage['type'], from: string, to: string, payload: unknown, id = `m${++seq}`): RTCSignalingMessage => ({
  id, conferenceId: 'conf', fromUserId: from, fromUserName: from, toUserId: to, type,
  payload: JSON.stringify(payload), createdAt: new Date(),
});
const lastPc = () => created[created.length - 1];
const offerSdp = (fp: string) => ({ type: 'offer', sdp: `v=0\r\na=fingerprint:sha-256 ${fp}\r\n` });

beforeEach(() => {
  vi.stubGlobal('RTCPeerConnection', FakePC);
  // `new X(init)` returns the init object itself, as far as these tests care.
  vi.stubGlobal('RTCSessionDescription', function FakeDescription(d: Desc) { return d; });
  vi.stubGlobal('RTCIceCandidate', function FakeCandidate(c: object) { return c; });
  vi.stubGlobal('MediaStream', FakeStream);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  created.length = 0;
  sent.length = 0;
  rtc.closeAllConnections();
  rtc.onSignalingMessage(m => { sent.push(m); });
  rtc.initializeWebRTC(new FakeStream([new FakeTrack('audio'), new FakeTrack('video')]) as unknown as MediaStream);
});

afterEach(() => {
  rtc.closeAllConnections();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ICE candidates', () => {
  it('a candidate that arrives before the offer is kept and applied once the offer is', async () => {
    await rtc.processSignalingMessage('conf', 'b', 'B', msg('ice-candidate', 'a', 'b', { candidate: 'c1' }));
    expect(created).toHaveLength(0);
    await rtc.processSignalingMessage('conf', 'b', 'B', msg('offer', 'a', 'b', offerSdp('A1')));
    expect(lastPc().addedCandidates).toEqual([{ candidate: 'c1' }]);
    expect(sent.filter(m => m.type === 'answer')).toHaveLength(1);
  });

  it('a candidate that arrives before the answer is applied after it', async () => {
    await rtc.createOffer('conf', 'a', 'A', 'b');
    await rtc.processSignalingMessage('conf', 'a', 'A', msg('ice-candidate', 'b', 'a', { candidate: 'c2' }));
    expect(lastPc().addedCandidates).toEqual([]);
    await rtc.processSignalingMessage('conf', 'a', 'A', msg('answer', 'b', 'a', { type: 'answer', sdp: 'a=fingerprint:sha-256 B1' }));
    expect(lastPc().signalingState).toBe('stable');
    expect(lastPc().addedCandidates).toEqual([{ candidate: 'c2' }]);
  });
});

describe('duplicate delivery', () => {
  it('the same offer delivered by realtime and by polling is answered once', async () => {
    const offer = msg('offer', 'a', 'b', offerSdp('A1'), 'dup-1');
    await rtc.processSignalingMessage('conf', 'b', 'B', offer);
    await rtc.processSignalingMessage('conf', 'b', 'B', { ...offer });
    expect(sent.filter(m => m.type === 'answer')).toHaveLength(1);
    expect(created).toHaveLength(1);
  });

  it('a stale answer is ignored, not applied to a settled connection', async () => {
    await rtc.createOffer('conf', 'a', 'A', 'b');
    const answer = { type: 'answer' as const, sdp: 'a=fingerprint:sha-256 B1' };
    await rtc.processSignalingMessage('conf', 'a', 'A', msg('answer', 'b', 'a', answer));
    await expect(rtc.handleAnswer('b', answer)).resolves.toBeUndefined();
    expect(lastPc().signalingState).toBe('stable');
  });
});

describe('both sides offering at once', () => {
  it('the impolite side (smaller id) keeps its offer and ignores the other', async () => {
    await rtc.createOffer('conf', 'a', 'A', 'b');
    await rtc.processSignalingMessage('conf', 'a', 'A', msg('offer', 'b', 'a', offerSdp('B1')));
    expect(lastPc().signalingState).toBe('have-local-offer');
    expect(sent.filter(m => m.type === 'answer')).toHaveLength(0);
  });

  it('the polite side (greater id) rolls back and answers', async () => {
    await rtc.createOffer('conf', 'b', 'B', 'a');
    await rtc.processSignalingMessage('conf', 'b', 'B', msg('offer', 'a', 'b', offerSdp('A1')));
    expect(created).toHaveLength(1);
    expect(lastPc().signalingState).toBe('stable');
    expect(sent.filter(m => m.type === 'answer')).toHaveLength(1);
  });
});

describe('repeated connect attempts', () => {
  it('does not re-offer while an offer is pending or once negotiated', async () => {
    await rtc.createOffer('conf', 'a', 'A', 'b');
    await rtc.createOffer('conf', 'a', 'A', 'b');
    expect(sent.filter(m => m.type === 'offer')).toHaveLength(1);
    await rtc.processSignalingMessage('conf', 'a', 'A', msg('answer', 'b', 'a', { type: 'answer', sdp: 'a=fingerprint:sha-256 B1' }));
    await rtc.createOffer('conf', 'a', 'A', 'b');
    expect(sent.filter(m => m.type === 'offer')).toHaveLength(1);
    expect(created).toHaveLength(1);
  });

  it('re-offers on a fresh connection once the previous one failed', async () => {
    await rtc.createOffer('conf', 'a', 'A', 'b');
    const first = lastPc();
    first.connectionState = 'failed';
    first.onconnectionstatechange?.();
    await rtc.createOffer('conf', 'a', 'A', 'b');
    expect(created).toHaveLength(2);
    expect(sent.filter(m => m.type === 'offer')).toHaveLength(2);
  });

  it('a peer that reloaded (new fingerprint) gets a new connection', async () => {
    await rtc.processSignalingMessage('conf', 'b', 'B', msg('offer', 'a', 'b', offerSdp('A1')));
    await rtc.processSignalingMessage('conf', 'b', 'B', msg('offer', 'a', 'b', offerSdp('A2')));
    expect(created).toHaveLength(2);
    expect(created[0].signalingState).toBe('closed');
    expect(sent.filter(m => m.type === 'answer')).toHaveLength(2);
  });
});

describe('media', () => {
  it('offers carry audio and video transceivers with the local tracks attached', async () => {
    await rtc.createOffer('conf', 'a', 'A', 'b');
    const kinds = lastPc().transceivers.map(t => [t.receiver.track.kind, t.sender.track?.kind]);
    expect(kinds).toEqual([['audio', 'audio'], ['video', 'video']]);
  });

  it('the answerer sends too, not only receives', async () => {
    await rtc.processSignalingMessage('conf', 'b', 'B', msg('offer', 'a', 'b', offerSdp('A1')));
    for (const t of lastPc().transceivers) {
      expect(t.direction).toBe('sendrecv');
      expect(t.sender.track?.kind).toBe(t.receiver.track.kind);
    }
  });

  it('a screen share replaces the outgoing video on every peer, and stopping it restores the camera', async () => {
    await rtc.createOffer('conf', 'a', 'A', 'b');
    await rtc.createOffer('conf', 'a', 'A', 'c');
    const screen = new FakeTrack('video');
    rtc.setOutgoingVideoTrack(screen as unknown as MediaStreamTrack);
    await Promise.resolve();
    for (const pc of created) expect(pc.transceivers[1].sender.track).toBe(screen);
    rtc.setOutgoingVideoTrack(null);
    await Promise.resolve();
    for (const pc of created) expect(pc.transceivers[1].sender.track).not.toBe(screen);
  });

  it('a camera that appears after connecting reaches the peer', async () => {
    rtc.initializeWebRTC(new FakeStream([new FakeTrack('audio')]) as unknown as MediaStream);
    await rtc.createOffer('conf', 'a', 'A', 'b');
    expect(lastPc().transceivers[1].sender.track).toBeNull();
    const cam = new FakeTrack('video');
    await rtc.updateLocalStream(new FakeStream([new FakeTrack('audio'), cam]) as unknown as MediaStream);
    await Promise.resolve();
    expect(lastPc().transceivers[1].sender.track).toBe(cam);
  });

  it('remote tracks that arrive without a stream are gathered into one', async () => {
    const got: MediaStream[] = [];
    rtc.onRemoteStream((_id, s) => got.push(s));
    await rtc.createOffer('conf', 'a', 'A', 'b');
    const a = new FakeTrack('audio');
    const v = new FakeTrack('video');
    lastPc().ontrack?.({ track: a, streams: [] });
    lastPc().ontrack?.({ track: v, streams: [] });
    expect(got[1]).toBe(got[0]);
    expect((got[1] as unknown as FakeStream).getTracks()).toEqual([a, v]);
  });
});

describe('conference page', () => {
  it('does not tear the call down on every conference poll', () => {
    const page = readFileSync(join(process.cwd(), 'src/domains/communication/pages/VideoConferencePage.tsx'), 'utf8');
    expect(page).not.toMatch(/\}, \[isJoined, stream, conference, user, isWebRTCInitialized\]\);/);
    expect(page).toMatch(/\}, \[isJoined, hasLocalStream, webrtcConferenceId, user\?\.id\]\);/);
    expect(page).toMatch(/WebRTCSignalingService\.setOutgoingVideoTrack\(screenStream\?\.getVideoTracks\(\)\[0\] \?\? null\)/);
  });
});
