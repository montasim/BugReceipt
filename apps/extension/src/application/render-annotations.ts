import type { AnnotationDocument } from './annotation-model';

export function paintAnnotations(
  context: CanvasRenderingContext2D,
  document: AnnotationDocument,
): void {
  for (const annotation of document.items) {
    context.save();
    context.strokeStyle = annotation.color;
    context.fillStyle = annotation.color;
    context.lineWidth = annotation.strokeWidth;
    if (annotation.kind === 'marker') {
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
    } else {
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
