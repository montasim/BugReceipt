import { deleteRecording, saveRecording } from './recording-store';

type RecordingEvidence = {
  blobId: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
};

type ActiveRecording = {
  sessionId: string;
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  mimeType: string;
  startedAt: number;
  completed: Promise<RecordingEvidence>;
};

let active: ActiveRecording | undefined;

export async function startDesktopRecording(sessionId: string, streamId: string): Promise<void> {
  if (active) throw new Error('Another screen recording is already active.');
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId,
        maxFrameRate: 15,
      },
    } as MediaTrackConstraints,
  });
  try {
    const mimeType = chooseMimeType();
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 1_500_000,
    });
    let resolveCompleted!: (result: RecordingEvidence) => void;
    let rejectCompleted!: (error: Error) => void;
    const completed = new Promise<RecordingEvidence>((resolve, reject) => {
      resolveCompleted = resolve;
      rejectCompleted = reject;
    });
    const recording: ActiveRecording = {
      sessionId,
      recorder,
      stream,
      chunks: [],
      mimeType: recorder.mimeType || mimeType || 'video/webm',
      startedAt: Date.now(),
      completed,
    };
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) recording.chunks.push(event.data);
    });
    recorder.addEventListener(
      'stop',
      () => void persistRecording(recording).then(resolveCompleted).catch(rejectCompleted),
      { once: true },
    );
    recorder.addEventListener(
      'error',
      () => rejectCompleted(new Error('Chrome could not finish the screen recording.')),
      { once: true },
    );
    recorder.start(1_000);
    active = recording;
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
}

export async function stopDesktopRecording(sessionId: string): Promise<RecordingEvidence> {
  const recording = active;
  if (!recording || recording.sessionId !== sessionId) {
    throw new Error('No matching screen recording is active.');
  }
  if (recording.recorder.state !== 'inactive') recording.recorder.stop();
  try {
    return await recording.completed;
  } finally {
    active = undefined;
  }
}

export async function abortDesktopRecording(sessionId: string): Promise<void> {
  if (active?.sessionId !== sessionId) return;
  await stopDesktopRecording(sessionId).catch(() => undefined);
  await deleteRecording(sessionId).catch(() => undefined);
}

export function installDesktopRecorderBridge(): void {
  chrome.runtime.onMessage.addListener(
    (message: unknown, _sender, sendResponse: (response: unknown) => void) => {
      if (!isStopMessage(message)) return false;
      void stopDesktopRecording(message.sessionId)
        .then((recording) => sendResponse({ ok: true, recording }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : 'Chrome could not stop the screen recording.',
          }),
        );
      return true;
    },
  );
}

async function persistRecording(recording: ActiveRecording): Promise<RecordingEvidence> {
  recording.stream.getTracks().forEach((track) => track.stop());
  const blob = new Blob(recording.chunks, { type: recording.mimeType });
  if (blob.size === 0) throw new Error('The screen recording was empty.');
  await saveRecording(recording.sessionId, blob);
  return {
    blobId: recording.sessionId,
    mimeType: recording.mimeType,
    sizeBytes: blob.size,
    durationMs: Math.max(0, Date.now() - recording.startedAt),
  };
}

function chooseMimeType(): string {
  return (
    ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((candidate) =>
      MediaRecorder.isTypeSupported(candidate),
    ) ?? ''
  );
}

function isStopMessage(value: unknown): value is {
  target: 'reprokit-sidepanel';
  type: 'recording:stop';
  sessionId: string;
} {
  if (!value || typeof value !== 'object') return false;
  const message = value as { target?: unknown; type?: unknown; sessionId?: unknown };
  return (
    message.target === 'reprokit-sidepanel' &&
    message.type === 'recording:stop' &&
    typeof message.sessionId === 'string'
  );
}
