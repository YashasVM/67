import { el } from './dom';

export function renderLanding() {
  const brand = el('div', { class: 'brand' },
    el('div', { class: 'logo', text: '67.' }),
    el('div', { class: 'tag', text: 'P2P video calls. No login. No servers storing your media.' })
  );

  const card = el('div', { class: 'card', 'data-view': 'landing' },
    el('div', { class: 'tabs' },
      el('button', { class: 'tab tab--active', type: 'button', text: 'Create' }),
      el('button', { class: 'tab', type: 'button', text: 'Join' })
    ),
    el('div', { class: 'slot' },
      el('div', { class: 'drop' },
        el('div', { class: 'plus', text: '+' }),
        el('div', { class: 'dropText' },
          el('div', { class: 'muted', text: 'Create a room code, then share it.' }),
          el('div', { class: 'muted2', text: 'WebRTC + end-to-end encrypted media.' })
        )
      )
    )
  );

  const footer = el('div', { class: 'footer' },
    el('div', { class: 'footerCaps', text: 'END-TO-END  /  FAST P2P  /  NO STORAGE' }),
    el('div', { class: 'credit' },
      'Made by ',
      el('a', { href: 'https://github.com/YashasVM', target: '_blank', rel: 'noreferrer', class: 'creditLink', text: '@Yashas.VM' })
    )
  );

  const wrap = el('div', { class: 'wrap' }, brand, card, footer);
  wrap.style.animation = 'rise 420ms ease-out both';
  return wrap;
}
