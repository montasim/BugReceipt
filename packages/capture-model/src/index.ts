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
export type ReproductionStep = z.infer<typeof stepSchema>;

export const reviewUpdateSchema = z.object({
  summary: z.string().trim().max(200),
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
