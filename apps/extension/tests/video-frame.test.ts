import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureVideoFrame } from '../src/infrastructure/video-frame';

const drawImage = vi.fn();
const frameBlob = new Blob(['frame'], { type: 'image/png' });

beforeEach(() => {
  drawImage.mockClear();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('video frame capture', () => {
  it('encodes the selected local video frame as a timestamped PNG', async () => {
    const { pause, video } = makeVideo({ currentTime: 3.067 });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback: BlobCallback) => callback(frameBlob),
    } as unknown as HTMLCanvasElement;
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) =>
      tagName === 'canvas' ? canvas : document.createElement(tagName),
    );

    const captured = await captureVideoFrame(video, 3.067);

    expect(pause).toHaveBeenCalledTimes(1);
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1_280, 720);
    expect(captured).toEqual({
      blob: frameBlob,
      videoTimeMs: 3_067,
      width: 1_280,
      height: 720,
    });
  });

  it('rejects an invalid point before touching the recording', async () => {
    const { pause, video } = makeVideo({ currentTime: 0 });

    await expect(captureVideoFrame(video, -1)).rejects.toThrow(
      'Choose a valid point in the recording.',
    );
    expect(pause).not.toHaveBeenCalled();
  });

  it('captures with the persisted duration when WebM metadata reports Infinity', async () => {
    const { video } = makeVideo({ currentTime: 7.783, duration: Number.POSITIVE_INFINITY });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback: BlobCallback) => callback(frameBlob),
    } as unknown as HTMLCanvasElement;
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) =>
      tagName === 'canvas' ? canvas : document.createElement(tagName),
    );

    const captured = await captureVideoFrame(video, 7.783, 7.783);

    expect(captured.videoTimeMs).toBe(7_783);
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1_280, 720);
  });
});

function makeVideo({ currentTime, duration = 10 }: { currentTime: number; duration?: number }) {
  const video = document.createElement('video');
  const pause = vi.fn();
  Object.defineProperties(video, {
    currentTime: { configurable: true, writable: true, value: currentTime },
    duration: { configurable: true, value: duration },
    readyState: { configurable: true, value: 4 },
    seeking: { configurable: true, value: false },
    videoWidth: { configurable: true, value: 1_280 },
    videoHeight: { configurable: true, value: 720 },
    pause: { configurable: true, value: pause },
  });
  return { pause, video };
}
