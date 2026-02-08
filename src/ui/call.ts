import { el } from './dom';

export function renderCall(opts: {
  code: string;
  status?: string;
  error?: string;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onLeave: () => void;
  onCopyCode: () => void;
}) {
  const top = el(
    'div',
    { class: 'callTop' },
    el('div', { class: 'roomPill' },
      el('div', { class: 'roomLabel', text: 'ROOM' }),
      el('div', { class: 'roomCode', text: opts.code }),
      el('button', { class: 'pillBtn', type: 'button', text: 'Copy', onclick: () => opts.onCopyCode() })
    ),
    el('div', { class: 'callHint', text: opts.status || 'Ready.' })
  );

  const remoteVideo = el('video', { class: 'vid vid--remote', autoplay: true, playsinline: true });
  const localVideo = el('video', { class: 'vid vid--local', autoplay: true, muted: true, playsinline: true });

  // Streams are assigned after node creation.
  if (opts.remoteStream) (remoteVideo as HTMLVideoElement).srcObject = opts.remoteStream;
  if (opts.localStream) (localVideo as HTMLVideoElement).srcObject = opts.localStream;

  const stage = el(
    'div',
    { class: 'stage' },
    remoteVideo,
    el('div', { class: 'localWrap' }, localVideo)
  );

  const controls = el(
    'div',
    { class: 'controls' },
    el('button', {
      class: `ctl ${opts.micOn ? '' : 'ctl--off'}`,
      type: 'button',
      text: opts.micOn ? 'Mic' : 'Mic off',
      onclick: () => opts.onToggleMic()
    }),
    el('button', {
      class: `ctl ${opts.camOn ? '' : 'ctl--off'}`,
      type: 'button',
      text: opts.camOn ? 'Cam' : 'Cam off',
      onclick: () => opts.onToggleCam()
    }),
    el('button', {
      class: 'ctl ctl--danger',
      type: 'button',
      text: 'Leave',
      onclick: () => opts.onLeave()
    })
  );

  const error = opts.error
    ? el('div', { class: 'error callError' }, el('div', { class: 'errorText', text: opts.error }))
    : null;

  return el('div', { class: 'callWrap' }, top, stage, controls, error);
}
