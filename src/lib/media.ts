export type MediaQuality = '720p' | '1080p';

export function stopStream(stream?: MediaStream) {
  if (!stream) return;
  for (const t of stream.getTracks()) {
    try {
      t.stop();
    } catch {
      // ignore
    }
  }
}

export async function getLocalStream(opts: {
  quality: MediaQuality;
  audio: boolean;
  video: boolean;
}): Promise<MediaStream> {
  const videoConstraints: MediaTrackConstraints | boolean = opts.video
    ? opts.quality === '1080p'
      ? { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 60 } }
      : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 60 } }
    : false;

  const audioConstraints: MediaTrackConstraints | boolean = opts.audio
    ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    : false;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
    audio: audioConstraints
  });

  for (const t of stream.getVideoTracks()) {
    // Hint for the encoder; safe to ignore if unsupported.
    try {
      (t as any).contentHint = 'motion';
    } catch {
      // ignore
    }
  }

  return stream;
}

export function setEnabled(stream: MediaStream | undefined, kind: 'audio' | 'video', enabled: boolean) {
  if (!stream) return;
  const tracks = kind === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks();
  for (const t of tracks) t.enabled = enabled;
}
