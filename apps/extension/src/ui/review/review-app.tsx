import { describeCaptureEnvironment, type CaptureSession } from '@bugreceipt/capture-model';
import { getIssueValidationErrors, renderGitHubIssue } from '@bugreceipt/issue-export';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  commitAnnotation,
  createAnnotationDocument,
  createAnnotationHistory,
  isAnnotationDocument,
  redoAnnotation,
  undoAnnotation,
  type Annotation,
  type AnnotationColor,
  type AnnotationHistory,
  type AnnotationTool,
} from '../../application/annotation-model';
import { sendRuntimeMessage } from '../../application/protocol';
import { renderAnnotatedPng } from '../../application/render-annotations';
import {
  commitTextAnnotation,
  createTextAnnotationDocument,
  createTextAnnotationHistory,
  isTextAnnotationDocument,
  redoTextAnnotation,
  removeTextAnnotationsForEvent,
  undoTextAnnotation,
  type TextAnnotation,
  type TextAnnotationHistory,
} from '../../application/text-annotation-model';
import {
  getAnnotationDocument,
  saveAnnotationDocument,
} from '../../infrastructure/annotation-store';
import { createReportBundle, type ReportBundleVisual } from '../../infrastructure/report-bundle';
import { readRecording } from '../../infrastructure/recording-store';
import { downloadReportFolder } from '../../infrastructure/report-folder-download';
import { isReportEmailConfigured, sendReportEmail } from '../../infrastructure/report-email';
import {
  deleteScreenshot,
  readScreenshot,
  saveScreenshotBlob,
} from '../../infrastructure/screenshot-store';
import { captureVideoFrame } from '../../infrastructure/video-frame';
import {
  deleteTextAnnotationDocument,
  getTextAnnotationDocument,
  saveTextAnnotationDocument,
} from '../../infrastructure/text-annotation-store';
import { Brand } from '../brand';
import { SupportLink } from '../support-link';
import { AnnotatedEvidenceText } from './annotated-evidence-text';
import { AnnotateIcon } from './annotation-icons';
import { AnnotationOverlay } from './annotation-overlay';
import { AnnotationToolbar } from './annotation-toolbar';
import { TextAnnotationToolbar } from './text-annotation-toolbar';

type ArtifactState = 'loading' | 'ready' | 'missing' | 'failed';
type EvidenceView = 'visual' | 'console' | 'network';

