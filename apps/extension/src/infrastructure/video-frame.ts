export interface CapturedVideoFrame {
  blob: Blob;
  videoTimeMs: number;
  width: number;
  height: number;
}

const MEDIA_WAIT_TIMEOUT_MS = 5_000;

export async function captureVideoFrame(
  video: HTMLVideoElement,
  timeSeconds: number,
  fallbackDurationSeconds = 0,
): Promise<CapturedVideoFrame> {
  if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
    throw new Error('Choose a valid point in the recording.');
  }
  await waitForMetadata(video);
  const duration =
    Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : fallbackDurationSeconds;
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('The recording duration is unavailable. Reload the review and try again.');
  }

  const targetTime = Math.min(timeSeconds, duration);
  video.pause();
  if (video.seeking || Math.abs(video.currentTime - targetTime) > 0.001) {
    const seeked = waitForMediaEvent(video, 'seeked');
    const presentedFrame = requestPresentedFrame(video);
    video.currentTime = targetTime;
    await seeked;
    await presentedFrame;
  } else {
    await nextPaint();
  }

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (width <= 0 || height <= 0) {
    throw new Error('The selected video frame is not ready. Move the playhead and try again.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Chrome could not prepare the selected video frame.');
  context.drawImage(video, 0, 0, width, height);
  const blob = await canvasToPng(canvas);

  return {
    blob,
    videoTimeMs: Math.round(video.currentTime * 1_000),
    width,
    height,
  };
}

async function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1) return;
  await waitForMediaEvent(video, 'loadedmetadata');
}

function waitForMediaEvent(video: HTMLVideoElement, eventName: 'loadedmetadata' | 'seeked') {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('The recording took too long to prepare. Reload the review and try again.'));
    }, MEDIA_WAIT_TIMEOUT_MS);
    const handleEvent = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error('Chrome could not decode the selected video frame.'));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener('error', handleError);
    };
    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener('error', handleError, { once: true });
  });
}

async function requestPresentedFrame(video: HTMLVideoElement): Promise<void> {
  if (!video.requestVideoFrameCallback) {
    await nextPaint();
    return;
  }
  await Promise.race([
    new Promise<void>((resolve) => video.requestVideoFrameCallback(() => resolve())),
    nextPaint(),
  ]);
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Chrome could not encode the selected video frame.'));
    }, 'image/png');
  });
}
