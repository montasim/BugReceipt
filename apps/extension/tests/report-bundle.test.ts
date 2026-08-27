import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { createReportBundle } from '../src/infrastructure/report-bundle';

describe('report bundle', () => {
  it('keeps the Markdown report and its recording together under linked filenames', async () => {
    const video = new Blob(['captured-video'], { type: 'video/webm' });
    const bundle = await createReportBundle(
      '# Report\n\n[Open the screen recording](./recording.webm)',
      { blob: video, filename: 'recording.webm' },
    );
    const archive = await JSZip.loadAsync(await bundle.arrayBuffer());

    expect(await archive.file('issue.md')?.async('string')).toContain('./recording.webm');
    expect(await archive.file('recording.webm')?.async('string')).toBe('captured-video');
  });

  it('uses the same stable filename for a fallback screenshot', async () => {
    const screenshot = new Blob(['captured-image'], { type: 'image/png' });
    const bundle = await createReportBundle(
      '# Report\n\n![Captured screenshot](./screenshot.png)',
      { blob: screenshot, filename: 'screenshot.png' },
    );
    const archive = await JSZip.loadAsync(await bundle.arrayBuffer());

    expect(archive.file('issue.md')).not.toBeNull();
    expect(await archive.file('screenshot.png')?.async('string')).toBe('captured-image');
  });
});
