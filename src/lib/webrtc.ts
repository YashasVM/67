import type { SignalRelay } from './signal';

export type RtcRole = 'a' | 'b';

export type RtcEvents = {
  onRemoteStream: (stream: MediaStream) => void;
  onStatus: (s: string) => void;
  onError: (e: string) => void;
};

export class RtcSession {
  private pc: RTCPeerConnection;
  private remote = new MediaStream();
  private peerPresent = false;
  private started = false;

  constructor(
    private role: RtcRole,
    private local: MediaStream,
    private send: (msg: SignalRelay) => void,
    private ev: Partial<RtcEvents> = {}
  ) {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
        { urls: ['stun:stun.services.mozilla.com'] }
      ],
      iceCandidatePoolSize: 10
    });

    this.pc.addEventListener('track', (e) => {
      const s = e.streams?.[0];
      if (s) {
        this.remote = s;
        this.ev.onRemoteStream?.(this.remote);
        return;
      }

      // Safari can omit streams; build our own.
      if (!this.remote.getTracks().some((t) => t.id === e.track.id)) {
        this.remote.addTrack(e.track);
        this.ev.onRemoteStream?.(this.remote);
      }
    });

    this.pc.addEventListener('icecandidate', (e) => {
      if (!e.candidate) return;
      this.send({ t: 'ice', candidate: e.candidate.toJSON() });
    });

    this.pc.addEventListener('connectionstatechange', () => {
      const s = this.pc.connectionState;
      if (s === 'connected') this.ev.onStatus?.('Connected');
      else if (s === 'connecting') this.ev.onStatus?.('Connecting…');
      else if (s === 'disconnected') this.ev.onStatus?.('Disconnected');
      else if (s === 'failed') this.ev.onError?.('Connection failed');
    });

    for (const t of local.getTracks()) {
      this.pc.addTrack(t, local);
    }

    // Try to bias video towards quality. Browsers may ignore these hints.
    for (const sender of this.pc.getSenders()) {
      if (sender.track?.kind !== 'video') continue;
      try {
        const p = sender.getParameters();
        p.degradationPreference = 'maintain-resolution';
        p.encodings = p.encodings?.length ? p.encodings : [{} as RTCRtpEncodingParameters];
        // ~4.5 Mbps cap (works well for 1080p30).
        (p.encodings[0] as RTCRtpEncodingParameters).maxBitrate = 4_500_000;
        void sender.setParameters(p);
      } catch {
        // ignore
      }
    }
  }

  setPeerPresent(present: boolean) {
    this.peerPresent = present;
  }

  async maybeStart() {
    if (this.started) return;
    if (!this.peerPresent) return;
    if (this.role !== 'a') return;
    this.started = true;
    await this.makeOffer();
  }

  async handle(msg: SignalRelay) {
    if (msg.t === 'offer') {
      this.ev.onStatus?.('Incoming offer…');
      await this.pc.setRemoteDescription(msg.sdp);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.send({ t: 'answer', sdp: this.pc.localDescription! });
      return;
    }

    if (msg.t === 'answer') {
      await this.pc.setRemoteDescription(msg.sdp);
      return;
    }

    if (msg.t === 'ice') {
      try {
        await this.pc.addIceCandidate(msg.candidate);
      } catch {
        // This can fail if descriptions aren't set yet; safe to ignore.
      }
      return;
    }
  }

  private async makeOffer() {
    this.ev.onStatus?.('Creating offer…');
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await this.pc.setLocalDescription(offer);
    this.send({ t: 'offer', sdp: this.pc.localDescription! });
  }

  close() {
    try {
      this.pc.close();
    } catch {
      // ignore
    }
  }
}
