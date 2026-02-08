import { el } from './dom';
import { renderLanding } from './landing';

export function mountApp(root: HTMLElement | null) {
  if (!root) throw new Error('Missing #app');
  root.innerHTML = '';
  root.appendChild(el('div', { class: 'shell' }, renderLanding()));
}
