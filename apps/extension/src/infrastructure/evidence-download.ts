import type { CaptureSession, NetworkEvent } from '@bugreceipt/capture-model';

export function serializeConsoleEvidence(session: CaptureSession): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      source: 'console',
      capture: captureMetadata(session),
      filtering: session.filtering,
      events: session.diagnostics,
    },
    null,
    2,
  );
}

export function serializeNetworkEvidenceAsHar(session: CaptureSession): string {
  return JSON.stringify(
    {
      log: {
        version: '1.2',
        creator: {
          name: 'BugReceipt',
          version: session.environment?.reproKitVersion || 'Unknown',
        },
        pages: [
          {
            startedDateTime: session.startedAt,
            id: session.id,
            title: session.page?.title || 'Captured page',
            pageTimings: {},
          },
        ],
        entries: session.network.map((event) => createHarEntry(event, session.id)),
        _bugReceipt: {
          capture: captureMetadata(session),
          filtering: session.filtering,
        },
      },
    },
    null,
    2,
  );
}

function captureMetadata(session: CaptureSession) {
  return {
    id: session.id,
    startedAt: session.startedAt,
    stoppedAt: session.stoppedAt,
    page: {
      title: session.page?.title || '',
      url: session.page?.url || session.origin,
    },
  };
}

function createHarEntry(event: NetworkEvent, pageId: string) {
  return {
    pageref: pageId,
    startedDateTime: event.occurredAt,
    time: event.durationMs,
    request: {
      method: event.method,
      url: event.url,
      httpVersion: '',
      cookies: [],
      headers: [],
      queryString: queryParameters(event.url),
      ...(event.requestBody
        ? {
            postData: {
              mimeType: 'text/plain',
              text: event.requestBody,
            },
          }
        : {}),
      headersSize: -1,
      bodySize: event.requestBody ? byteLength(event.requestBody) : 0,
    },
    response: {
      status: event.status ?? 0,
      statusText: event.error || '',
      httpVersion: '',
      cookies: [],
      headers: [],
      content: {
        size: event.responseBody ? byteLength(event.responseBody) : 0,
        mimeType: 'text/plain',
        ...(event.responseBody ? { text: event.responseBody } : {}),
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: event.responseBody ? byteLength(event.responseBody) : 0,
      _error: event.error,
    },
    cache: {},
    timings: {
      send: 0,
      wait: event.durationMs,
      receive: 0,
    },
    _resourceType: event.resourceType,
    _eventId: event.id,
  };
}

function queryParameters(url: string): Array<{ name: string; value: string }> {
  try {
    return Array.from(new URL(url).searchParams, ([name, value]) => ({ name, value }));
  } catch {
    return [];
  }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
