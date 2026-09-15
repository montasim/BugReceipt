const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
];

export type FilterResult = { value: string; redactionCount: number };

export function filterText(input: string): FilterResult {
  let value = input;
  let redactionCount = 0;
  for (const pattern of SECRET_PATTERNS) {
    value = value.replace(pattern, () => {
      redactionCount += 1;
      return '[REDACTED]';
    });
  }
  return { value: value.slice(0, 32_768), redactionCount };
}

export function filterUrl(input: string, keepQuery = false): string {
  try {
    const url = new URL(input);
    if (keepQuery) {
      const filteredQuery = new URLSearchParams();
      for (const [key, value] of url.searchParams) {
        filteredQuery.append(key, isSensitiveKey(key) ? '[REDACTED]' : filterText(value).value);
      }
      url.search = filteredQuery.toString();
    } else {
      url.search = '';
    }
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

export function filterPayload(input: string, maxLength = 32_768): FilterResult {
  let redactionCount = 0;
  let value = input;
  try {
    const prefix = input.match(/^\s*\)\]\}',?\s*/)?.[0] ?? '';
    value =
      prefix +
      JSON.stringify(
        redactStructuredValue(JSON.parse(input.slice(prefix.length)), 0, () => redactionCount++),
      );
  } catch {
    try {
      const parameters = new URLSearchParams(input);
      if ([...parameters.keys()].length > 0 && input.includes('=')) {
        for (const key of [...parameters.keys()]) {
          if (!isSensitiveKey(key)) continue;
          redactionCount += parameters.getAll(key).length;
          parameters.set(key, '[REDACTED]');
        }
        value = parameters.toString();
      }
    } catch {
      // Plain text is handled by filterText below.
    }
  }
  const filtered = filterText(value);
  return {
    value: filtered.value.slice(0, maxLength),
    redactionCount: redactionCount + filtered.redactionCount,
  };
}

function redactStructuredValue(value: unknown, depth: number, onRedaction: () => void): unknown {
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => redactStructuredValue(item, depth + 1, onRedaction));
  }
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, 100)) {
    if (isSensitiveKey(key)) {
      output[key] = '[REDACTED]';
      onRedaction();
    } else {
      output[key] = redactStructuredValue(item, depth + 1, onRedaction);
    }
  }
  return output;
}

function isSensitiveKey(key: string): boolean {
  return /authorization|auth|token|password|passwd|secret|cookie|session|api[-_]?key|csrf|xsrf/i.test(
    key,
  );
}

/** Bound and redact headers before they enter capture storage or exports. */
export function filterRequestHeaders(headers: readonly { name: string; value: string }[]) {
  let redactionCount = 0;
  const filtered = headers.slice(0, 100).map(({ name, value }) => {
    const filteredName = filterText(name);
    redactionCount += filteredName.redactionCount;
    if (isSensitiveKey(name)) {
      redactionCount++;
      return { name: filteredName.value.slice(0, 128), value: '[REDACTED]' };
    }
    const filteredValue = filterText(
      /^(referer|referrer|origin)$/i.test(name) ? filterUrl(value) : value,
    );
    redactionCount += filteredValue.redactionCount;
    return { name: filteredName.value.slice(0, 128), value: filteredValue.value.slice(0, 2_048) };
  });
  return { headers: filtered, redactionCount };
}
