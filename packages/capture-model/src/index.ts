import { z } from 'zod';

export const stepSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().nonnegative(),
  text: z.string().trim().min(1).max(1_000),
});

export const diagnosticEventSchema = z.object({
  id: z.string().uuid(),
  occurredAt: z.string().datetime(),
  kind: z.enum(['console', 'uncaught-error', 'unhandled-rejection']),
  level: z.enum(['debug', 'log', 'info', 'warn', 'error']),
  message: z.string().max(32_768),
  stack: z.string().max(32_768).optional(),
});

export const networkEventSchema = z.object({
  id: z.string().uuid(),
  occurredAt: z.string().datetime(),
  method: z.string().trim().min(1).max(20),
  url: z.string().max(2_048),
  resourceType: z.string().max(50),
  status: z.number().int().min(0).max(599).optional(),
  durationMs: z.number().nonnegative().max(3_600_000),
  requestBody: z.string().max(16_384).optional(),
  responseBody: z.string().max(32_768).optional(),
  error: z.string().max(2_000).optional(),
});

export const evidenceTextAnnotationSchema = z
  .object({
    id: z.string().uuid(),
    source: z.enum(['console', 'network']),
    eventId: z.string().uuid(),
    field: z.enum([
      'message',
      'method',
      'status',
      'duration',
      'url',
      'requestBody',
      'responseBody',
      'error',
    ]),
    start: z.number().int().nonnegative().max(32_768),
    end: z.number().int().positive().max(32_768),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
  })
  .refine((annotation) => annotation.end > annotation.start, {
    message: 'A text annotation must include at least one character.',
    path: ['end'],
  });

export const selectedFrameSchema = z.object({
  blobId: z.string().uuid(),
  mimeType: z.literal('image/png'),
  sizeBytes: z.number().int().nonnegative(),
  videoTimeMs: z.number().int().nonnegative().max(3_600_000),
  width: z.number().int().positive().max(16_384),
  height: z.number().int().positive().max(16_384),
});

export const MAX_SELECTED_FRAMES = 20;

export const captureSessionSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  status: z.enum(['recording', 'ready-for-review']),
  tabId: z.number().int().nonnegative(),
  windowId: z.number().int().nonnegative(),
  origin: z.string().url(),
  startedAt: z.string().datetime(),
  stoppedAt: z.string().datetime().optional(),
  endReason: z.enum(['completed', 'origin-changed', 'tab-closed']).optional(),
  summary: z.string().max(200),
  description: z.string().max(4_000).optional(),
  expectedBehavior: z.string().max(4_000),
  actualBehavior: z.string().max(4_000),
  steps: z.array(stepSchema).max(50),
  diagnostics: z.array(diagnosticEventSchema).max(500),
  network: z.array(networkEventSchema).max(500).default([]),
  page: z
    .object({
      url: z.string().max(2_048),
      title: z.string().max(500),
      capturedAt: z.string().datetime(),
      recording: z
        .object({
          blobId: z.string().uuid(),
          mimeType: z.string().max(100),
          sizeBytes: z.number().int().nonnegative(),
          durationMs: z.number().int().nonnegative(),
        })
        .optional(),
      recordingError: z.string().max(500).optional(),
      selectedFrames: z.array(selectedFrameSchema).max(MAX_SELECTED_FRAMES).optional(),
      /** @deprecated Retained so captures saved before multi-frame support remain reviewable. */
      selectedFrame: selectedFrameSchema.optional(),
      screenshotBlobId: z.string().uuid().optional(),
      screenshotError: z.string().max(500).optional(),
    })
    .optional(),
  environment: z
    .object({
      userAgent: z.string().max(1_000),
      platform: z.string().max(200),
      reproKitVersion: z.string().max(50),
    })
    .optional(),
  filtering: z.object({
    redactionCount: z.number().int().nonnegative(),
    droppedEventCount: z.number().int().nonnegative(),
  }),
});

export type CaptureSession = z.infer<typeof captureSessionSchema>;
export type CaptureEndReason = NonNullable<CaptureSession['endReason']>;
export type DiagnosticEvent = z.infer<typeof diagnosticEventSchema>;
export type NetworkEvent = z.infer<typeof networkEventSchema>;
export type EvidenceTextAnnotation = z.infer<typeof evidenceTextAnnotationSchema>;
export type ReproductionStep = z.infer<typeof stepSchema>;
export type SelectedFrame = z.infer<typeof selectedFrameSchema>;

export function getSelectedFrames(page: CaptureSession['page']): SelectedFrame[] {
  if (!page) return [];
  const frames = (page.selectedFrames ?? []).slice(0, MAX_SELECTED_FRAMES);
  if (!page.selectedFrame || frames.some((frame) => frame.blobId === page.selectedFrame?.blobId)) {
    return frames;
  }
  return [page.selectedFrame, ...frames].slice(0, MAX_SELECTED_FRAMES);
}

export function getSelectedFrameFilename(
  index: number,
  total: number,
): 'selected-frame.png' | `selected-frame-${string}.png` {
  return total <= 1
    ? 'selected-frame.png'
    : `selected-frame-${String(index + 1).padStart(2, '0')}.png`;
}

export interface CaptureEnvironmentDetails {
  browser: string;
  operatingSystem: string;
  platform: string;
  userAgent: string;
}

