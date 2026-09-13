import type { AnnotationDocument } from './annotation-model';

export function paintAnnotations(
  context: CanvasRenderingContext2D,
  document: AnnotationDocument,
): void {
  for (const annotation of document.items) {
    context.save();
    context.strokeStyle = annotation.color;
    context.fillStyle = annotation.color;
    if (annotation.kind === 'marker') {
      context.lineWidth = annotation.strokeWidth;
      const firstPoint = annotation.points[0];
      if (firstPoint) {
        context.globalAlpha = 0.82;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(firstPoint.x, firstPoint.y);
        for (const point of annotation.points.slice(1)) context.lineTo(point.x, point.y);
        context.stroke();
      }
    } else if (annotation.kind === 'highlight') {
      context.globalAlpha = 0.28;
      context.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
    } else if (annotation.kind === 'text') {
      paintTextNote(context, annotation);
    } else {
      context.lineWidth = annotation.strokeWidth;
      const inset = annotation.strokeWidth / 2;
      context.globalAlpha = 1;
      context.strokeRect(
        annotation.x + inset,
        annotation.y + inset,
        Math.max(0, annotation.width - annotation.strokeWidth),
        Math.max(0, annotation.height - annotation.strokeWidth),
      );
    }
    context.restore();
  }
}

function paintTextNote(
  context: CanvasRenderingContext2D,
  annotation: Extract<AnnotationDocument['items'][number], { kind: 'text' }>,
): void {
  const borderWidth = Math.max(2, annotation.fontSize * 0.07);
  const accentHeight = Math.max(7, annotation.fontSize * 0.24);
  const padding = annotation.fontSize * 0.58;
  const lineHeight = annotation.fontSize * 1.34;
  const text = annotation.text.trim();

  context.globalAlpha = 0.96;
  context.fillStyle = '#fffdf7';
  context.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
  context.globalAlpha = 1;
  context.strokeStyle = annotation.color;
  context.lineWidth = borderWidth;
  context.strokeRect(
    annotation.x + borderWidth / 2,
    annotation.y + borderWidth / 2,
    Math.max(0, annotation.width - borderWidth),
    Math.max(0, annotation.height - borderWidth),
  );
  context.fillStyle = annotation.color;
  context.fillRect(annotation.x, annotation.y, annotation.width, accentHeight);
  if (!text) return;

  context.fillStyle = '#102332';
  context.font = `600 ${annotation.fontSize}px "Bricolage Grotesque", Arial, sans-serif`;
  context.textBaseline = 'top';
  const maxWidth = Math.max(0, annotation.width - padding * 2);
  const maxLines = Math.max(
    1,
    Math.floor((annotation.height - accentHeight - padding * 1.5) / lineHeight),
  );
  const lines = wrapNoteText(context, text, maxWidth);
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    visibleLines[maxLines - 1] = truncateNoteLine(
      context,
      `${visibleLines[maxLines - 1] ?? ''}…`,
      maxWidth,
    );
  }
  visibleLines.forEach((line, index) => {
    context.fillText(
      line,
      annotation.x + padding,
      annotation.y + accentHeight + padding + index * lineHeight,
    );
  });
}

function wrapNoteText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function truncateNoteLine(
  context: CanvasRenderingContext2D,
  line: string,
  maxWidth: number,
): string {
  let output = line;
  while (output.length > 1 && context.measureText(output).width > maxWidth) {
    output = `${output.slice(0, -2).trimEnd()}…`;
  }
  return output;
}

export async function renderAnnotatedPng(
  source: Blob,
  document: AnnotationDocument,
): Promise<Blob> {
  if (document.items.length === 0) return source;
  const bitmap = await createImageBitmap(source);
  const canvas = window.document.createElement('canvas');
  canvas.width = document.imageWidth;
  canvas.height = document.imageHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Chrome could not prepare the annotation canvas.');
  }
  context.drawImage(bitmap, 0, 0, document.imageWidth, document.imageHeight);
  bitmap.close();
  paintAnnotations(context, document);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error('Chrome could not encode the annotated PNG.')),
      'image/png',
    );
  });
}
