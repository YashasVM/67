import { el } from './dom';
import { renderLanding } from './landing';
import { generateCode, normalizeCode } from '../lib/codes';
import { getSignalWsUrl, SignalClient, type SignalEvent } from '../lib/signal';

type Mode = 'create' | 'join';

type AppState = {
  mode: Mode;
  code: string;
  status?: string;
  error?: string;
};

class App {
  private state: AppState = {
    mode: 'create',
    code: generateCode(6)
  };

  private signal?: SignalClient;

  constructor(private root: HTMLElement) {}

  render() {
    this.root.innerHTML = '';

    const view = renderLanding({
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
    this.render();

    this.signal?.close();
    const url = getSignalWsUrl(code);
    const signal = new SignalClient(url);
    this.signal = signal;

    signal.onEvent = (evt: SignalEvent) => {
      if (evt.t === 'full') {
        this.state.error = 'Room is full (max 2 people).';
        this.state.status = undefined;
        this.render();
        return;
      }
      if (evt.t === 'peer-joined') {
        this.state.status = 'Peer connected. (WebRTC wiring next)';
        this.render();
      }
      if (evt.t === 'peer-left') {
        this.state.status = 'Waiting for peer…';
        this.render();
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
}

export function mountApp(root: HTMLElement | null) {
  if (!root) throw new Error('Missing #app');
  new App(root).render();
}
