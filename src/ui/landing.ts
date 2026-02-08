import { el } from './dom';

type Mode = 'create' | 'join';

type LandingState = {
  mode: Mode;
  code: string;
  status?: string;
  error?: string;
};

type LandingHandlers = {
  onMode: (mode: Mode) => void;
  onRegenerate: () => void;
  onCodeInput: (code: string) => void;
  onPrimary: () => void;
};

export function renderLanding(opts: { state: LandingState } & LandingHandlers) {
  const { state } = opts;

  const brand = el(
    'div',
    { class: 'brand' },
    el('div', { class: 'logo', text: '67.' }),
    el('div', { class: 'tag', text: 'P2P video calls. No login. No storage.' })
  );

  const createActive = state.mode === 'create';

  const tabs = el(
    'div',
    { class: 'tabs' },
    el('button', {
      class: `tab ${createActive ? 'tab--active' : ''}`,
      type: 'button',
      text: 'Create',
      onclick: () => opts.onMode('create')
    }),
    el('button', {
      class: `tab ${!createActive ? 'tab--active' : ''}`,
      type: 'button',
      text: 'Join',
      onclick: () => opts.onMode('join')
    })
  );

  const codeRow = el(
    'div',
    { class: 'codeRow' },
    el('label', { class: 'label', text: createActive ? 'Room code' : 'Enter code' }),
    el(
      'div',
      { class: 'codeControls' },
      el('input', {
        class: 'codeInput',
        inputmode: 'text',
        autocomplete: 'off',
        spellcheck: 'false',
        value: state.code,
        placeholder: 'ABC123',
        oninput: (e: Event) => opts.onCodeInput((e.target as HTMLInputElement).value)
      }),
      createActive
        ? el('button', {
            class: 'btn btn--ghost',
            type: 'button',
            text: 'New',
            onclick: () => opts.onRegenerate()
          })
        : null
    )
  );

  const primary = el('button', {
    class: 'btn btn--primary',
    type: 'button',
    text: createActive ? 'Start' : 'Connect',
    onclick: () => opts.onPrimary()
  });

  const note = el(
    'div',
    { class: 'note' },
    el('div', { class: 'noteCaps', text: 'TIP' }),
    el('div', { class: 'noteText', text: createActive ? 'Share the code. The other person joins with it.' : 'Ask the other person for their code.' })
  );

  const status = state.status
    ? el('div', { class: 'status' }, el('div', { class: 'statusText', text: state.status }))
    : null;

  const error = state.error
    ? el('div', { class: 'error' }, el('div', { class: 'errorText', text: state.error }))
    : null;

  const card = el('div', { class: 'card', 'data-view': 'landing' },
    tabs,
    el('div', { class: 'slot' },
      codeRow,
      el('div', { class: 'actions' }, primary),
      note,
      status,
      error
    )
  );

  const footer = el(
    'div',
    { class: 'footer' },
    el('div', { class: 'footerCaps', text: 'END-TO-END  /  FAST P2P  /  NO STORAGE' }),
    el(
      'div',
      { class: 'credit' },
      'Made by ',
      el('a', {
        href: 'https://github.com/YashasVM',
        target: '_blank',
        rel: 'noreferrer',
        class: 'creditLink',
        text: '@Yashas.VM'
      })
    )
  );

  const wrap = el('div', { class: 'wrap' }, brand, card, footer);
  wrap.style.animation = 'rise 420ms ease-out both';
  return wrap;
}