export function ReviewApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const downloadTriggerRef = useRef<HTMLButtonElement>(null);
  const annotationBaseline = useRef<AnnotationHistory | null>(null);
  const textAnnotationBaseline = useRef<TextAnnotationHistory | null>(null);
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingState, setRecordingState] = useState<ArtifactState>('loading');
  const [selectedFrameUrl, setSelectedFrameUrl] = useState('');
  const [selectedFrameBlob, setSelectedFrameBlob] = useState<Blob | null>(null);
  const [selectedFrameState, setSelectedFrameState] = useState<ArtifactState>('loading');
  const [annotations, setAnnotations] = useState<AnnotationHistory>(() =>
    createAnnotationHistory(createAnnotationDocument(1, 1)),
  );
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [savingAnnotations, setSavingAnnotations] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('border');
  const [annotationColor, setAnnotationColor] = useState<AnnotationColor>('#ff5c3a');
  const [annotationWidth, setAnnotationWidth] = useState(6);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotationHistory>(() =>
    createTextAnnotationHistory(createTextAnnotationDocument('')),
  );
  const [isAnnotatingText, setIsAnnotatingText] = useState(false);
  const [savingTextAnnotations, setSavingTextAnnotations] = useState(false);
  const [textAnnotationColor, setTextAnnotationColor] = useState<AnnotationColor>('#e2a90a');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotState, setScreenshotState] = useState<ArtifactState>('loading');
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoTime, setVideoTime] = useState(0);
  const [capturingFrame, setCapturingFrame] = useState(false);
  const [stepsText, setStepsText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [emailed, setEmailed] = useState(false);
  const [evidenceView, setEvidenceView] = useState<EvidenceView>('visual');
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const exportBase = useMemo(
    () => (session ? createExportBase(session) : 'bugreceipt-report'),
    [session],
  );
  const validationErrors = useMemo(
    () => (session ? getIssueValidationErrors(session) : []),
    [session],
  );
  const exportReady = validationErrors.length === 0;
  const emailConfigured = isReportEmailConfigured();
  const annotationDocument = annotations.present;
  const annotationCount = annotationDocument.items.length;
  const textAnnotationDocument = textAnnotations.present;
  const textAnnotationCount = textAnnotationDocument.items.length;
  const consoleTextAnnotationCount = textAnnotationDocument.items.filter(
    (annotation) => annotation.source === 'console',
  ).length;
  const networkTextAnnotationCount = textAnnotationDocument.items.filter(
    (annotation) => annotation.source === 'network',
  ).length;
  const reviewActionsDisabled =
    busy || isAnnotating || savingAnnotations || isAnnotatingText || savingTextAnnotations;

  useEffect(() => {
    const objectUrls: string[] = [];
    void sendRuntimeMessage({ type: 'session:get' })
      .then(async (response) => {
        if (!response.ok) {
          setError(response.message);
          return;
        }
        if (!('session' in response) || response.session?.status !== 'ready-for-review') return;
        setSession(response.session);
        setStepsText(response.session.steps.map((step) => step.text).join('\n'));
        const storedTextAnnotations = await getTextAnnotationDocument(response.session.id).catch(
          () => null,
        );
        const textDocument = isTextAnnotationDocument(storedTextAnnotations, response.session.id)
          ? storedTextAnnotations
          : createTextAnnotationDocument(response.session.id);
        setTextAnnotations(createTextAnnotationHistory(textDocument));
        const recordingId = response.session.page?.recording?.blobId;
        if (recordingId) {
          const recording = await readRecording(recordingId);
          if (recording) {
            const url = URL.createObjectURL(recording);
            objectUrls.push(url);
            setRecordingUrl(url);
            setRecordingState('ready');
          } else {
            setRecordingState('failed');
          }
        } else {
          setRecordingState(response.session.page?.recordingError ? 'failed' : 'missing');
        }
        const selectedFrameId = response.session.page?.selectedFrame?.blobId;
        if (selectedFrameId) {
          const selectedFrame = await readScreenshot(selectedFrameId);
          if (selectedFrame) {
            const frame = response.session.page?.selectedFrame;
            const storedAnnotations = await getAnnotationDocument(selectedFrameId).catch(
              () => null,
            );
            const document =
              frame && isAnnotationDocument(storedAnnotations, frame.width, frame.height)
                ? storedAnnotations
                : createAnnotationDocument(frame?.width ?? 1, frame?.height ?? 1);
            setAnnotations(createAnnotationHistory(document));
            setSelectedFrameBlob(selectedFrame);
            setSelectedFrameUrl(URL.createObjectURL(selectedFrame));
            setSelectedFrameState('ready');
          } else {
            setSelectedFrameState('failed');
          }
        } else {
          setSelectedFrameState('missing');
        }
        const blobId = response.session.page?.screenshotBlobId;
        if (!blobId) {
          setScreenshotState(response.session.page?.screenshotError ? 'failed' : 'missing');
          return;
        }
        const blob = await readScreenshot(blobId);
        if (!blob) {
          setScreenshotState('failed');
          return;
        }
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        setScreenshotUrl(url);
        setScreenshotState('ready');
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Could not load this capture.');
        setRecordingState('failed');
        setScreenshotState('failed');
      });
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(
    () => () => {
      if (selectedFrameUrl) URL.revokeObjectURL(selectedFrameUrl);
    },
    [selectedFrameUrl],
  );

  useEffect(() => {
    if (!isAnnotating) return;
    function handleKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches('input, select, textarea');
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) setAnnotations((history) => redoAnnotation(history));
        else setAnnotations((history) => undoAnnotation(history));
        setSelectedAnnotationId(null);
        return;
      }
      if (!isTyping && (event.key === 'Delete' || event.key === 'Backspace')) {
        if (!selectedAnnotationId) return;
        event.preventDefault();
        setAnnotations((history) =>
          commitAnnotation(history, { type: 'remove', id: selectedAnnotationId }),
        );
        setSelectedAnnotationId(null);
      }
      if (!isTyping && event.key === 'Escape') {
        setSelectedAnnotationId(null);
        setAnnotationTool('select');
      }
    }
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isAnnotating, selectedAnnotationId]);

  useEffect(() => {
    if (!downloadMenuOpen) return;
    const menuItems = Array.from(
      downloadMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    menuItems[0]?.focus();
    function handlePointerDown(event: PointerEvent) {
      if (!downloadMenuRef.current?.contains(event.target as Node)) setDownloadMenuOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDownloadMenuOpen(false);
        downloadTriggerRef.current?.focus();
        return;
      }
      if (event.key === 'Tab') {
        setDownloadMenuOpen(false);
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement);
      const nextIndex =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? menuItems.length - 1
            : event.key === 'ArrowDown'
              ? (currentIndex + 1) % menuItems.length
              : (currentIndex - 1 + menuItems.length) % menuItems.length;
      menuItems[nextIndex]?.focus();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [downloadMenuOpen]);

  function updateSession(update: (current: CaptureSession) => CaptureSession) {
    setSession((current) => (current ? update(current) : current));
    setDirty(true);
    setNotice('Changes will be applied automatically before export');
  }

  async function persistReview(draft: CaptureSession): Promise<CaptureSession | null> {
    const response = await sendRuntimeMessage({
      type: 'session:update-review',
      summary: draft.summary,
      expectedBehavior: draft.expectedBehavior,
      actualBehavior: draft.actualBehavior,
      steps: draft.steps,
    });
    if (!response.ok) {
      setError(response.message);
      return null;
    }
    if (!('session' in response) || !response.session) return null;
    setSession(response.session);
    setDirty(false);
    return response.session;
  }

  function revealFirstMissingField() {
    if (!session) return;
    const blankStepIndex = session.steps.findIndex((step) => !step.text.trim());
    const target = !session.summary.trim()
      ? document.getElementById('issue-summary')
      : blankStepIndex >= 0
        ? document.getElementById('steps-to-reproduce')
        : null;
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
    setNotice('Complete the required fields shown in the report before exporting');
  }

  async function withPreparedExport(
    action: (saved: CaptureSession) => void | Promise<void>,
  ): Promise<void> {
    if (!session || busy) return;
    if (!exportReady) {
      revealFirstMissingField();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = dirty ? await persistReview(session) : session;
      if (saved) await action(saved);
    } finally {
      setBusy(false);
    }
  }

  async function removeDiagnostic(id: string) {
    if (busy || !session) return;
    setBusy(true);
    setError('');
    if (dirty && !(await persistReview(session))) {
      setBusy(false);
      return;
    }
    const response = await sendRuntimeMessage({ type: 'session:remove-diagnostic', id });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if ('session' in response && response.session) setSession(response.session);
    await removeStoredTextAnnotationsForEvent(id).catch(() =>
      setError(
        'The console entry was removed, but its saved text annotations could not be cleaned up.',
      ),
    );
    setNotice('Console entry removed');
  }

  async function removeNetworkEvent(id: string) {
    if (busy || !session) return;
    setBusy(true);
    setError('');
    if (dirty && !(await persistReview(session))) {
      setBusy(false);
      return;
    }
    const response = await sendRuntimeMessage({ type: 'session:remove-network', id });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if ('session' in response && response.session) setSession(response.session);
    await removeStoredTextAnnotationsForEvent(id).catch(() =>
      setError(
        'The network entry was removed, but its saved text annotations could not be cleaned up.',
      ),
    );
    setNotice('Network entry removed');
  }

  async function removeScreenshot() {
    if (busy || !session) return;
    setBusy(true);
    setError('');
    if (dirty && !(await persistReview(session))) {
      setBusy(false);
      return;
    }
    const response = await sendRuntimeMessage({ type: 'session:remove-screenshot' });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if ('session' in response && response.session) setSession(response.session);
    if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
    setScreenshotUrl('');
    setScreenshotState('missing');
    setNotice('Screenshot removed');
  }

  async function saveCurrentFrame() {
    const video = videoRef.current;
    if (!video || busy || capturingFrame || !session) return;
    setBusy(true);
    setCapturingFrame(true);
    setError('');
    let savedBlobId = '';
    try {
      const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : videoTime;
      const captured = await captureVideoFrame(video, currentTime, videoDuration);
      savedBlobId = await saveScreenshotBlob(captured.blob);
      const response = await sendRuntimeMessage({
        type: 'session:set-selected-frame',
        frame: {
          blobId: savedBlobId,
          mimeType: 'image/png',
          sizeBytes: captured.blob.size,
          videoTimeMs: captured.videoTimeMs,
          width: captured.width,
          height: captured.height,
        },
      });
      if (!response.ok) {
        await deleteScreenshot(savedBlobId).catch(() => undefined);
        setError(response.message);
        return;
      }
      if ('session' in response && response.session) setSession(response.session);
      setVideoTime(captured.videoTimeMs / 1_000);
      setSelectedFrameBlob(captured.blob);
      setSelectedFrameUrl(URL.createObjectURL(captured.blob));
      setSelectedFrameState('ready');
      setAnnotations(
        createAnnotationHistory(createAnnotationDocument(captured.width, captured.height)),
      );
      annotationBaseline.current = null;
      setSelectedAnnotationId(null);
      setIsAnnotating(false);
      setNotice(`Frame at ${formatVideoTime(captured.videoTimeMs)} saved locally`);
    } catch (reason) {
      if (savedBlobId) await deleteScreenshot(savedBlobId).catch(() => undefined);
      setError(
        reason instanceof Error
          ? reason.message
          : 'Chrome could not capture that video frame. Move the playhead and try again.',
      );
    } finally {
      setBusy(false);
      setCapturingFrame(false);
    }
  }

  async function removeSelectedFrame() {
    if (busy || !session) return;
    setBusy(true);
    setError('');
    const response = await sendRuntimeMessage({ type: 'session:remove-selected-frame' });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if ('session' in response && response.session) setSession(response.session);
    setSelectedFrameUrl('');
    setSelectedFrameBlob(null);
    setSelectedFrameState('missing');
    setAnnotations(createAnnotationHistory(createAnnotationDocument(1, 1)));
    annotationBaseline.current = null;
    setSelectedAnnotationId(null);
    setIsAnnotating(false);
    setNotice('Selected video frame removed');
  }

  function beginAnnotating() {
    if (!selectedFrameBlob || selectedFrameState !== 'ready') return;
    annotationBaseline.current = annotations;
    setAnnotationTool('border');
    setSelectedAnnotationId(null);
    setIsAnnotating(true);
    setNotice('Drag around the important area to add a border');
  }

  function chooseAnnotationTool(tool: AnnotationTool) {
    setAnnotationTool(tool);
    if (tool !== 'select') setSelectedAnnotationId(null);
    const instructions: Record<AnnotationTool, string> = {
      select: 'Select an annotation to move, resize, or delete it',
      marker: 'Draw directly on the frame with the marker',
      highlight: 'Drag over an area to add a translucent highlight',
      border: 'Drag around an area to add a border',
    };
    setNotice(instructions[tool]);
  }

  function cancelAnnotating() {
    if (annotationBaseline.current) setAnnotations(annotationBaseline.current);
    annotationBaseline.current = null;
    setSelectedAnnotationId(null);
    setIsAnnotating(false);
    setNotice('Annotation changes cancelled');
  }

  async function finishAnnotating() {
    const frameId = session?.page?.selectedFrame?.blobId;
    if (!frameId || savingAnnotations) return;
    setSavingAnnotations(true);
    setError('');
    try {
      await saveAnnotationDocument(frameId, annotationDocument);
      annotationBaseline.current = null;
      setSelectedAnnotationId(null);
      setIsAnnotating(false);
      setNotice(
        annotationCount === 0
          ? 'Annotations cleared from the selected frame'
          : `${annotationCount} ${annotationCount === 1 ? 'annotation' : 'annotations'} saved locally`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'BugReceipt could not save the frame annotations.',
      );
    } finally {
      setSavingAnnotations(false);
    }
  }

  function addAnnotation(annotation: Annotation) {
    setAnnotations((history) => commitAnnotation(history, { type: 'add', annotation }));
    setSelectedAnnotationId(annotation.id);
  }

  function replaceAnnotation(annotation: Annotation) {
    setAnnotations((history) => commitAnnotation(history, { type: 'replace', annotation }));
  }

  function beginTextAnnotating(source: 'console' | 'network') {
    const hasEvidence =
      source === 'console' ? session?.diagnostics.length : session?.network.length;
    if (!hasEvidence) return;
    textAnnotationBaseline.current = textAnnotations;
    setEvidenceView(source);
    setIsAnnotatingText(true);
    setError('');
    setNotice('Select text in an evidence field to highlight it');
  }

  function cancelTextAnnotating() {
    if (textAnnotationBaseline.current) setTextAnnotations(textAnnotationBaseline.current);
    textAnnotationBaseline.current = null;
    setIsAnnotatingText(false);
    window.getSelection()?.removeAllRanges();
    setNotice('Text annotation changes cancelled');
  }

  async function finishTextAnnotating() {
    if (!session || savingTextAnnotations) return;
    setSavingTextAnnotations(true);
    setError('');
    try {
      await saveTextAnnotationDocument(session.id, textAnnotationDocument);
      textAnnotationBaseline.current = null;
      setIsAnnotatingText(false);
      window.getSelection()?.removeAllRanges();
      setNotice(
        textAnnotationCount === 0
          ? 'Text annotations cleared'
          : `${textAnnotationCount} text ${textAnnotationCount === 1 ? 'annotation' : 'annotations'} saved locally`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'BugReceipt could not save the text annotations.',
      );
    } finally {
      setSavingTextAnnotations(false);
    }
  }

  function addTextAnnotation(
    selection: Pick<TextAnnotation, 'source' | 'eventId' | 'field' | 'start' | 'end'>,
  ) {
    if (textAnnotationCount >= 500) {
      setError('This capture already has the maximum of 500 text annotations.');
      return;
    }
    const annotation: TextAnnotation = {
      ...selection,
      id: crypto.randomUUID(),
      color: textAnnotationColor,
    };
    setTextAnnotations((history) => commitTextAnnotation(history, { type: 'add', annotation }));
    setNotice('Text highlighted');
  }

  function removeTextAnnotation(id: string) {
    setTextAnnotations((history) => commitTextAnnotation(history, { type: 'remove', id }));
    setNotice('Text highlight removed');
  }

  async function removeStoredTextAnnotationsForEvent(eventId: string) {
    if (!session) return;
    const nextDocument = removeTextAnnotationsForEvent(textAnnotationDocument, eventId);
    if (nextDocument === textAnnotationDocument) return;
    setTextAnnotations(createTextAnnotationHistory(nextDocument));
    await saveTextAnnotationDocument(session.id, nextDocument);
  }

  function renderTextAnnotationToolbar() {
    return (
      <TextAnnotationToolbar
        color={textAnnotationColor}
        count={textAnnotationCount}
        canUndo={textAnnotations.past.length > 0}
        canRedo={textAnnotations.future.length > 0}
        saving={savingTextAnnotations}
        onColorChange={setTextAnnotationColor}
        onUndo={() => setTextAnnotations((history) => undoTextAnnotation(history))}
        onRedo={() => setTextAnnotations((history) => redoTextAnnotation(history))}
        onClear={() =>
          setTextAnnotations((history) => commitTextAnnotation(history, { type: 'clear' }))
        }
        onCancel={cancelTextAnnotating}
        onDone={() => void finishTextAnnotating()}
      />
    );
  }

  async function prepareSelectedFramePng(): Promise<Blob | null> {
    if (!selectedFrameBlob) return null;
    return renderAnnotatedPng(selectedFrameBlob, annotationDocument);
  }

  async function downloadSelectedFrame() {
    if (!selectedFrameBlob || busy) return;
    setBusy(true);
    setError('');
    try {
      const output = await prepareSelectedFramePng();
      if (!output) return;
      downloadBlob(
        output,
        `${exportBase}-selected-frame${annotationCount > 0 ? '-annotated' : ''}.png`,
      );
      setNotice(
        annotationCount > 0 ? 'Annotated frame download started' : 'Frame download started',
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Chrome could not prepare the selected frame PNG.',
      );
    } finally {
      setBusy(false);
    }
  }

  function syncVideoState(video: HTMLVideoElement) {
    const recordedDuration = (session?.page?.recording?.durationMs ?? 0) / 1_000;
    const previewDuration =
      Number.isFinite(video.duration) && video.duration > 0 ? video.duration : recordedDuration;
    setVideoDuration(previewDuration);
    setVideoTime(Number.isFinite(video.currentTime) ? video.currentTime : 0);
  }

  async function removeRecording() {
    if (busy || !session) return;
    setBusy(true);
    setError('');
    if (dirty && !(await persistReview(session))) {
      setBusy(false);
      return;
    }
    const response = await sendRuntimeMessage({ type: 'session:remove-recording' });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if ('session' in response && response.session) setSession(response.session);
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingUrl('');
    setRecordingState('missing');
    setNotice('Screen recording removed');
  }

  async function downloadReport(format: 'folder' | 'zip') {
    setDownloadMenuOpen(false);
    await withPreparedExport(async (saved) => {
      try {
        const savedMarkdown = renderGitHubIssue(saved, textAnnotationDocument.items);
        const savedExportBase = createExportBase(saved);
        const visuals = await readExportVisuals(
          recordingUrl,
          selectedFrameBlob,
          annotationDocument,
          screenshotUrl,
        );
        if (format === 'folder') {
          await downloadReportFolder(savedExportBase, [
            {
              blob: new Blob([savedMarkdown], { type: 'text/markdown;charset=utf-8' }),
              filename: 'issue.md',
            },
            ...visuals,
          ]);
          setNotice(`Downloaded all report files to Downloads/${savedExportBase}`);
          return;
        }
        const bundle = await createReportBundle(savedMarkdown, visuals);
        downloadBlob(bundle, `${savedExportBase}.zip`);
        setNotice(`Downloaded ${savedExportBase}.zip with the report and visual evidence`);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Chrome could not prepare the report download.',
        );
      }
    });
  }

  async function copyMarkdown() {
    await withPreparedExport(async (saved) => {
      try {
        await navigator.clipboard.writeText(renderGitHubIssue(saved, textAnnotationDocument.items));
        setNotice('Issue Markdown copied');
      } catch {
        setError('Clipboard access failed. Download the Markdown report instead.');
      }
    });
  }

  async function emailReport() {
    await withPreparedExport(async (saved) => {
      let annotatedFrameUrl = '';
      try {
        if (selectedFrameBlob && annotationCount > 0) {
          const output = await prepareSelectedFramePng();
          if (output) annotatedFrameUrl = URL.createObjectURL(output);
        }
        const visualUrl = annotatedFrameUrl || selectedFrameUrl || recordingUrl || screenshotUrl;
        const result = await sendReportEmail({
          sessionId: saved.id,
          subject: saved.summary,
          markdown: renderGitHubIssue(saved, textAnnotationDocument.items),
          ...(visualUrl
            ? {
                visualUrl,
                visualFilename: selectedFrameUrl
                  ? ('selected-frame.png' as const)
                  : recordingUrl
                    ? ('recording.webm' as const)
                    : ('screenshot.png' as const),
              }
            : {}),
        });
        setEmailed(true);
        setNotice(
          result.visualAttached
            ? 'Report and visual evidence emailed'
            : 'Report emailed; the visual evidence was too large and remains local',
        );
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'The report email could not be sent.');
      } finally {
        if (annotatedFrameUrl) URL.revokeObjectURL(annotatedFrameUrl);
      }
    });
  }

  async function discard() {
    const response = await sendRuntimeMessage({ type: 'session:discard' });
    if (response.ok) {
      if (session) await deleteTextAnnotationDocument(session.id).catch(() => undefined);
      setSession(null);
    }
    if (!response.ok) setError(response.message);
  }

  if (!session) {
    return (
      <main className="review-empty">
        <Brand />
        <p className="eyebrow">No reviewable capture</p>
        <h1>{error || 'Start a capture from the BugReceipt toolbar button.'}</h1>
      </main>
    );
  }

  const environment = describeCaptureEnvironment(session.environment);

  return (
    <main
      className={`review-shell${isAnnotating ? ' is-annotating' : ''}${isAnnotatingText ? ' is-annotating-text' : ''}`}
    >
      <header className="review-header">
        <div className="review-header-inner">
          <Brand />
          <div className="review-header-context" aria-label="Review workspace">
            <span>Evidence review</span>
            <strong>{session.page?.title || 'Captured page'}</strong>
          </div>
          <div className="review-header-meta">
            <div className="review-status">
              <span /> {emailed ? 'Report sent by email' : 'Nothing has been uploaded'}
            </div>
            <SupportLink />
          </div>
        </div>
      </header>

      <section className="review-commandbar" aria-labelledby="review-title">
        <div className="review-command-copy">
          <div className="review-command-title">
            <h1 id="review-title">Review capture</h1>
          </div>
          <p>
            Verify the report, preserve the clearest visual evidence, then export only what you
            intend to share.
          </p>
        </div>
        <div className="review-actions">
          <button
            className="button quiet"
            type="button"
            onClick={() => void copyMarkdown()}
            disabled={reviewActionsDisabled}
            aria-describedby={!exportReady ? 'report-check-heading' : undefined}
          >
            Copy Markdown
          </button>
          <button
            className="button quiet"
            type="button"
            onClick={() => void emailReport()}
            disabled={reviewActionsDisabled || emailed || !emailConfigured}
            aria-describedby={!exportReady ? 'report-check-heading' : undefined}
            title={
              emailConfigured
                ? undefined
                : 'Set VITE_BUGRECEIPT_REPORT_ENDPOINT when building the extension.'
            }
          >
            {emailed ? 'Report emailed' : emailConfigured ? 'Share by email' : 'Email unavailable'}
          </button>
          <div className="review-download-control" ref={downloadMenuRef}>
            <button
              ref={downloadTriggerRef}
              className="button primary review-download-trigger"
              type="button"
              onClick={() => setDownloadMenuOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                event.preventDefault();
                setDownloadMenuOpen(true);
              }}
              disabled={reviewActionsDisabled}
              aria-haspopup="menu"
              aria-expanded={downloadMenuOpen}
              aria-controls="report-download-menu"
              aria-describedby={!exportReady ? 'report-check-heading' : undefined}
            >
              <span>{busy ? 'Preparing…' : 'Download report'}</span>
              <svg
                className="review-download-chevron"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
            {downloadMenuOpen && (
              <div className="review-download-menu" id="report-download-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => void downloadReport('folder')}>
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M2.5 5.5h5l1.5 2h8.5v8.5h-15z" />
                    <path d="M2.5 7.5v-3h5l1.5 2" />
                  </svg>
                  <span>
                    <strong>Download folder</strong>
                    <small>Save every file in one report folder under Downloads</small>
                  </span>
                </button>
                <button type="button" role="menuitem" onClick={() => void downloadReport('zip')}>
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5 2.5h7l3 3v12H5z" />
                    <path d="M12 2.5v3h3M8 6h2M8 9h2M8 12h2M8 15h2" />
                  </svg>
                  <span>
                    <strong>Download ZIP</strong>
                    <small>One archive containing the same report files</small>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {(session.endReason && session.endReason !== 'completed') || !exportReady ? (
        <div className="review-alerts">
          {session.endReason && session.endReason !== 'completed' && (
            <section className="interruption-panel" role="status">
              <strong>Capture ended early.</strong>{' '}
              {session.endReason === 'origin-changed'
                ? 'The tab left the recorded site.'
                : 'The recorded tab was closed.'}{' '}
              Evidence collected before that point is still available.
            </section>
          )}
          {!exportReady && (
            <section className="validation-panel" aria-labelledby="report-check-heading">
              <strong id="report-check-heading">Before export</strong>
              <ul>
                {validationErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : null}

      <section className="review-workspace">
        <aside className="report-inspector" aria-labelledby="issue-report-title">
          <div className="workspace-section-heading">
            <div>
              <h2 id="issue-report-title">Issue report</h2>
            </div>
            <span className="section-count">{session.steps.length}/50 steps</span>
          </div>
          <div className="review-field title-field">
            <label htmlFor="issue-summary">Issue title</label>
            <input
              id="issue-summary"
              value={session.summary}
              aria-invalid={!session.summary.trim()}
              maxLength={200}
              onChange={(event) =>
                updateSession((current) => ({ ...current, summary: event.target.value }))
              }
            />
          </div>
          <div className="behavior-grid">
            <div className="review-field">
              <label htmlFor="expected-behavior">Expected behavior (optional)</label>
              <textarea
                id="expected-behavior"
                value={session.expectedBehavior}
                maxLength={4_000}
                rows={4}
                placeholder="What should have happened?"
                onChange={(event) =>
                  updateSession((current) => ({
                    ...current,
                    expectedBehavior: event.target.value,
                  }))
                }
              />
            </div>
            <div className="review-field">
              <label htmlFor="actual-behavior">Actual behavior (optional)</label>
              <textarea
                id="actual-behavior"
                value={session.actualBehavior}
                maxLength={4_000}
                rows={4}
                placeholder="What happened instead?"
                onChange={(event) =>
                  updateSession((current) => ({
                    ...current,
                    actualBehavior: event.target.value,
                  }))
                }
              />
            </div>
            <div className="review-field steps-textarea-field">
              <label htmlFor="steps-to-reproduce">Steps to reproduce (optional)</label>
              <textarea
                id="steps-to-reproduce"
                value={stepsText}
                aria-invalid={session.steps.some((step) => !step.text.trim())}
                rows={5}
                placeholder={'One step per line\nOpened checkout\nClicked Pay'}
                onChange={(event) => {
                  const nextText = event.target.value
                    .split(/\r?\n/)
                    .slice(0, 50)
                    .map((line) => line.slice(0, 1_000))
                    .join('\n');
                  setStepsText(nextText);
                  updateSession((current) => {
                    let position = 0;
                    const steps = nextText.split('\n').flatMap((line) => {
                      const text = line.trim();
                      if (!text) return [];
                      const existing = current.steps[position];
                      const step = {
                        id: existing?.id ?? crypto.randomUUID(),
                        position,
                        text,
                      };
                      position += 1;
                      return [step];
                    });
                    return { ...current, steps };
                  });
                }}
              />
            </div>
          </div>
          <dl className="environment-list">
            <div>
              <dt>Page</dt>
              <dd>{session.page?.url || session.origin}</dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{new Date(session.startedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>OS</dt>
              <dd>{environment.operatingSystem}</dd>
            </div>
            <div>
              <dt>Browser</dt>
              <dd>{environment.browser}</dd>
            </div>
            <div>
              <dt>Platform</dt>
              <dd>{environment.platform}</dd>
            </div>
            <div className="environment-user-agent">
              <dt>User agent</dt>
              <dd>
                <code>{environment.userAgent}</code>
              </dd>
            </div>
            <div>
              <dt>BugReceipt</dt>
              <dd>{session.environment?.reproKitVersion || 'Unknown'}</dd>
            </div>
          </dl>
        </aside>

        <section className="evidence-workbench" aria-label="Captured evidence">
          <a className="mobile-report-entry" href="#issue-report-title">
            <span>
              <strong>Issue report</strong>
              <small>{session.summary || 'Add an issue title before export'}</small>
            </span>
            <span>Edit details</span>
          </a>
          <div
            className="evidence-tabs"
            role="tablist"
            aria-label="Captured evidence views"
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const tabs = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
              );
              const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
              const nextIndex =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : event.key === 'ArrowRight'
                      ? (currentIndex + 1) % tabs.length
                      : (currentIndex - 1 + tabs.length) % tabs.length;
              tabs[nextIndex]?.click();
              tabs[nextIndex]?.focus();
            }}
          >
            <button
              id="visual-evidence-tab"
              type="button"
              role="tab"
              aria-selected={evidenceView === 'visual'}
              aria-controls="visual-evidence-panel"
              tabIndex={evidenceView === 'visual' ? 0 : -1}
              onClick={() => setEvidenceView('visual')}
            >
              Visual evidence
            </button>
            <button
              id="console-evidence-tab"
              type="button"
              role="tab"
              aria-selected={evidenceView === 'console'}
              aria-controls="console-evidence-panel"
              tabIndex={evidenceView === 'console' ? 0 : -1}
              onClick={() => setEvidenceView('console')}
            >
              Console <span>{session.diagnostics.length}</span>
            </button>
            <button
              id="network-evidence-tab"
              type="button"
              role="tab"
              aria-selected={evidenceView === 'network'}
              aria-controls="network-evidence-panel"
              tabIndex={evidenceView === 'network' ? 0 : -1}
              onClick={() => setEvidenceView('network')}
            >
              Network <span>{session.network.length}</span>
            </button>
          </div>
          <article
            id="visual-evidence-panel"
            className="visual-studio screenshot-card recording-card evidence-tab-panel"
            role="tabpanel"
            aria-labelledby="visual-evidence-tab"
            hidden={evidenceView !== 'visual'}
          >
            <div className="workspace-section-heading studio-heading">
              <div>
                <h2>Visual evidence</h2>
              </div>
              <div className="studio-heading-meta">
                <div className="visual-evidence-summary" aria-label="Visual evidence status">
                  {recordingState === 'ready' ? 'Recording ready' : 'Recording unavailable'}
                  {session.page?.selectedFrame ? ' · Frame selected' : ''}
                </div>
                {recordingState === 'ready' && recordingUrl && !isAnnotating && (
                  <div
                    className="recording-header-actions"
                    role="group"
                    aria-label="Recording actions"
                  >
                    <button
                      className="text-action"
                      type="button"
                      onClick={() => downloadBlobFromUrl(recordingUrl, `${exportBase}.webm`)}
                    >
                      Download recording.webm
                    </button>
                    <button
                      className="remove-action"
                      type="button"
                      onClick={() => void removeRecording()}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
            {recordingState === 'loading' && (
              <p className="empty-copy">Loading screen recording…</p>
            )}
            {recordingState === 'ready' && recordingUrl && !isAnnotating && (
              <section className="recording-stage" aria-label="Recording preview">
                <div className="recording-player">
                  <video
                    ref={videoRef}
                    src={recordingUrl}
                    controls
                    preload="metadata"
                    onDurationChange={(event) => syncVideoState(event.currentTarget)}
                    onLoadedData={(event) => syncVideoState(event.currentTarget)}
                    onLoadedMetadata={(event) => syncVideoState(event.currentTarget)}
                    onTimeUpdate={(event) => syncVideoState(event.currentTarget)}
                    onSeeked={(event) => syncVideoState(event.currentTarget)}
                    aria-label={`Screen recording of ${session.page?.title || 'the captured page'}`}
                  >
                    Your browser cannot preview this screen recording.
                  </video>
                  <button
                    className="button primary video-frame-capture-action"
                    type="button"
                    aria-label={`Capture current frame at ${formatVideoTime(videoTime * 1_000)}`}
                    onClick={() => void saveCurrentFrame()}
                    disabled={busy || videoDuration <= 0}
                  >
                    {capturingFrame ? 'Capturing…' : 'Capture frame'}
                  </button>
                </div>
              </section>
            )}
            {(recordingState === 'ready' || session.page?.selectedFrame) && (
              <section
                className={`frame-workspace frame-workspace-selected-only${isAnnotating ? ' frame-workspace-editing' : ''}`}
                aria-label="Video frame evidence"
              >
                <section
                  className={`selected-frame${isAnnotating ? ' is-annotating' : ''}`}
                  aria-labelledby="selected-frame-title"
                >
                  <div className="selected-frame-heading">
                    <div>
                      <strong id="selected-frame-title">
                        {isAnnotating ? 'Annotate selected frame' : 'Selected frame'}
                      </strong>
                      <p>
                        {isAnnotating
                          ? 'Mark the exact problem, then save the annotated frame locally.'
                          : selectedFrameState === 'ready'
                            ? annotationCount > 0
                              ? `${annotationCount} ${annotationCount === 1 ? 'annotation is' : 'annotations are'} included in every PNG export.`
                              : 'Annotate the important area or export the frame as captured.'
                            : 'Your saved still frame will appear here.'}
                      </p>
                    </div>
                    {selectedFrameState === 'ready' && session.page?.selectedFrame && (
                      <div className="selected-frame-heading-actions">
                        <span>{formatVideoTime(session.page.selectedFrame.videoTimeMs)}</span>
                        {!isAnnotating && (
                          <>
                            <button
                              className="button quiet annotate-frame-action"
                              type="button"
                              aria-label="Annotate selected frame"
                              onClick={beginAnnotating}
                              disabled={busy}
                            >
                              <AnnotateIcon />
                              {annotationCount > 0 ? 'Edit annotations' : 'Annotate'}
                            </button>
                            <button
                              className="text-action"
                              type="button"
                              onClick={() => void downloadSelectedFrame()}
                              disabled={busy}
                            >
                              Download PNG
                            </button>
                            <button
                              className="remove-action"
                              type="button"
                              aria-label="Remove selected frame"
                              onClick={() => void removeSelectedFrame()}
                              disabled={busy}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedFrameState === 'loading' && session.page?.selectedFrame && (
                    <p className="selected-frame-status" role="status">
                      Loading selected video frame…
                    </p>
                  )}
                  {selectedFrameState === 'failed' && session.page?.selectedFrame && (
                    <p className="capture-warning" role="status">
                      The selected frame could not be loaded. Capture it again from the recording.
                    </p>
                  )}
                  {selectedFrameState === 'ready' &&
                    selectedFrameUrl &&
                    session.page?.selectedFrame && (
                      <>
                        {isAnnotating && (
                          <AnnotationToolbar
                            tool={annotationTool}
                            color={annotationColor}
                            strokeWidth={annotationWidth}
                            count={annotationCount}
                            canUndo={annotations.past.length > 0}
                            canRedo={annotations.future.length > 0}
                            saving={savingAnnotations}
                            onToolChange={chooseAnnotationTool}
                            onColorChange={setAnnotationColor}
                            onStrokeWidthChange={setAnnotationWidth}
                            onUndo={() => {
                              setAnnotations((history) => undoAnnotation(history));
                              setSelectedAnnotationId(null);
                            }}
                            onRedo={() => {
                              setAnnotations((history) => redoAnnotation(history));
                              setSelectedAnnotationId(null);
                            }}
                            onClear={() => {
                              setAnnotations((history) =>
                                commitAnnotation(history, { type: 'clear' }),
                              );
                              setSelectedAnnotationId(null);
                            }}
                            onCancel={cancelAnnotating}
                            onDone={() => void finishAnnotating()}
                          />
                        )}
                        <div
                          className={`selected-frame-canvas${isAnnotating ? ' is-editing' : ''}`}
                        >
                          <img
                            src={selectedFrameUrl}
                            alt={`Selected frame from the screen recording at ${formatVideoTime(session.page.selectedFrame.videoTimeMs)}`}
                          />
                          <AnnotationOverlay
                            document={annotationDocument}
                            editing={isAnnotating}
                            tool={annotationTool}
                            color={annotationColor}
                            displayStrokeWidth={annotationWidth}
                            selectedId={selectedAnnotationId}
                            onSelect={setSelectedAnnotationId}
                            onAdd={addAnnotation}
                            onReplace={replaceAnnotation}
                          />
                        </div>
                      </>
                    )}
                  {selectedFrameState === 'missing' && !session.page?.selectedFrame && (
                    <div className="selected-frame-empty">
                      <strong>No frame saved yet</strong>
                      <p>Pause anywhere, then use Capture frame. The PNG stays local.</p>
                    </div>
                  )}
                </section>
              </section>
            )}
            {recordingState !== 'ready' && screenshotState === 'ready' && screenshotUrl && (
              <>
                <p className="artifact-fallback-label">Fallback screenshot</p>
                <img
                  src={screenshotUrl}
                  alt={`Captured page: ${session.page?.title || 'untitled page'}`}
                />
                <div className="artifact-actions">
                  <button
                    className="text-action"
                    type="button"
                    onClick={() => downloadBlobFromUrl(screenshotUrl, `${exportBase}.png`)}
                  >
                    Download screenshot.png
                  </button>
                  <button
                    className="remove-action"
                    type="button"
                    onClick={() => void removeScreenshot()}
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
            {recordingState !== 'ready' &&
              selectedFrameState !== 'ready' &&
              screenshotState !== 'ready' && (
                <p className="empty-copy">
                  {session.page?.recordingError ||
                    session.page?.screenshotError ||
                    'No visual recording is included in this report.'}{' '}
                  The Markdown report is still available.
                </p>
              )}
          </article>

          <section
            id="console-evidence-panel"
            className="diagnostics-panel evidence-tab-panel"
            role="tabpanel"
            aria-labelledby="console-evidence-tab"
            hidden={evidenceView !== 'console'}
          >
            <div className="workspace-section-heading diagnostics-heading">
              <div>
                <h2>Console evidence</h2>
                {consoleTextAnnotationCount > 0 && (
                  <span className="diagnostics-annotation-summary">
                    {consoleTextAnnotationCount} highlighted{' '}
                    {consoleTextAnnotationCount === 1 ? 'selection' : 'selections'}
                  </span>
                )}
              </div>
              <div className="diagnostics-heading-actions">
                <p>
                  {session.filtering.redactionCount} sensitive value
                  {session.filtering.redactionCount === 1 ? '' : 's'} redacted locally
                </p>
                {!isAnnotatingText && (
                  <button
                    className="button quiet annotate-diagnostics-action"
                    type="button"
                    aria-label="Annotate console evidence"
                    onClick={() => beginTextAnnotating('console')}
                    disabled={
                      session.diagnostics.length === 0 || busy || isAnnotating || savingAnnotations
                    }
                  >
                    <AnnotateIcon />
                    {consoleTextAnnotationCount > 0 ? 'Edit highlights' : 'Annotate text'}
                  </button>
                )}
              </div>
            </div>
            {isAnnotatingText && renderTextAnnotationToolbar()}
            {evidenceView === 'console' && (
              <ConsoleEvidenceWindow
                events={session.diagnostics}
                busy={busy || isAnnotatingText}
                annotations={textAnnotationDocument.items}
                editing={isAnnotatingText}
                onAnnotate={addTextAnnotation}
                onRemoveAnnotation={removeTextAnnotation}
                onRemove={removeDiagnostic}
              />
            )}
          </section>

          <section
            id="network-evidence-panel"
            className="diagnostics-panel evidence-tab-panel"
            role="tabpanel"
            aria-labelledby="network-evidence-tab"
            hidden={evidenceView !== 'network'}
          >
            <div className="workspace-section-heading diagnostics-heading">
              <div>
                <h2>Network evidence</h2>
                {networkTextAnnotationCount > 0 && (
                  <span className="diagnostics-annotation-summary">
                    {networkTextAnnotationCount} highlighted{' '}
                    {networkTextAnnotationCount === 1 ? 'selection' : 'selections'}
                  </span>
                )}
              </div>
              <div className="diagnostics-heading-actions">
                <p>
                  {session.filtering.redactionCount} sensitive value
                  {session.filtering.redactionCount === 1 ? '' : 's'} redacted locally
                </p>
                {!isAnnotatingText && (
                  <button
                    className="button quiet annotate-diagnostics-action"
                    type="button"
                    aria-label="Annotate network evidence"
                    onClick={() => beginTextAnnotating('network')}
                    disabled={
                      session.network.length === 0 || busy || isAnnotating || savingAnnotations
                    }
                  >
                    <AnnotateIcon />
                    {networkTextAnnotationCount > 0 ? 'Edit highlights' : 'Annotate text'}
                  </button>
                )}
              </div>
            </div>
            {isAnnotatingText && renderTextAnnotationToolbar()}
            {evidenceView === 'network' && (
              <NetworkEvidenceWindow
                events={session.network}
                busy={busy || isAnnotatingText}
                annotations={textAnnotationDocument.items}
                editing={isAnnotatingText}
                onAnnotate={addTextAnnotation}
                onRemoveAnnotation={removeTextAnnotation}
                onRemove={removeNetworkEvent}
              />
            )}
          </section>
        </section>
      </section>

      <footer className="review-footer">
        <p aria-live="polite">
          {notice || 'Export creates local files only. You choose whether to publish them.'}
        </p>
        {confirmDelete ? (
          <div className="delete-confirmation" role="group" aria-label="Confirm capture deletion">
            <span>Delete this capture permanently?</span>
            <button
              className="button danger"
              type="button"
              onClick={() => void discard()}
              disabled={busy}
            >
              Delete now
            </button>
            <button
              className="button quiet"
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
            >
              Keep capture
            </button>
          </div>
        ) : (
          <button
            className="button danger"
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            Delete local capture
          </button>
        )}
      </footer>
      {error && (
        <p className="error-banner fixed" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}

type TextAnnotationSelection = Pick<
  TextAnnotation,
  'source' | 'eventId' | 'field' | 'start' | 'end'
>;

interface AnnotatableEvidenceWindowProps {
  busy: boolean;
  annotations: readonly TextAnnotation[];
  editing: boolean;
  onAnnotate: (selection: TextAnnotationSelection) => void;
  onRemoveAnnotation: (id: string) => void;
  onRemove: (id: string) => Promise<void> | void;
}

interface ConsoleEvidenceWindowProps extends AnnotatableEvidenceWindowProps {
  events: CaptureSession['diagnostics'];
}

function ConsoleEvidenceWindow({
  busy,
  events,
  annotations,
  editing,
  onAnnotate,
  onRemoveAnnotation,
  onRemove,
}: ConsoleEvidenceWindowProps) {
  return (
    <div className="console-window">
      <div className="console-top">
        <span />
        <span />
        <span />
        <b>{events.length} captured</b>
      </div>
      {events.length ? (
        events.map((event) => (
          <div className="console-entry" key={event.id}>
            <time>{new Date(event.occurredAt).toLocaleTimeString()}</time>
            <code>
              <AnnotatedEvidenceText
                value={event.message}
                source="console"
                eventId={event.id}
                field="message"
                annotations={annotations}
                editing={editing}
                onAnnotate={onAnnotate}
                onRemove={onRemoveAnnotation}
              />
            </code>
            <button
              type="button"
              aria-label="Remove console entry"
              onClick={() => void onRemove(event.id)}
              disabled={busy}
            >
              Remove
            </button>
          </div>
        ))
      ) : (
        <p className="console-empty">No console messages were captured after recording started.</p>
      )}
    </div>
  );
}

interface NetworkEvidenceWindowProps extends AnnotatableEvidenceWindowProps {
  events: CaptureSession['network'];
}

function NetworkEvidenceWindow({
  busy,
  events,
  annotations,
  editing,
  onAnnotate,
  onRemoveAnnotation,
  onRemove,
}: NetworkEvidenceWindowProps) {
  return (
    <div className="network-window">
      <div className="network-top">
        <strong>{events.length} requests captured</strong>
        <span>Fetch, XHR, and page resources</span>
      </div>
      {events.length ? (
        events.map((event) => {
          const status = String(event.status ?? 'FAILED');
          const duration = `${Math.round(event.durationMs)} ms`;
          return (
            <article className="network-entry" key={event.id}>
              <div className="network-entry-heading">
                <span className="network-method">
                  <AnnotatedEvidenceText
                    value={event.method}
                    source="network"
                    eventId={event.id}
                    field="method"
                    annotations={annotations}
                    editing={editing}
                    onAnnotate={onAnnotate}
                    onRemove={onRemoveAnnotation}
                  />
                </span>
                <span
                  className={
                    event.error || (event.status ?? 0) >= 400
                      ? 'network-status failed'
                      : 'network-status'
                  }
                >
                  <AnnotatedEvidenceText
                    value={status}
                    source="network"
                    eventId={event.id}
                    field="status"
                    annotations={annotations}
                    editing={editing}
                    onAnnotate={onAnnotate}
                    onRemove={onRemoveAnnotation}
                  />
                </span>
                <time>
                  <AnnotatedEvidenceText
                    value={duration}
                    source="network"
                    eventId={event.id}
                    field="duration"
                    annotations={annotations}
                    editing={editing}
                    onAnnotate={onAnnotate}
                    onRemove={onRemoveAnnotation}
                  />
                </time>
                <button
                  type="button"
                  aria-label="Remove network entry"
                  onClick={() => void onRemove(event.id)}
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
              <code className="network-url">
                <AnnotatedEvidenceText
                  value={event.url}
                  source="network"
                  eventId={event.id}
                  field="url"
                  annotations={annotations}
                  editing={editing}
                  onAnnotate={onAnnotate}
                  onRemove={onRemoveAnnotation}
                />
              </code>
              {(event.requestBody || event.responseBody || event.error) && (
                <details>
                  <summary>Request and response</summary>
                  {event.requestBody && (
                    <div className="network-payload">
                      <strong>Request body</strong>
                      <pre>
                        <AnnotatedEvidenceText
                          value={event.requestBody}
                          source="network"
                          eventId={event.id}
                          field="requestBody"
                          annotations={annotations}
                          editing={editing}
                          onAnnotate={onAnnotate}
                          onRemove={onRemoveAnnotation}
                        />
                      </pre>
                    </div>
                  )}
                  {event.responseBody && (
                    <div className="network-payload">
                      <strong>Response body</strong>
                      <pre>
                        <AnnotatedEvidenceText
                          value={event.responseBody}
                          source="network"
                          eventId={event.id}
                          field="responseBody"
                          annotations={annotations}
                          editing={editing}
                          onAnnotate={onAnnotate}
                          onRemove={onRemoveAnnotation}
                        />
                      </pre>
                    </div>
                  )}
                  {event.error && (
                    <div className="network-payload failed">
                      <strong>Error</strong>
                      <pre>
                        <AnnotatedEvidenceText
                          value={event.error}
                          source="network"
                          eventId={event.id}
                          field="error"
                          annotations={annotations}
                          editing={editing}
                          onAnnotate={onAnnotate}
                          onRemove={onRemoveAnnotation}
                        />
                      </pre>
                    </div>
                  )}
                </details>
              )}
            </article>
          );
        })
      ) : (
        <p className="console-empty">No network activity was captured after recording started.</p>
      )}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlobFromUrl(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}

async function readExportVisuals(
  recordingUrl: string,
  selectedFrameBlob: Blob | null,
  annotationDocument: AnnotationHistory['present'],
  screenshotUrl: string,
): Promise<ReportBundleVisual[]> {
  const visuals: ReportBundleVisual[] = [];
  if (recordingUrl) {
    visuals.push({
      blob: await readArtifactUrl(recordingUrl),
      filename: 'recording.webm',
    });
  }
  if (selectedFrameBlob) {
    visuals.push({
      blob: await renderAnnotatedPng(selectedFrameBlob, annotationDocument),
      filename: 'selected-frame.png',
    });
  }
  if (!recordingUrl && screenshotUrl) {
    visuals.push({
      blob: await readArtifactUrl(screenshotUrl),
      filename: 'screenshot.png',
    });
  }
  return visuals;
}

async function readArtifactUrl(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('The visual evidence could not be added to the download.');
  return response.blob();
}

function formatVideoTime(timeMs: number): string {
  const safeTimeMs = Number.isFinite(timeMs) ? Math.max(0, Math.round(timeMs)) : 0;
  const minutes = Math.floor(safeTimeMs / 60_000);
  const seconds = Math.floor((safeTimeMs % 60_000) / 1_000);
  const milliseconds = safeTimeMs % 1_000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function createExportBase(session: CaptureSession): string {
  const slug = session.summary
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 48);
  const timestamp = session.startedAt.replaceAll(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `bugreceipt-${slug || 'bug-report'}-${timestamp}`;
}
