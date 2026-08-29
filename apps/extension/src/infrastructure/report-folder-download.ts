export interface ReportFolderFile {
  blob: Blob;
  filename: string;
}

export async function downloadReportFolder(
  folderName: string,
  files: readonly ReportFolderFile[],
): Promise<void> {
  if (!files.length) throw new Error('The report has no files to save.');
  const safeFolderName = sanitizePathSegment(folderName);
  if (!safeFolderName) throw new Error('The report folder has an invalid name.');
  if (!globalThis.chrome?.downloads?.download) {
    throw new Error('Chrome could not start the folder download. Use Download ZIP instead.');
  }

  for (const file of files) {
    const filename = sanitizePathSegment(file.filename);
    if (!filename) throw new Error('A report file has an invalid filename.');
    const url = URL.createObjectURL(file.blob);
    try {
      await chrome.downloads.download({
        conflictAction: 'uniquify',
        filename: `${safeFolderName}/${filename}`,
        saveAs: false,
        url,
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function sanitizePathSegment(value: string): string {
  return value
    .replaceAll(/[\\/:*?"<>|]/g, '-')
    .replaceAll(/\s+/g, ' ')
    .trim();
}
