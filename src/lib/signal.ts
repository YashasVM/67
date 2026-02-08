export type SignalEvent =
  | { t: 'hello'; v: number; role: 'a' | 'b'; peers: number }
  | { t: 'peer-joined' }
  | { t: 'peer-left' }
  | { t: 'full' }
  | { t: 'relay'; payload: unknown };

export type SignalRelay =
  | { t: 'offer'; sdp: RTCSessionDescriptionInit }
  | { t: 'answer'; sdp: RTCSessionDescriptionInit }
  | { t: 'ice'; candidate: RTCIceCandidateInit }
  | { t: 'chat'; text: string; ts: number };

function toWsBase(base: string): string {
  const b = base.trim().replace(/\/$/, '');
  if (b.startsWith('ws://') || b.startsWith('wss://')) return b;
  if (b.startsWith('http://')) return 'ws://' + b.slice('http://'.length);
  if (b.startsWith('https://')) return 'wss://' + b.slice('https://'.length);
  return b;
}

export function getSignalWsUrl(code: string): string {
  const raw = (import.meta as any).env?.VITE_SIGNAL_BASE as string | undefined;
  const base = raw ? toWsBase(raw) : '';

  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const fallbackBase = `${proto}//${location.host}`;

  return `${base || fallbackBase}/ws/${encodeURIComponent(code)}`;
}

export class SignalClient {
  private ws?: WebSocket;

  onEvent?: (evt: SignalEvent) => void;

  constructor(private url: string) {}

  async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      const onOpen = () => resolve();
      const onErr = () => reject(new Error('WebSocket failed to connect'));
      const onMsg = (e: MessageEvent) => {
        try {
          const evt = JSON.parse(String(e.data)) as SignalEvent;
          if (evt?.t === 'full') {
            this.onEvent?.(evt);
            ws.close(1008, 'room full');
          } else {
            this.onEvent?.(evt);
          }
        } catch {
          // ignore
        }
      };

      ws.addEventListener('open', onOpen);
      ws.addEventListener('error', onErr);
      ws.addEventListener('message', onMsg);
      ws.addEventListener('close', () => this.onEvent?.({ t: 'peer-left' }));
    });
  }

  send(payload: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  close() {
    try {
      this.ws?.close(1000, 'bye');
    } catch {
      // ignore
    }
    this.ws = undefined;
  }
}