export function describeCaptureEnvironment(
  environment: CaptureSession['environment'],
): CaptureEnvironmentDetails {
  const userAgent = environment?.userAgent || '';
  const platform = environment?.platform || '';
  return {
    browser: describeBrowser(userAgent),
    operatingSystem: describeOperatingSystem(userAgent, platform),
    platform: platform || 'Unknown',
    userAgent: userAgent || 'Unknown',
  };
}

function describeBrowser(userAgent: string): string {
  const candidates: Array<[name: string, pattern: RegExp]> = [
    ['Microsoft Edge', /\bEdg(?:A|iOS)?\/([\d.]+)/],
    ['Opera', /\b(?:OPR|Opera)\/([\d.]+)/],
    ['Samsung Internet', /\bSamsungBrowser\/([\d.]+)/],
    ['Firefox', /\b(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Chrome', /\b(?:Chrome|CriOS)\/([\d.]+)/],
    ['Chromium', /\bChromium\/([\d.]+)/],
    ['Safari', /\bVersion\/([\d.]+).*\bSafari\//],
  ];

  for (const [name, pattern] of candidates) {
    const match = userAgent.match(pattern);
    if (match?.[1]) return `${name} ${match[1]}`;
  }
  return 'Unknown';
}

function describeOperatingSystem(userAgent: string, platform: string): string {
  const windows = userAgent.match(/\bWindows NT ([\d.]+)/);
  if (windows?.[1]) {
    const name =
      {
        '10.0': 'Windows 10 or 11',
        '6.3': 'Windows 8.1',
        '6.2': 'Windows 8',
        '6.1': 'Windows 7',
      }[windows[1]] ?? `Windows NT ${windows[1]}`;
    return name;
  }

  const android = userAgent.match(/\bAndroid ([\d.]+)/);
  if (android?.[1]) return `Android ${android[1]}`;

  const chromeOs = userAgent.match(/\bCrOS [^ )]+ ([\d.]+)/);
  if (chromeOs?.[1]) return `ChromeOS ${chromeOs[1]}`;

  const ios = userAgent.match(/(?:CPU (?:iPhone )?OS|iPhone OS) ([\d_]+)/);
  if (ios?.[1]) return `iOS ${ios[1].replaceAll('_', '.')}`;

  const macOs = userAgent.match(/\bMac OS X ([\d_]+)/);
  if (macOs?.[1]) return `macOS ${macOs[1].replaceAll('_', '.')}`;

  if (/\bLinux\b/.test(userAgent)) return 'Linux';
  if (/^Win/i.test(platform)) return 'Windows';
  if (/^(?:Mac|iPhone|iPad|iPod)/i.test(platform)) return 'macOS or iOS';
  if (/Linux/i.test(platform)) return 'Linux';
  return 'Unknown';
}

export const reviewUpdateSchema = z.object({
  summary: z.string().trim().max(200),
  description: z.string().trim().max(4_000).optional(),
  expectedBehavior: z.string().trim().max(4_000),
  actualBehavior: z.string().trim().max(4_000),
  steps: z.array(stepSchema).max(50),
});

export type ReviewUpdate = z.infer<typeof reviewUpdateSchema>;

export const runtimeRequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('session:get') }),
  z.object({
    type: z.literal('session:start'),
    tabId: z.number().int().nonnegative(),
    sessionId: z.string().uuid(),
    recordingError: z.string().max(500).optional(),
  }),
  z.object({ type: z.literal('session:add-step'), text: z.string().trim().min(1).max(1_000) }),
  z.object({ type: z.literal('session:update-review') }).extend(reviewUpdateSchema.shape),
  z.object({ type: z.literal('session:remove-diagnostic'), id: z.string().uuid() }),
  z.object({ type: z.literal('session:remove-network'), id: z.string().uuid() }),
  z.object({ type: z.literal('session:add-selected-frame'), frame: selectedFrameSchema }),
  /** @deprecated Retained for review pages opened before multi-frame support. */
  z.object({ type: z.literal('session:set-selected-frame'), frame: selectedFrameSchema }),
  z.object({
    type: z.literal('session:remove-selected-frame'),
    blobId: z.string().uuid().optional(),
  }),
  z.object({ type: z.literal('session:remove-recording') }),
  z.object({ type: z.literal('session:remove-screenshot') }),
  z.object({ type: z.literal('session:stop') }),
  z.object({ type: z.literal('session:discard') }),
  z.object({
    type: z.literal('diagnostic:append'),
    sessionId: z.string().uuid(),
    event: z.object({
      occurredAt: z.string().datetime(),
      kind: z.enum(['console', 'uncaught-error', 'unhandled-rejection']),
      level: z.enum(['debug', 'log', 'info', 'warn', 'error']),
      message: z.string().max(32_768),
      stack: z.string().max(32_768).optional(),
    }),
  }),
  z.object({
    type: z.literal('network:append'),
    sessionId: z.string().uuid(),
    event: networkEventSchema.omit({ id: true }),
  }),
]);

export type RuntimeRequest = z.infer<typeof runtimeRequestSchema>;

export const runtimeResponseSchema = z.union([
  z.object({ ok: z.literal(true), session: captureSessionSchema.nullable() }),
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), code: z.string(), message: z.string() }),
]);

export type RuntimeResponse = z.infer<typeof runtimeResponseSchema>;
