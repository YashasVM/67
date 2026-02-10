export type MediaQuality = '720p' | '1080p' | 'auto';

/**
 * Detect optimal quality based on screen size and device capabilities
 */
export function detectOptimalQuality(): MediaQuality {
  const width = window.screen.width;
  const height = window.screen.height;
  const maxDimension = Math.max(width, height);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isPortrait = window.matchMedia('(orientation: portrait)').matches;

  // Mobile devices in portrait: use 720p to save bandwidth
  if (isMobile && isPortrait) {
    return '720p';
  }

  // Small screens: 720p is sufficient
  if (maxDimension <= 1366) {
    return '720p';
  }

  // Larger screens: 1080p for better quality
  return '1080p';
}

/**
 * Get appropriate video constraints based on orientation and quality
 */
function getVideoConstraints(quality: MediaQuality, orientation: 'portrait' | 'landscape'): MediaTrackConstraints {
  const actualQuality = quality === 'auto' ? detectOptimalQuality() : quality;
  const isPortrait = orientation === 'portrait';

  if (actualQuality === '1080p') {
    return {
      width: { ideal: isPortrait ? 1080 : 1920 },
      height: { ideal: isPortrait ? 1920 : 1080 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: 'user'
    };
  } else {
    return {
      width: { ideal: isPortrait ? 720 : 1280 },
      height: { ideal: isPortrait ? 1280 : 720 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: 'user'
    };
  }
}

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
  const isPortrait = window.matchMedia('(orientation: portrait)').matches;
  const orientation = isPortrait ? 'portrait' : 'landscape';

  const videoConstraints: MediaTrackConstraints | boolean = opts.video
    ? getVideoConstraints(opts.quality, orientation)
    : false;

  const audioConstraints: MediaTrackConstraints | boolean = opts.audio
    ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: { ideal: 48000 },
        channelCount: { ideal: 1 }
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
