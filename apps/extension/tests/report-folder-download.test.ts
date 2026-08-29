import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  downloadReportFolder,
  type ReportFolderFile,
} from '../src/infrastructure/report-folder-download';

const files: readonly ReportFolderFile[] = [
  {
    blob: new Blob(['# Issue'], { type: 'text/markdown' }),
    filename: 'issue.md',
  },
  {
    blob: new Blob(['png'], { type: 'image/png' }),
    filename: 'selected-frame.png',
  },
];

describe('report folder download', () => {
  const download = vi.fn();
  const revokeObjectUrl = vi.fn();

  beforeEach(() => {
    download.mockReset();
    download.mockResolvedValueOnce(101).mockResolvedValueOnce(102);
    vi.stubGlobal('chrome', {
      downloads: {
        download,
      },
    });
    vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:issue')
      .mockReturnValueOnce('blob:frame');
    revokeObjectUrl.mockReset();
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectUrl);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('downloads every report file into one folder under Downloads', async () => {
    await downloadReportFolder('BugReceipt checkout failure', files);

    expect(download).toHaveBeenNthCalledWith(1, {
      conflictAction: 'uniquify',
      filename: 'BugReceipt checkout failure/issue.md',
      saveAs: false,
      url: 'blob:issue',
    });
    expect(download).toHaveBeenNthCalledWith(2, {
      conflictAction: 'uniquify',
      filename: 'BugReceipt checkout failure/selected-frame.png',
      saveAs: false,
      url: 'blob:frame',
    });
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:issue');
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:frame');
  });

  it('sanitizes folder and file names before creating download paths', async () => {
    await downloadReportFolder('Checkout: failed/again', [
      {
        blob: new Blob(['# Issue'], { type: 'text/markdown' }),
        filename: '../issue?.md',
      },
    ]);

    expect(download).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'Checkout- failed-again/..-issue-.md',
      }),
    );
  });
});
