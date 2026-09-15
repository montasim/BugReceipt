import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/button';

export function formatJsonBody(value: string): string | null {
  // Some APIs prefix JSON to prevent it being executed as a script (XSSI).
  const candidate = value.trim().replace(/^\)\]\}',?\s*/, '');
  try {
    return JSON.stringify(JSON.parse(candidate), null, 2);
  } catch {
    return null;
  }
}

export function NetworkBody({
  value,
  children,
  annotated = false,
}: {
  value: string;
  children: ReactNode;
  annotated?: boolean;
}) {
  const [raw, setRaw] = useState(annotated);
  const formatted = formatJsonBody(value);
  return (
    <div className="space-y-2">
      {formatted !== null && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {raw ? 'Raw text' : 'JSON · switch to raw text to annotate'}
          </span>
          <Button size="xs" variant="ghost" type="button" onClick={() => setRaw(!raw)}>
            {raw ? 'Format JSON' : 'View raw'}
          </Button>
        </div>
      )}
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 font-mono text-xs leading-5">
        {formatted !== null && !raw ? formatted : children}
      </pre>
    </div>
  );
}
