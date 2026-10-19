import receipt from './receipt.generated.json';

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; text: string };

// Minimal reader for the fixed issue.md shape produced by @bugreceipt/issue-export.
export function parseReceipt(markdown: string): { title: string; blocks: Block[] } {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  let title = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      title = line.slice(2);
      i += 1;
    } else if (line.startsWith('## ')) {
      blocks.push({ kind: 'heading', text: line.slice(3) });
      i += 1;
    } else if (line.startsWith('```')) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      blocks.push({ kind: 'code', text: code.join('\n') });
      i += 1;
    } else if (/^(\d+\. |- )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(\d+\. |- )/.test(lines[i])) {
        items.push(lines[i].replace(/^(\d+\. |- )/, ''));
        i += 1;
      }
      blocks.push({ kind: 'list', ordered, items });
    } else if (line.trim() === '' || line.startsWith('---') || line.startsWith('>')) {
      i += 1;
    } else {
      blocks.push({ kind: 'paragraph', text: line.replace(/^_|_$/g, '') });
      i += 1;
    }
  }
  return { title, blocks };
}

const shownSections = new Set([
  'Steps to reproduce',
  'Expected behavior',
  'Current behavior',
  'Environment',
  'Console messages',
]);

const EXCERPT_LINES = 4;

// Keep the lines a developer reads first: errors, then warnings, then the rest, in original order.
export function excerptConsole(text: string, limit = EXCERPT_LINES): string[] {
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  const rank = (line: string) => (/ ERROR /.test(line) ? 0 : / WARN /.test(line) ? 1 : 2);
  const chosen = new Set(
    lines
      .map((line, index) => ({ line, index }))
      .sort((a, b) => rank(a.line) - rank(b.line) || a.index - b.index)
      .slice(0, limit)
      .map((entry) => entry.index),
  );
  return lines.filter((_, index) => chosen.has(index));
}

export function Receipt() {
  const { title, blocks } = parseReceipt(receipt.markdown);
  const visible: Block[] = [];
  let keep = false;
  for (const block of blocks) {
    if (block.kind === 'heading') keep = shownSections.has(block.text);
    if (keep) visible.push(block);
  }
  return (
    <article className="receipt" aria-label="Example exported report">
      <header className="receipt-head">
        <span className="mono">issue.md</span>
        <span className="mono">Local export</span>
      </header>
      <h2 className="receipt-title">{title}</h2>
      {visible.map((block, index) => {
        if (block.kind === 'heading') return <h3 key={index}>{block.text}</h3>;
        if (block.kind === 'code')
          return (
            <pre key={index}>
              <code>{excerptConsole(block.text).join('\n')}</code>
            </pre>
          );
        if (block.kind === 'list')
          return block.ordered ? (
            <ol key={index}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          ) : (
            <ul key={index}>
              {block.items.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        return <p key={index}>{block.text}</p>;
      })}
      <footer className="receipt-files">
        {receipt.files.map((file) => (
          <span key={file.name} className={file.included ? 'is-included' : undefined}>
            <code>{file.name}</code>
            {file.included ? 'Included' : 'Not included'}
          </span>
        ))}
      </footer>
    </article>
  );
}
