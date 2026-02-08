import { el } from './dom';
import { renderLanding } from './landing';
import { generateCode, normalizeCode } from '../lib/codes';

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
        const code = normalizeCode(this.state.code);
        if (code.length < 6) {
          this.state.error = 'Code must be 6+ characters.';
          this.render();
          return;
        }

        // Placeholder until signaling + WebRTC is wired.
        this.state.error = undefined;
        this.state.status = this.state.mode === 'create'
          ? `Room ${code} created. Waiting for a peer...`
          : `Joining room ${code}...`;
        this.render();
      }
    });

    this.root.appendChild(el('div', { class: 'shell' }, view));
  }
}

export function mountApp(root: HTMLElement | null) {
  if (!root) throw new Error('Missing #app');
  new App(root).render();
}
