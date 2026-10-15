import JSZip from 'jszip';

export interface ReportBundleVisual {
  blob: Blob;
  filename:
    | 'recording.webm'
    | 'selected-frame.png'
    | `selected-frame-${string}.png`
    | 'screenshot.png'
    | 'correction.png'
    | `correction-${string}.png`;
}

export async function createReportBundle(
  markdown: string,
  visuals: readonly ReportBundleVisual[],
  mainFilename = 'issue.md',
): Promise<Blob> {
  const archive = new JSZip();
  archive.file(mainFilename, markdown);
  for (const visual of visuals) {
    archive.file(visual.filename, visual.blob, { compression: 'STORE' });
  }
  return archive.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/zip',
  });
}
