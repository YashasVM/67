import { el } from './dom';
import { renderLanding } from './landing';
import { generateCode, normalizeCode } from '../lib/codes';
import { getSignalWsUrl, SignalClient, type SignalEvent } from '../lib/signal';
import type { SignalRelay } from '../lib/signal';
import { getLocalStream, setEnabled, stopStream, type MediaQuality } from '../lib/media';
import { RtcSession, type RtcRole } from '../lib/webrtc';
import { renderCall } from './call';

type Mode = 'create' | 'join';

type AppState = {
  mode: Mode;
  code: string;
  view?: 'landing' | 'call';
  status?: string;
  error?: string;
};

class App {
  private state: AppState = {
    mode: 'create',
    code: generateCode(6),
    view: 'landing'
  };

  private signal?: SignalClient;
  private rtc?: RtcSession;
  private local?: MediaStream;
  private remote?: MediaStream;
  private role?: RtcRole;

  private micOn = true;
  private camOn = true;
  private quality: MediaQuality = '1080p';

  constructor(private root: HTMLElement) {}

  render() {
    this.root.innerHTML = '';

    const view =
      this.state.view === 'call'
        ? renderCall({
            code: this.state.code,
            status: this.state.status,
            error: this.state.error,
            localStream: this.local,
            remoteStream: this.remote,
            micOn: this.micOn,
            camOn: this.camOn,
            onToggleMic: () => this.toggle('audio'),
            onToggleCam: () => this.toggle('video'),
            onLeave: () => this.leave(),
            onCopyCode: () => void this.copyCode()
          })
        : renderLanding({
            state: this.state,
            onMode: (mode) => {
              this.state.mode = mode;
              this.state.error = undefined;
              this.state.status = undefined;
              if (mode === 'create' && this.state.code.length < 6) this.state.code = generateCode(6);
              this.render();
            },
            onRegenerate: () => {
              this.state.code = generateCode(6);
              this.render();
            },
            onCodeInput: (code) => {
              this.state.code = normalizeCode(code);
            },
            onPrimary: () => {
              void this.start();
            }
          });

    this.root.appendChild(el('div', { class: 'shell' }, view));
  }

  private async start() {
    const code = normalizeCode(this.state.code);
    if (code.length < 6) {
      this.state.error = 'Code must be 6+ characters.';
      this.render();
      return;
    }

    this.state.code = code;
    this.state.error = undefined;
    this.state.status = 'Connecting…';
    this.state.view = 'call';
    this.render();

    // Acquire local media up front so the user sees themselves immediately.
    try {
      this.local = await getLocalStream({ quality: this.quality, audio: true, video: true });
      this.micOn = true;
      this.camOn = true;
    } catch (e) {
      this.state.error = e instanceof Error ? e.message : 'Camera/mic permission denied';
      this.state.status = undefined;
      this.render();
      return;
    }

    this.signal?.close();
    const url = getSignalWsUrl(code);
    const signal = new SignalClient(url);
    this.signal = signal;

    signal.onEvent = (evt: SignalEvent) => {
      if (evt.t === 'hello') {
        this.role = evt.role;
        this.state.status = evt.peers >= 2 ? 'Peer connected. Negotiating…' : 'Waiting for peer…';
        this.ensureRtc();
        this.rtc?.setPeerPresent(evt.peers >= 2);
        void this.rtc?.maybeStart();
        this.render();
        return;
      }
      if (evt.t === 'full') {
        this.state.error = 'Room is full (max 2 people).';
        this.state.status = undefined;
        this.render();
        return;
      }
      if (evt.t === 'peer-joined') {
        this.state.status = 'Peer connected. Negotiating…';
        this.ensureRtc();
        this.rtc?.setPeerPresent(true);
        void this.rtc?.maybeStart();
        this.render();
      }
      if (evt.t === 'peer-left') {
        this.state.status = 'Waiting for peer…';
        this.rtc?.setPeerPresent(false);
        this.render();
      }
      if (evt.t === 'relay') {
        const payload = evt.payload as SignalRelay;
        if (payload && typeof payload === 'object' && 't' in payload) {
          this.ensureRtc();
          void this.rtc?.handle(payload as SignalRelay);
        }
      }
    };

    try {
      await signal.connect();
      this.state.status =
        this.state.mode === 'create'
          ? `Room ${code} ready. Waiting for peer…`
          : `Joined room ${code}. Waiting for peer…`;
      this.render();
    } catch (e) {
      this.state.error = e instanceof Error ? e.message : 'Failed to connect';
      this.state.status = undefined;
      this.render();
    }
  }

  private ensureRtc() {
    if (this.rtc || !this.local || !this.signal || !this.role) return;
    const rtc = new RtcSession(
      this.role,
      this.local,
      (msg) => this.signal?.send(msg),
      {
        onRemoteStream: (s) => {
          this.remote = s;
          this.render();
        },
        onStatus: (s) => {
          this.state.status = s;
          this.render();
        },
        onError: (e) => {
          this.state.error = e;
          this.render();
        }
      }
    );
    this.rtc = rtc;
  }

  private toggle(kind: 'audio' | 'video') {
    if (!this.local) return;
    if (kind === 'audio') this.micOn = !this.micOn;
    else this.camOn = !this.camOn;
    setEnabled(this.local, kind, kind === 'audio' ? this.micOn : this.camOn);
    this.render();
  }

  private leave() {
    if (this.signal) this.signal.onEvent = undefined;
    this.signal?.close();
    this.signal = undefined;
    this.rtc?.close();
    this.rtc = undefined;
    stopStream(this.local);
    stopStream(this.remote);
    this.local = undefined;
    this.remote = undefined;
    this.role = undefined;
    this.state.status = undefined;
    this.state.error = undefined;
    this.state.view = 'landing';
    this.render();
  }

  private async copyCode() {
    const code = this.state.code;
    try {
      await navigator.clipboard.writeText(code);
      this.state.status = 'Copied code';
      this.render();
      setTimeout(() => {
        if (this.state.view !== 'call') return;
        if (this.state.status === 'Copied code') {
          this.state.status = 'Ready.';
          this.render();
        }
      }, 1000);
    } catch {
      // Fallback for older browsers.
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      this.state.status = 'Copied code';
      this.render();
    }
  }
}

export function mountApp(root: HTMLElement | null) {
  if (!root) throw new Error('Missing #app');
  new App(root).render();
}
