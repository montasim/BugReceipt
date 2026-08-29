import JSZip from 'jszip';

export interface ReportBundleVisual {
  blob: Blob;
  filename: 'recording.webm' | 'selected-frame.png' | 'screenshot.png';
}

export async function createReportBundle(
  markdown: string,
  visuals: readonly ReportBundleVisual[],
): Promise<Blob> {
  const archive = new JSZip();
  archive.file('issue.md', markdown);
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
