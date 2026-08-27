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

export function filterUrl(input: string): string {
  try {
    const url = new URL(input);
    url.search = '';
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
    value = JSON.stringify(redactStructuredValue(JSON.parse(input), 0, () => redactionCount++));
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
  return /authorization|auth|token|password|passwd|secret|cookie|session|api[-_]?key/i.test(key);
}
