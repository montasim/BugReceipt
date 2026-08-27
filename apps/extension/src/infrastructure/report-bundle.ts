import JSZip from 'jszip';

export interface ReportBundleVisual {
  blob: Blob;
  filename: 'recording.webm' | 'screenshot.png';
}

export async function createReportBundle(
  markdown: string,
  visual: ReportBundleVisual,
): Promise<Blob> {
  const archive = new JSZip();
  archive.file('issue.md', markdown);
  archive.file(visual.filename, visual.blob, { compression: 'STORE' });
  return archive.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/zip',
  });
}
