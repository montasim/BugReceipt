import {
  describeCaptureEnvironment,
  getSelectedFrameFilename,
  getSelectedFrames,
  MAX_SELECTED_FRAMES,
  type CaptureSession,
} from '@bugreceipt/capture-model';
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
  createTextAnnotationDocument,
  createTextAnnotationHistory,
  isTextAnnotationDocument,
  removeTextAnnotationsForEvent,
  type TextAnnotationHistory,
} from '../../application/text-annotation-model';
import {
  deleteAnnotationDocument,
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
import { useOffensiveLanguageValidation } from '../use-offensive-language-validation';
import { AnnotatedEvidenceText } from './annotated-evidence-text';
import { AnnotateIcon } from './annotation-icons';
import { AnnotationOverlay } from './annotation-overlay';
import { AnnotationToolbar } from './annotation-toolbar';
import { ReportIssueControl } from './report-issue-control';

type ArtifactState = 'loading' | 'ready' | 'missing' | 'failed';
type EvidenceView = 'visual' | 'console' | 'network';
type DiagnosticSource = Exclude<EvidenceView, 'visual'>;

const EVIDENCE_ANNOTATION_WIDTH = 1_600;
const EVIDENCE_ANNOTATION_HEIGHT = 720;

function createEvidenceAnnotationHistories(): Record<DiagnosticSource, AnnotationHistory> {
  return {
    console: createAnnotationHistory(
      createAnnotationDocument(EVIDENCE_ANNOTATION_WIDTH, EVIDENCE_ANNOTATION_HEIGHT),
    ),
    network: createAnnotationHistory(
      createAnnotationDocument(EVIDENCE_ANNOTATION_WIDTH, EVIDENCE_ANNOTATION_HEIGHT),
    ),
  };
}

export function ReviewApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const downloadTriggerRef = useRef<HTMLButtonElement>(null);
  const annotationBaseline = useRef<AnnotationHistory | null>(null);
  const evidenceAnnotationBaseline = useRef<{
    source: DiagnosticSource;
    history: AnnotationHistory;
  } | null>(null);
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingState, setRecordingState] = useState<ArtifactState>('loading');
  const [selectedFrameUrl, setSelectedFrameUrl] = useState('');
  const [selectedFrameBlob, setSelectedFrameBlob] = useState<Blob | null>(null);
  const [selectedFrameState, setSelectedFrameState] = useState<ArtifactState>('missing');
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
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
  const [evidenceAnnotations, setEvidenceAnnotations] = useState<
    Record<DiagnosticSource, AnnotationHistory>
  >(createEvidenceAnnotationHistories);
  const [annotatingEvidence, setAnnotatingEvidence] = useState<DiagnosticSource | null>(null);
  const [savingEvidenceAnnotations, setSavingEvidenceAnnotations] = useState(false);
  const [evidenceAnnotationTool, setEvidenceAnnotationTool] = useState<AnnotationTool>('border');
  const [evidenceAnnotationColor, setEvidenceAnnotationColor] =
    useState<AnnotationColor>('#ff5c3a');
  const [evidenceAnnotationWidth, setEvidenceAnnotationWidth] = useState(6);
  const [selectedEvidenceAnnotationId, setSelectedEvidenceAnnotationId] = useState<string | null>(
    null,
  );
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
  const selectedFrames = useMemo(() => getSelectedFrames(session?.page), [session?.page]);
  const activeSelectedFrameIndex = Math.min(
    selectedFrameIndex,
    Math.max(0, selectedFrames.length - 1),
  );
  const activeSelectedFrame = selectedFrames[activeSelectedFrameIndex] ?? null;
  const exportBase = useMemo(
    () => (session ? createExportBase(session) : 'bugreceipt-report'),
    [session],
  );
  const issueValidationErrors = useMemo(
    () => (session ? getIssueValidationErrors(session) : []),
    [session],
  );
  const summaryModeration = useOffensiveLanguageValidation(session?.summary ?? '');
  const expectedBehaviorModeration = useOffensiveLanguageValidation(
    session?.expectedBehavior ?? '',
  );
  const actualBehaviorModeration = useOffensiveLanguageValidation(session?.actualBehavior ?? '');
  const stepsModeration = useOffensiveLanguageValidation(stepsText);
  const moderationFieldStates = [
    { id: 'issue-summary', label: 'Issue title', ...summaryModeration },
    {
      id: 'expected-behavior',
      label: 'Expected behavior',
      ...expectedBehaviorModeration,
    },
    { id: 'actual-behavior', label: 'Actual behavior', ...actualBehaviorModeration },
    { id: 'steps-to-reproduce', label: 'Steps to reproduce', ...stepsModeration },
  ];
  const moderationValidationErrors = moderationFieldStates.flatMap(({ error, label }) =>
    error ? [`${label}: ${error}`] : [],
  );
  const validationErrors = [...issueValidationErrors, ...moderationValidationErrors];
  const exportReady = validationErrors.length === 0;
  const emailConfigured = isReportEmailConfigured();
  const annotationDocument = annotations.present;
  const annotationCount = annotationDocument.items.length;
  const textAnnotationDocument = textAnnotations.present;
  const consoleAnnotationCount = evidenceAnnotations.console.present.items.length;
  const networkAnnotationCount = evidenceAnnotations.network.present.items.length;
  const reviewActionsDisabled =
    busy ||
    isAnnotating ||
    savingAnnotations ||
    annotatingEvidence !== null ||
    savingEvidenceAnnotations;

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
        const [storedConsoleAnnotations, storedNetworkAnnotations] = await Promise.all([
          getAnnotationDocument(
            getEvidenceAnnotationTargetId(response.session.id, 'console'),
          ).catch(() => null),
          getAnnotationDocument(
            getEvidenceAnnotationTargetId(response.session.id, 'network'),
          ).catch(() => null),
        ]);
        const evidenceDocument = (stored: unknown) =>
          isAnnotationDocument(stored, EVIDENCE_ANNOTATION_WIDTH, EVIDENCE_ANNOTATION_HEIGHT)
            ? stored
            : createAnnotationDocument(EVIDENCE_ANNOTATION_WIDTH, EVIDENCE_ANNOTATION_HEIGHT);
        setEvidenceAnnotations({
          console: createAnnotationHistory(evidenceDocument(storedConsoleAnnotations)),
          network: createAnnotationHistory(evidenceDocument(storedNetworkAnnotations)),
        });
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

  useEffect(() => {
    let disposed = false;
    let objectUrl = '';

    void (async () => {
      await Promise.resolve();
      if (disposed) return;
      annotationBaseline.current = null;
      setSelectedAnnotationId(null);
      setIsAnnotating(false);

      if (!activeSelectedFrame) {
        setSelectedFrameUrl('');
        setSelectedFrameBlob(null);
        setSelectedFrameState('missing');
        setAnnotations(createAnnotationHistory(createAnnotationDocument(1, 1)));
        return;
      }

      setSelectedFrameUrl('');
      setSelectedFrameBlob(null);
      setSelectedFrameState('loading');
      const [blob, storedAnnotations] = await Promise.all([
        readScreenshot(activeSelectedFrame.blobId),
        getAnnotationDocument(activeSelectedFrame.blobId).catch(() => null),
      ]);
      if (disposed) return;
      if (!blob) {
        setSelectedFrameState('failed');
        return;
      }
      const document = isAnnotationDocument(
        storedAnnotations,
        activeSelectedFrame.width,
        activeSelectedFrame.height,
      )
        ? storedAnnotations
        : createAnnotationDocument(activeSelectedFrame.width, activeSelectedFrame.height);
      objectUrl = URL.createObjectURL(blob);
      setAnnotations(createAnnotationHistory(document));
      setSelectedFrameBlob(blob);
      setSelectedFrameUrl(objectUrl);
      setSelectedFrameState('ready');
    })().catch(() => {
      if (!disposed) setSelectedFrameState('failed');
    });

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeSelectedFrame]);

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

  function revealFirstInvalidField() {
    if (!session) return;
    const blankStepIndex = session.steps.findIndex((step) => !step.text.trim());
    const missingFieldId = !session.summary.trim()
      ? 'issue-summary'
      : blankStepIndex >= 0
        ? 'steps-to-reproduce'
        : null;
    const moderationFieldId = moderationFieldStates.find(({ error }) => error)?.id;
    const target = document.getElementById(missingFieldId ?? moderationFieldId ?? '');
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
    setNotice(
      missingFieldId
        ? 'Complete the required fields shown in the report before exporting'
        : 'Revise the highlighted field before exporting',
    );
  }

  function revealModerationError(errors: string[]) {
    const invalidIndex = errors.findIndex(Boolean);
    if (invalidIndex < 0) return;
    const target = document.getElementById(moderationFieldStates[invalidIndex]?.id ?? '');
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
    setNotice('Revise the highlighted field before exporting');
  }

  async function withPreparedExport(
    action: (saved: CaptureSession) => void | Promise<void>,
  ): Promise<void> {
    if (!session || busy) return;
    if (!exportReady) {
      revealFirstInvalidField();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const moderationErrors = await Promise.all(
        moderationFieldStates.map(({ validateNow }) => validateNow()),
      );
      if (moderationErrors.some(Boolean)) {
        revealModerationError(moderationErrors);
        return;
      }
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
    const clearedAnnotations = await clearEvidenceAnnotations('console');
    setNotice(
      clearedAnnotations
        ? 'Console entry removed; visual annotations cleared because the evidence layout changed'
        : 'Console entry removed',
    );
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
    const clearedAnnotations = await clearEvidenceAnnotations('network');
    setNotice(
      clearedAnnotations
        ? 'Network entry removed; visual annotations cleared because the evidence layout changed'
        : 'Network entry removed',
    );
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
    if (selectedFrames.length >= MAX_SELECTED_FRAMES) {
      setNotice(`This capture already has the maximum of ${MAX_SELECTED_FRAMES} frames`);
      return;
    }
    setBusy(true);
    setCapturingFrame(true);
    setError('');
    let savedBlobId = '';
    try {
      const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : videoTime;
      const captured = await captureVideoFrame(video, currentTime, videoDuration);
      savedBlobId = await saveScreenshotBlob(captured.blob);
      const response = await sendRuntimeMessage({
        type: 'session:add-selected-frame',
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
      if ('session' in response && response.session) {
        setSession(response.session);
        setSelectedFrameIndex(getSelectedFrames(response.session.page).length - 1);
      }
      setVideoTime(captured.videoTimeMs / 1_000);
      setNotice(
        `Frame ${selectedFrames.length + 1} of ${MAX_SELECTED_FRAMES} saved at ${formatVideoTime(captured.videoTimeMs)}`,
      );
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
    if (busy || !session || !activeSelectedFrame) return;
    setBusy(true);
    setError('');
    const response = await sendRuntimeMessage({
      type: 'session:remove-selected-frame',
      blobId: activeSelectedFrame.blobId,
    });
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      return;
    }
    if ('session' in response && response.session) {
      const remainingFrames = getSelectedFrames(response.session.page);
      setSession(response.session);
      setSelectedFrameIndex(
        Math.min(activeSelectedFrameIndex, Math.max(0, remainingFrames.length - 1)),
      );
      setNotice(
        remainingFrames.length > 0
          ? `Frame removed; ${remainingFrames.length} ${remainingFrames.length === 1 ? 'frame remains' : 'frames remain'}`
          : 'Selected video frame removed',
      );
    }
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
    const frameId = activeSelectedFrame?.blobId;
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

  function updateEvidenceAnnotationHistory(
    source: DiagnosticSource,
    update: (history: AnnotationHistory) => AnnotationHistory,
  ) {
    setEvidenceAnnotations((current) => ({
      ...current,
      [source]: update(current[source]),
    }));
  }

  function beginEvidenceAnnotating(source: DiagnosticSource) {
    const hasEvidence =
      source === 'console' ? session?.diagnostics.length : session?.network.length;
    if (!hasEvidence) return;
    evidenceAnnotationBaseline.current = {
      source,
      history: evidenceAnnotations[source],
    };
    setEvidenceView(source);
    setEvidenceAnnotationTool('border');
    setSelectedEvidenceAnnotationId(null);
    setAnnotatingEvidence(source);
    setError('');
    setNotice(`Drag around the important ${source} evidence to add a border`);
  }

  function chooseEvidenceAnnotationTool(tool: AnnotationTool) {
    setEvidenceAnnotationTool(tool);
    if (tool !== 'select') setSelectedEvidenceAnnotationId(null);
    const instructions: Record<AnnotationTool, string> = {
      select: 'Select an annotation to move, resize, or delete it',
      marker: 'Draw directly on the evidence with the marker',
      highlight: 'Drag over evidence to add a translucent highlight',
      border: 'Drag around evidence to add a border',
    };
    setNotice(instructions[tool]);
  }

  function cancelEvidenceAnnotating() {
    const baseline = evidenceAnnotationBaseline.current;
    if (baseline) {
      setEvidenceAnnotations((current) => ({
        ...current,
        [baseline.source]: baseline.history,
      }));
    }
    evidenceAnnotationBaseline.current = null;
    setSelectedEvidenceAnnotationId(null);
    setAnnotatingEvidence(null);
    setNotice('Evidence annotation changes cancelled');
  }

  async function finishEvidenceAnnotating() {
    if (!session || !annotatingEvidence || savingEvidenceAnnotations) return;
    const source = annotatingEvidence;
    const document = evidenceAnnotations[source].present;
    setSavingEvidenceAnnotations(true);
    setError('');
    try {
      await saveAnnotationDocument(getEvidenceAnnotationTargetId(session.id, source), document);
      evidenceAnnotationBaseline.current = null;
      setSelectedEvidenceAnnotationId(null);
      setAnnotatingEvidence(null);
      setNotice(
        document.items.length === 0
          ? `${capitalize(source)} annotations cleared`
          : `${document.items.length} ${source} ${document.items.length === 1 ? 'annotation' : 'annotations'} saved locally`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : `BugReceipt could not save the ${source} annotations.`,
      );
    } finally {
      setSavingEvidenceAnnotations(false);
    }
  }

  function addEvidenceAnnotation(annotation: Annotation) {
    if (!annotatingEvidence) return;
    updateEvidenceAnnotationHistory(annotatingEvidence, (history) =>
      commitAnnotation(history, { type: 'add', annotation }),
    );
    setSelectedEvidenceAnnotationId(annotation.id);
  }

  function replaceEvidenceAnnotation(annotation: Annotation) {
    if (!annotatingEvidence) return;
    updateEvidenceAnnotationHistory(annotatingEvidence, (history) =>
      commitAnnotation(history, { type: 'replace', annotation }),
    );
  }

  async function removeStoredTextAnnotationsForEvent(eventId: string) {
    if (!session) return;
    const nextDocument = removeTextAnnotationsForEvent(textAnnotationDocument, eventId);
    if (nextDocument === textAnnotationDocument) return;
    setTextAnnotations(createTextAnnotationHistory(nextDocument));
    await saveTextAnnotationDocument(session.id, nextDocument);
  }

  function renderEvidenceAnnotationToolbar(source: DiagnosticSource) {
    const history = evidenceAnnotations[source];
    return (
      <AnnotationToolbar
        subjectLabel={`${source} evidence`}
        tool={evidenceAnnotationTool}
        color={evidenceAnnotationColor}
        strokeWidth={evidenceAnnotationWidth}
        count={history.present.items.length}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        saving={savingEvidenceAnnotations}
        onToolChange={chooseEvidenceAnnotationTool}
        onColorChange={setEvidenceAnnotationColor}
        onStrokeWidthChange={setEvidenceAnnotationWidth}
        onUndo={() => {
          updateEvidenceAnnotationHistory(source, undoAnnotation);
          setSelectedEvidenceAnnotationId(null);
        }}
        onRedo={() => {
          updateEvidenceAnnotationHistory(source, redoAnnotation);
          setSelectedEvidenceAnnotationId(null);
        }}
        onClear={() => {
          updateEvidenceAnnotationHistory(source, (current) =>
            commitAnnotation(current, { type: 'clear' }),
          );
          setSelectedEvidenceAnnotationId(null);
        }}
        onCancel={cancelEvidenceAnnotating}
        onDone={() => void finishEvidenceAnnotating()}
      />
    );
  }

  async function clearEvidenceAnnotations(source: DiagnosticSource): Promise<boolean> {
    if (!session || evidenceAnnotations[source].present.items.length === 0) return false;
    const empty = createAnnotationDocument(EVIDENCE_ANNOTATION_WIDTH, EVIDENCE_ANNOTATION_HEIGHT);
    setEvidenceAnnotations((current) => ({
      ...current,
      [source]: createAnnotationHistory(empty),
    }));
    try {
      await saveAnnotationDocument(getEvidenceAnnotationTargetId(session.id, source), empty);
    } catch {
      setError(
        `${capitalize(source)} evidence changed, but its visual annotations could not be cleared.`,
      );
    }
    return true;
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
        `${exportBase}-${getSelectedFrameFilename(activeSelectedFrameIndex, selectedFrames.length).replace('.png', '')}${annotationCount > 0 ? '-annotated' : ''}.png`,
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
        const visuals = await readExportVisuals(saved, recordingUrl, screenshotUrl);
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
      try {
        const visuals = await readExportVisuals(saved, recordingUrl, screenshotUrl);
        await sendReportEmail({
          sessionId: saved.id,
          subject: saved.summary,
          markdown: renderGitHubIssue(saved, textAnnotationDocument.items),
          visuals,
        });
        setEmailed(true);
        setNotice(
          visuals.length > 0
            ? `Emailed issue.md and ${visuals.length} visual ${visuals.length === 1 ? 'file' : 'files'}`
            : 'Emailed issue.md',
        );
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'The report email could not be sent.');
      }
    });
  }

  async function discard() {
    const response = await sendRuntimeMessage({ type: 'session:discard' });
    if (response.ok) {
      if (session) {
        await Promise.all([
          deleteTextAnnotationDocument(session.id),
          deleteAnnotationDocument(getEvidenceAnnotationTargetId(session.id, 'console')),
          deleteAnnotationDocument(getEvidenceAnnotationTargetId(session.id, 'network')),
        ]).catch(() => undefined);
      }
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
    <main className={`review-shell${isAnnotating || annotatingEvidence ? ' is-annotating' : ''}`}>
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
            <div className="review-header-controls">
              <ReportIssueControl
                session={session}
                emailConfigured={emailConfigured}
                onSent={(diagnosisIncluded) => {
                  setEmailed(true);
                  setNotice(
                    diagnosisIncluded
                      ? 'Issue emailed with diagnosis.md'
                      : 'Issue emailed without a diagnosis report',
                  );
                }}
              />
              <SupportLink />
            </div>
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
              aria-invalid={!session.summary.trim() || Boolean(summaryModeration.error)}
              aria-busy={summaryModeration.checking}
              aria-describedby={
                summaryModeration.error ? 'issue-summary-moderation-error' : undefined
              }
              maxLength={200}
              onChange={(event) =>
                updateSession((current) => ({ ...current, summary: event.target.value }))
              }
            />
            {summaryModeration.error ? (
              <p
                className="field-validation-error"
                id="issue-summary-moderation-error"
                role="status"
              >
                {summaryModeration.error}
              </p>
            ) : null}
          </div>
          <div className="behavior-grid">
            <div className="review-field">
              <label htmlFor="expected-behavior">Expected behavior (optional)</label>
              <textarea
                id="expected-behavior"
                value={session.expectedBehavior}
                aria-invalid={Boolean(expectedBehaviorModeration.error)}
                aria-busy={expectedBehaviorModeration.checking}
                aria-describedby={
                  expectedBehaviorModeration.error
                    ? 'expected-behavior-moderation-error'
                    : undefined
                }
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
              {expectedBehaviorModeration.error ? (
                <p
                  className="field-validation-error"
                  id="expected-behavior-moderation-error"
                  role="status"
                >
                  {expectedBehaviorModeration.error}
                </p>
              ) : null}
            </div>
            <div className="review-field">
              <label htmlFor="actual-behavior">Actual behavior (optional)</label>
              <textarea
                id="actual-behavior"
                value={session.actualBehavior}
                aria-invalid={Boolean(actualBehaviorModeration.error)}
                aria-busy={actualBehaviorModeration.checking}
                aria-describedby={
                  actualBehaviorModeration.error ? 'actual-behavior-moderation-error' : undefined
                }
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
              {actualBehaviorModeration.error ? (
                <p
                  className="field-validation-error"
                  id="actual-behavior-moderation-error"
                  role="status"
                >
                  {actualBehaviorModeration.error}
                </p>
              ) : null}
            </div>
            <div className="review-field steps-textarea-field">
              <label htmlFor="steps-to-reproduce">Steps to reproduce (optional)</label>
              <textarea
                id="steps-to-reproduce"
                value={stepsText}
                aria-invalid={
                  session.steps.some((step) => !step.text.trim()) || Boolean(stepsModeration.error)
                }
                aria-busy={stepsModeration.checking}
                aria-describedby={
                  stepsModeration.error ? 'steps-to-reproduce-moderation-error' : undefined
                }
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
              {stepsModeration.error ? (
                <p
                  className="field-validation-error"
                  id="steps-to-reproduce-moderation-error"
                  role="status"
                >
                  {stepsModeration.error}
                </p>
              ) : null}
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
              if (isAnnotating || annotatingEvidence) return;
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
              disabled={annotatingEvidence !== null}
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
              disabled={
                isAnnotating || (annotatingEvidence !== null && annotatingEvidence !== 'console')
              }
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
              disabled={
                isAnnotating || (annotatingEvidence !== null && annotatingEvidence !== 'network')
              }
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
                  {selectedFrames.length > 0
                    ? ` · ${selectedFrames.length} ${selectedFrames.length === 1 ? 'frame' : 'frames'} selected`
                    : ''}
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
                      Download video
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
                    aria-label={
                      selectedFrames.length >= MAX_SELECTED_FRAMES
                        ? `Maximum of ${MAX_SELECTED_FRAMES} frames reached`
                        : `Capture current frame at ${formatVideoTime(videoTime * 1_000)}`
                    }
                    onClick={() => void saveCurrentFrame()}
                    disabled={
                      busy || videoDuration <= 0 || selectedFrames.length >= MAX_SELECTED_FRAMES
                    }
                    title={
                      selectedFrames.length >= MAX_SELECTED_FRAMES
                        ? `Remove a frame before capturing another. Maximum ${MAX_SELECTED_FRAMES}.`
                        : undefined
                    }
                  >
                    {capturingFrame
                      ? 'Capturing…'
                      : selectedFrames.length >= MAX_SELECTED_FRAMES
                        ? `${MAX_SELECTED_FRAMES} frame limit`
                        : 'Capture frame'}
                  </button>
                </div>
              </section>
            )}
            {(recordingState === 'ready' || selectedFrames.length > 0) && (
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
                        {isAnnotating
                          ? `Annotate frame ${activeSelectedFrameIndex + 1}`
                          : selectedFrames.length === 1
                            ? 'Selected frame'
                            : 'Selected frames'}
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
                    {activeSelectedFrame && (
                      <div className="selected-frame-heading-actions">
                        {selectedFrames.length > 1 && (
                          <div
                            className="selected-frame-navigation"
                            role="group"
                            aria-label="Selected frame navigation"
                          >
                            <button
                              className="selected-frame-navigation-button"
                              type="button"
                              aria-label="View previous selected frame"
                              onClick={() =>
                                setSelectedFrameIndex((index) => Math.max(0, index - 1))
                              }
                              disabled={busy || isAnnotating || activeSelectedFrameIndex === 0}
                            >
                              <svg viewBox="0 0 20 20" aria-hidden="true">
                                <path d="m12.5 4.5-5 5.5 5 5.5" />
                              </svg>
                            </button>
                            <span
                              className="selected-frame-position"
                              aria-live="polite"
                              aria-atomic="true"
                            >
                              {activeSelectedFrameIndex + 1} / {selectedFrames.length}
                            </span>
                            <button
                              className="selected-frame-navigation-button"
                              type="button"
                              aria-label="View next selected frame"
                              onClick={() =>
                                setSelectedFrameIndex((index) =>
                                  Math.min(selectedFrames.length - 1, index + 1),
                                )
                              }
                              disabled={
                                busy ||
                                isAnnotating ||
                                activeSelectedFrameIndex === selectedFrames.length - 1
                              }
                            >
                              <svg viewBox="0 0 20 20" aria-hidden="true">
                                <path d="m7.5 4.5 5 5.5-5 5.5" />
                              </svg>
                            </button>
                          </div>
                        )}
                        <span>{formatVideoTime(activeSelectedFrame.videoTimeMs)}</span>
                        {!isAnnotating && selectedFrameState === 'ready' && (
                          <>
                            <button
                              className="text-action annotate-frame-action"
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
                              Download frame
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

                  {selectedFrameState === 'loading' && activeSelectedFrame && (
                    <p className="selected-frame-status" role="status">
                      Loading selected video frame…
                    </p>
                  )}
                  {selectedFrameState === 'failed' && activeSelectedFrame && (
                    <p className="capture-warning" role="status">
                      The selected frame could not be loaded. Capture it again from the recording.
                    </p>
                  )}
                  {selectedFrameState === 'ready' && selectedFrameUrl && activeSelectedFrame && (
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
                      <div className={`selected-frame-canvas${isAnnotating ? ' is-editing' : ''}`}>
                        <img
                          src={selectedFrameUrl}
                          alt={`Selected frame ${activeSelectedFrameIndex + 1} of ${selectedFrames.length} from the screen recording at ${formatVideoTime(activeSelectedFrame.videoTimeMs)}`}
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
                  {selectedFrameState === 'missing' && selectedFrames.length === 0 && (
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
                {consoleAnnotationCount > 0 && (
                  <span className="diagnostics-annotation-summary">
                    {consoleAnnotationCount} visual{' '}
                    {consoleAnnotationCount === 1 ? 'annotation' : 'annotations'}
                  </span>
                )}
              </div>
              <div className="diagnostics-heading-actions">
                <p>
                  {session.filtering.redactionCount} sensitive value
                  {session.filtering.redactionCount === 1 ? '' : 's'} redacted locally
                </p>
                {!annotatingEvidence && (
                  <button
                    className="button quiet annotate-diagnostics-action"
                    type="button"
                    aria-label="Annotate console evidence"
                    onClick={() => beginEvidenceAnnotating('console')}
                    disabled={
                      session.diagnostics.length === 0 ||
                      busy ||
                      isAnnotating ||
                      savingAnnotations ||
                      savingEvidenceAnnotations
                    }
                  >
                    <AnnotateIcon />
                    {consoleAnnotationCount > 0 ? 'Edit annotations' : 'Annotate'}
                  </button>
                )}
              </div>
            </div>
            {annotatingEvidence === 'console' && renderEvidenceAnnotationToolbar('console')}
            {evidenceView === 'console' && (
              <ConsoleEvidenceWindow
                events={session.diagnostics}
                busy={busy || annotatingEvidence === 'console'}
                textAnnotations={textAnnotationDocument.items}
                annotationDocument={evidenceAnnotations.console.present}
                annotationEditing={annotatingEvidence === 'console'}
                annotationTool={evidenceAnnotationTool}
                annotationColor={evidenceAnnotationColor}
                annotationWidth={evidenceAnnotationWidth}
                selectedAnnotationId={selectedEvidenceAnnotationId}
                onSelectAnnotation={setSelectedEvidenceAnnotationId}
                onAddAnnotation={addEvidenceAnnotation}
                onReplaceAnnotation={replaceEvidenceAnnotation}
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
                {networkAnnotationCount > 0 && (
                  <span className="diagnostics-annotation-summary">
                    {networkAnnotationCount} visual{' '}
                    {networkAnnotationCount === 1 ? 'annotation' : 'annotations'}
                  </span>
                )}
              </div>
              <div className="diagnostics-heading-actions">
                <p>
                  {session.filtering.redactionCount} sensitive value
                  {session.filtering.redactionCount === 1 ? '' : 's'} redacted locally
                </p>
                {!annotatingEvidence && (
                  <button
                    className="button quiet annotate-diagnostics-action"
                    type="button"
                    aria-label="Annotate network evidence"
                    onClick={() => beginEvidenceAnnotating('network')}
                    disabled={
                      session.network.length === 0 ||
                      busy ||
                      isAnnotating ||
                      savingAnnotations ||
                      savingEvidenceAnnotations
                    }
                  >
                    <AnnotateIcon />
                    {networkAnnotationCount > 0 ? 'Edit annotations' : 'Annotate'}
                  </button>
                )}
              </div>
            </div>
            {annotatingEvidence === 'network' && renderEvidenceAnnotationToolbar('network')}
            {evidenceView === 'network' && (
              <NetworkEvidenceWindow
                events={session.network}
                busy={busy || annotatingEvidence === 'network'}
                textAnnotations={textAnnotationDocument.items}
                annotationDocument={evidenceAnnotations.network.present}
                annotationEditing={annotatingEvidence === 'network'}
                annotationTool={evidenceAnnotationTool}
                annotationColor={evidenceAnnotationColor}
                annotationWidth={evidenceAnnotationWidth}
                selectedAnnotationId={selectedEvidenceAnnotationId}
                onSelectAnnotation={setSelectedEvidenceAnnotationId}
                onAddAnnotation={addEvidenceAnnotation}
                onReplaceAnnotation={replaceEvidenceAnnotation}
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

interface AnnotatableEvidenceWindowProps {
  busy: boolean;
  textAnnotations: TextAnnotationHistory['present']['items'];
  annotationDocument: AnnotationHistory['present'];
  annotationEditing: boolean;
  annotationTool: AnnotationTool;
  annotationColor: AnnotationColor;
  annotationWidth: number;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onAddAnnotation: (annotation: Annotation) => void;
  onReplaceAnnotation: (annotation: Annotation) => void;
  onRemove: (id: string) => Promise<void> | void;
}

interface ConsoleEvidenceWindowProps extends AnnotatableEvidenceWindowProps {
  events: CaptureSession['diagnostics'];
}

function ConsoleEvidenceWindow({
  busy,
  events,
  textAnnotations,
  annotationDocument,
  annotationEditing,
  annotationTool,
  annotationColor,
  annotationWidth,
  selectedAnnotationId,
  onSelectAnnotation,
  onAddAnnotation,
  onReplaceAnnotation,
  onRemove,
}: ConsoleEvidenceWindowProps) {
  return (
    <div className="console-window">
      <div className={`diagnostic-annotation-surface${annotationEditing ? ' is-editing' : ''}`}>
        <div className="diagnostic-evidence-content">
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
                    annotations={textAnnotations}
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
            <p className="console-empty">
              No console messages were captured after recording started.
            </p>
          )}
        </div>
        <AnnotationOverlay
          ariaLabel="Console evidence annotation canvas"
          document={annotationDocument}
          editing={annotationEditing}
          tool={annotationTool}
          color={annotationColor}
          displayStrokeWidth={annotationWidth}
          selectedId={selectedAnnotationId}
          onSelect={onSelectAnnotation}
          onAdd={onAddAnnotation}
          onReplace={onReplaceAnnotation}
        />
      </div>
    </div>
  );
}

interface NetworkEvidenceWindowProps extends AnnotatableEvidenceWindowProps {
  events: CaptureSession['network'];
}

function NetworkEvidenceWindow({
  busy,
  events,
  textAnnotations,
  annotationDocument,
  annotationEditing,
  annotationTool,
  annotationColor,
  annotationWidth,
  selectedAnnotationId,
  onSelectAnnotation,
  onAddAnnotation,
  onReplaceAnnotation,
  onRemove,
}: NetworkEvidenceWindowProps) {
  return (
    <div className="network-window">
      <div className={`diagnostic-annotation-surface${annotationEditing ? ' is-editing' : ''}`}>
        <div className="diagnostic-evidence-content">
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
                        annotations={textAnnotations}
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
                        annotations={textAnnotations}
                      />
                    </span>
                    <time>
                      <AnnotatedEvidenceText
                        value={duration}
                        source="network"
                        eventId={event.id}
                        field="duration"
                        annotations={textAnnotations}
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
                      annotations={textAnnotations}
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
                              annotations={textAnnotations}
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
                              annotations={textAnnotations}
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
                              annotations={textAnnotations}
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
            <p className="console-empty">
              No network activity was captured after recording started.
            </p>
          )}
        </div>
        <AnnotationOverlay
          ariaLabel="Network evidence annotation canvas"
          document={annotationDocument}
          editing={annotationEditing}
          tool={annotationTool}
          color={annotationColor}
          displayStrokeWidth={annotationWidth}
          selectedId={selectedAnnotationId}
          onSelect={onSelectAnnotation}
          onAdd={onAddAnnotation}
          onReplace={onReplaceAnnotation}
        />
      </div>
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
  session: CaptureSession,
  recordingUrl: string,
  screenshotUrl: string,
): Promise<ReportBundleVisual[]> {
  const visuals: ReportBundleVisual[] = [];
  if (recordingUrl) {
    visuals.push({
      blob: await readArtifactUrl(recordingUrl),
      filename: 'recording.webm',
    });
  }
  const selectedFrames = getSelectedFrames(session.page);
  for (const [index, frame] of selectedFrames.entries()) {
    const blob = await readScreenshot(frame.blobId);
    if (!blob) throw new Error(`Selected frame ${index + 1} could not be added to the download.`);
    const storedAnnotations = await getAnnotationDocument(frame.blobId).catch(() => null);
    const annotationDocument = isAnnotationDocument(storedAnnotations, frame.width, frame.height)
      ? storedAnnotations
      : createAnnotationDocument(frame.width, frame.height);
    visuals.push({
      blob: await renderAnnotatedPng(blob, annotationDocument),
      filename: getSelectedFrameFilename(index, selectedFrames.length),
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

function getEvidenceAnnotationTargetId(sessionId: string, source: DiagnosticSource): string {
  return `${sessionId}:evidence:${source}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
