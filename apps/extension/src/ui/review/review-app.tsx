import {
  describeCaptureEnvironment,
  getIncludedSession,
  getSelectedFrameFilename,
  getSelectedFrames,
  MAX_SELECTED_FRAMES,
  type CaptureSession,
  type EvidenceExclusionKind,
} from '@bugreceipt/capture-model';
import { getIssueValidationErrors, renderGitHubIssue } from '@bugreceipt/issue-export';
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BrowserIcon,
  Clock01Icon,
  ComputerIcon,
  CpuIcon,
  Delete02Icon,
  Download01Icon,
  Edit02Icon,
  FileZipIcon,
  Globe02Icon,
  PackageIcon,
  SourceCodeIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import { FieldLabel } from '../../components/ui/field';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Toaster } from '../../components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableRow } from '../../components/ui/table';
import { Textarea } from '../../components/ui/textarea';
import { TooltipProvider } from '../../components/ui/tooltip';
import {
  commitAnnotation,
  createAnnotationDocument,
  createAnnotationHistory,
  isAnnotationDocument,
  redoAnnotation,
  updateAnnotationDocument,
  undoAnnotation,
  type Annotation,
  type AnnotationColor,
  type AnnotationDocument,
  type AnnotationHistory,
  type AnnotationTool,
} from '../../application/annotation-model';
import { getOffensiveLanguageError } from '../../application/content-moderation';
import { sendRuntimeMessage } from '../../application/protocol';
import { renderAnnotatedPng } from '../../application/render-annotations';
import {
  createTextAnnotationDocument,
  createTextAnnotationHistory,
  isTextAnnotationDocument,
  type TextAnnotationHistory,
} from '../../application/text-annotation-model';
import {
  deleteAnnotationDocument,
  getAnnotationDocument,
  saveAnnotationDocument,
} from '../../infrastructure/annotation-store';
import {
  serializeConsoleEvidence,
  serializeNetworkEvidenceAsHar,
} from '../../infrastructure/evidence-download';
import { createReportBundle, type ReportBundleVisual } from '../../infrastructure/report-bundle';
import { readRecording } from '../../infrastructure/recording-store';
import {
  deleteScreenshot,
  readScreenshot,
  saveScreenshotBlob,
} from '../../infrastructure/screenshot-store';
import { captureVideoFrame } from '../../infrastructure/video-frame';
import {
  deleteTextAnnotationDocument,
  getTextAnnotationDocument,
} from '../../infrastructure/text-annotation-store';
import { Brand } from '../brand';
import { SupportLink } from '../support-link';
import { useOffensiveLanguageValidation } from '../use-offensive-language-validation';
import { AnnotatedEvidenceText } from './annotated-evidence-text';
import { AnnotationOverlay } from './annotation-overlay';
import { AnnotationToolbar } from './annotation-toolbar';

type ArtifactState = 'loading' | 'ready' | 'missing' | 'failed';
type EvidenceView = 'visual' | 'console' | 'network';
type DiagnosticSource = Exclude<EvidenceView, 'visual'>;
type ReviewStage = 'report' | 'evidence' | 'export';

const EVIDENCE_ANNOTATION_WIDTH = 1_600;
const EVIDENCE_ANNOTATION_HEIGHT = 720;
const REPORT_TEXTAREA_CLASS = 'max-h-[calc(6lh+1rem+2px)] overflow-y-auto';

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
  return (
    <TooltipProvider>
      <ReviewAppContent />
      <Toaster />
    </TooltipProvider>
  );
}

function ReviewAppContent() {
  const videoRef = useRef<HTMLVideoElement>(null);
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
  const [reviewStage, setReviewStage] = useState<ReviewStage>('report');
  const [evidenceView, setEvidenceView] = useState<EvidenceView>('visual');
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
  const descriptionModeration = useOffensiveLanguageValidation(session?.description ?? '');
  const expectedBehaviorModeration = useOffensiveLanguageValidation(
    session?.expectedBehavior ?? '',
  );
  const actualBehaviorModeration = useOffensiveLanguageValidation(session?.actualBehavior ?? '');
  const stepsModeration = useOffensiveLanguageValidation(stepsText);
  const moderationFieldStates = [
    { id: 'issue-summary', label: 'Issue title', ...summaryModeration },
    { id: 'issue-description', label: 'Description', ...descriptionModeration },
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
        const includedSession = getIncludedSession(response.session);
        setSession(includedSession);
        setStepsText(includedSession.steps.map((step) => step.text).join('\n'));
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
        const recordingId = includedSession.page?.recording?.blobId;
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
          setRecordingState(includedSession.page?.recordingError ? 'failed' : 'missing');
        }
        const blobId = includedSession.page?.screenshotBlobId;
        if (!blobId) {
          setScreenshotState(includedSession.page?.screenshotError ? 'failed' : 'missing');
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

  function updateSession(update: (current: CaptureSession) => CaptureSession) {
    setSession((current) => (current ? update(current) : current));
    setDirty(true);
    setNotice('Your edits will be saved when you change sections or download the report');
  }

  async function changeReviewStage(nextStage: ReviewStage) {
    if (busy || nextStage === reviewStage) return;
    if (dirty && session) {
      setBusy(true);
      const saved = await persistReview(session);
      setBusy(false);
      if (!saved) return;
    }
    setReviewStage(nextStage);
  }

  async function persistReview(draft: CaptureSession): Promise<CaptureSession | null> {
    const response = await sendRuntimeMessage({
      type: 'session:update-review',
      summary: draft.summary,
      description: draft.description ?? '',
      expectedBehavior: draft.expectedBehavior,
      actualBehavior: draft.actualBehavior,
      steps: draft.steps,
    });
    if (!response.ok) {
      setError(response.message);
      return null;
    }
    if (!('session' in response) || !response.session) return null;
    const includedSession = getIncludedSession(response.session);
    setSession(includedSession);
    setDirty(false);
    return includedSession;
  }

  async function setEvidenceExcluded(
    kind: EvidenceExclusionKind,
    excluded: boolean,
    id?: string,
  ): Promise<CaptureSession | null> {
    const response = await sendRuntimeMessage({
      type: 'session:set-evidence-excluded',
      kind,
      id,
      excluded,
    });
    if (!response.ok) {
      setError(response.message);
      return null;
    }
    if (!('session' in response) || !response.session) return null;
    const includedSession = getIncludedSession(response.session);
    setSession(includedSession);
    return includedSession;
  }

  function offerUndo(kind: EvidenceExclusionKind, label: string, id?: string) {
    toast(label, {
      action: {
        label: 'Undo',
        onClick: () => {
          void setEvidenceExcluded(kind, false, id).then((restored) => {
            if (!restored) return;
            if (kind === 'recording' && recordingUrl) setRecordingState('ready');
            if (kind === 'screenshot' && screenshotUrl) setScreenshotState('ready');
            toast.success('Evidence restored');
          });
        },
      },
    });
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
    const response = await setEvidenceExcluded('diagnostic', true, id);
    setBusy(false);
    if (!response) return;
    setNotice('Console entry excluded from export');
    offerUndo('diagnostic', 'Console entry excluded', id);
  }

  async function removeNetworkEvent(id: string) {
    if (busy || !session) return;
    setBusy(true);
    setError('');
    if (dirty && !(await persistReview(session))) {
      setBusy(false);
      return;
    }
    const response = await setEvidenceExcluded('network', true, id);
    setBusy(false);
    if (!response) return;
    setNotice('Network entry excluded from export');
    offerUndo('network', 'Network entry excluded', id);
  }

  async function removeScreenshot() {
    if (busy || !session) return;
    setBusy(true);
    setError('');
    if (dirty && !(await persistReview(session))) {
      setBusy(false);
      return;
    }
    const response = await setEvidenceExcluded('screenshot', true);
    setBusy(false);
    if (!response) return;
    setScreenshotState('missing');
    setNotice('Screenshot excluded from export');
    offerUndo('screenshot', 'Screenshot excluded');
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
        const includedSession = getIncludedSession(response.session);
        setSession(includedSession);
        setSelectedFrameIndex(getSelectedFrames(includedSession.page).length - 1);
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
    const removedBlobId = activeSelectedFrame.blobId;
    const response = await setEvidenceExcluded('selected-frame', true, removedBlobId);
    setBusy(false);
    if (response) {
      const remainingFrames = getSelectedFrames(response.page);
      setSelectedFrameIndex(
        Math.min(activeSelectedFrameIndex, Math.max(0, remainingFrames.length - 1)),
      );
      setNotice(
        remainingFrames.length > 0
          ? `Frame removed; ${remainingFrames.length} ${remainingFrames.length === 1 ? 'frame remains' : 'frames remain'}`
          : 'Selected video frame excluded',
      );
      offerUndo('selected-frame', 'Selected frame excluded', removedBlobId);
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
      text: 'Click the frame to place a note, then type inside it',
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
      const noteError = await getAnnotationNoteError(annotationDocument);
      if (noteError) {
        setError(`Text note: ${noteError}`);
        setNotice('Update or remove the flagged note before saving annotations');
        return;
      }
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

  function updateAnnotation(annotation: Annotation) {
    setAnnotations((history) => ({
      ...history,
      present: updateAnnotationDocument(history.present, { type: 'replace', annotation }),
      future: [],
    }));
  }

  function removeAnnotation(id: string) {
    setAnnotations((history) => commitAnnotation(history, { type: 'remove', id }));
    setSelectedAnnotationId(null);
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
      text: 'Click the evidence to place a note, then type inside it',
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
      const noteError = await getAnnotationNoteError(document);
      if (noteError) {
        setError(`Text note: ${noteError}`);
        setNotice(`Update or remove the flagged ${source} note before saving annotations`);
        return;
      }
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

  function updateEvidenceAnnotation(annotation: Annotation) {
    if (!annotatingEvidence) return;
    updateEvidenceAnnotationHistory(annotatingEvidence, (history) => ({
      ...history,
      present: updateAnnotationDocument(history.present, { type: 'replace', annotation }),
      future: [],
    }));
  }

  function removeEvidenceAnnotation(id: string) {
    if (!annotatingEvidence) return;
    updateEvidenceAnnotationHistory(annotatingEvidence, (history) =>
      commitAnnotation(history, { type: 'remove', id }),
    );
    setSelectedEvidenceAnnotationId(null);
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

  function downloadConsoleEvidence() {
    if (!session || session.diagnostics.length === 0 || reviewActionsDisabled) return;
    setError('');
    downloadBlob(
      new Blob([serializeConsoleEvidence(session)], {
        type: 'application/json;charset=utf-8',
      }),
      `${exportBase}-console.json`,
    );
    setNotice(`Downloaded ${exportBase}-console.json with locally filtered console evidence`);
  }

  function downloadNetworkEvidence() {
    if (!session || session.network.length === 0 || reviewActionsDisabled) return;
    setError('');
    downloadBlob(
      new Blob([serializeNetworkEvidenceAsHar(session)], {
        type: 'application/har+json;charset=utf-8',
      }),
      `${exportBase}-network.har`,
    );
    setNotice(`Downloaded ${exportBase}-network.har with locally filtered network evidence`);
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
    const response = await setEvidenceExcluded('recording', true);
    setBusy(false);
    if (!response) return;
    setRecordingState('missing');
    setNotice('Screen recording excluded from export');
    offerUndo('recording', 'Screen recording excluded');
  }

  async function downloadReport() {
    await withPreparedExport(async (saved) => {
      try {
        const savedMarkdown = renderGitHubIssue(saved, textAnnotationDocument.items);
        const savedExportBase = createExportBase(saved);
        const visuals = await readExportVisuals(saved, recordingUrl, screenshotUrl);
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
      <main className="grid min-h-svh place-content-center gap-3 bg-background px-6 text-center">
        <div className="mx-auto">
          <Brand showVersion={false} />
        </div>
        <p className="mt-4 font-mono text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {error ? 'Review unavailable' : 'Nothing to review yet'}
        </p>
        <h1 className="max-w-lg text-2xl font-semibold tracking-tight">
          {error || 'Record a problem before opening the review.'}
        </h1>
        <p className="max-w-lg text-sm leading-6 text-muted-foreground">
          Open the BugReceipt side panel, choose the affected tab, and finish recording. Then open
          the review from the side panel.
        </p>
      </main>
    );
  }

  const environment = describeCaptureEnvironment(session.environment);

  return (
    <main className="min-h-svh bg-background pb-16">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1575px] items-center gap-6 px-6">
          <Brand showVersion={false} />
          <SupportLink />
        </div>
      </header>

      <section
        className="relative mx-auto grid max-w-[1575px] gap-5 px-6 py-6 after:absolute after:inset-x-6 after:bottom-0 after:h-px after:bg-border lg:grid-cols-[1fr_auto] lg:items-center"
        aria-labelledby="review-title"
      >
        <div className="max-w-2xl space-y-1">
          <h1 id="review-title" className="text-2xl font-semibold tracking-[-0.035em]">
            Evidence review
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {session.page?.title || 'Captured page'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" type="button" disabled={busy}>
                Delete local capture
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this capture permanently?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the recording, report, frames, events, and annotations stored on this
                  device. It cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep capture</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => void discard()}>
                  Delete now
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            type="button"
            onClick={() => void downloadReport()}
            disabled={reviewActionsDisabled}
            aria-describedby={!exportReady ? 'report-check-heading' : undefined}
          >
            <HugeiconsIcon icon={FileZipIcon} aria-hidden="true" />
            {busy ? 'Preparing…' : 'Download as ZIP'}
          </Button>
        </div>
      </section>

      {session.captureWarnings?.length || session.filtering.droppedEventCount > 0 ? (
        <div className="mx-auto max-w-[1575px] px-6 pt-5">
          <Alert role="status">
            <AlertTitle>Some evidence is incomplete</AlertTitle>
            <AlertDescription>
              {session.captureWarnings?.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
              {session.filtering.droppedEventCount > 0 && (
                <p>
                  Evidence limits were reached. {session.filtering.droppedEventCount} additional
                  events or updates were omitted.
                </p>
              )}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {(session.endReason && session.endReason !== 'completed') || !exportReady ? (
        <div className="mx-auto grid max-w-[1575px] gap-3 px-6 pt-5">
          {session.endReason && session.endReason !== 'completed' && (
            <Alert className="border-warning/40 bg-warning" role="status">
              <AlertTitle className="text-warning-foreground">Capture ended early</AlertTitle>
              <AlertDescription>
                {session.endReason === 'origin-changed'
                  ? 'The tab left the recorded site.'
                  : 'The recorded tab was closed.'}{' '}
                Evidence collected before that point is still available.
              </AlertDescription>
            </Alert>
          )}
          {!exportReady && (
            <Alert variant="destructive" aria-labelledby="report-check-heading">
              <AlertTitle id="report-check-heading">
                Complete the report before downloading
              </AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {validationErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : null}

      <section className="mx-auto grid max-w-[1575px] gap-6 px-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside
          className="h-fit rounded-xl border bg-card p-3 lg:sticky lg:top-22"
          aria-label="Review stages"
        >
          <div className="mb-3 px-2 py-2">
            <p className="text-sm font-semibold">Review progress</p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {session.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <nav className="grid gap-1">
            {(
              [
                ['report', '01', 'Report details', `${session.steps.length} recorded steps`],
                [
                  'evidence',
                  '02',
                  'Review evidence',
                  `${session.diagnostics.length + session.network.length} technical items`,
                ],
                [
                  'export',
                  '03',
                  'Choose files',
                  exportReady ? 'Ready to download' : 'Complete report',
                ],
              ] as const
            ).map(([stage, index, label, detail]) => (
              <Button
                key={stage}
                className="h-auto justify-start gap-3 px-3 py-3 text-left"
                variant={reviewStage === stage ? 'secondary' : 'ghost'}
                type="button"
                aria-current={reviewStage === stage ? 'step' : undefined}
                onClick={() => void changeReviewStage(stage)}
              >
                <span className="font-mono text-[10px] text-muted-foreground">{index}</span>
                <span className="grid min-w-0 gap-0.5">
                  <strong>{label}</strong>
                  <small className="truncate font-normal text-muted-foreground">{detail}</small>
                </span>
              </Button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <section
            className={`rounded-xl border bg-card p-6 ${reviewStage === 'report' ? '' : 'hidden'}`}
            aria-labelledby="issue-report-title"
          >
            <div className="mb-6 flex items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 id="issue-report-title" className="text-xl font-semibold tracking-tight">
                  Complete the report
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Give the developer the shortest clear account of what failed.
                </p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {session.steps.length}/50 steps
              </span>
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="issue-summary">Issue title</FieldLabel>
              <Input
                id="issue-summary"
                value={session.summary}
                placeholder="Summarize the problem in one sentence."
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
                  className="text-sm font-medium text-destructive"
                  id="issue-summary-moderation-error"
                  role="status"
                >
                  {summaryModeration.error}
                </p>
              ) : null}
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="issue-description">Description (optional)</FieldLabel>
                <Textarea
                  className={REPORT_TEXTAREA_CLASS}
                  id="issue-description"
                  value={session.description ?? ''}
                  aria-invalid={Boolean(descriptionModeration.error)}
                  aria-busy={descriptionModeration.checking}
                  aria-describedby={
                    descriptionModeration.error ? 'issue-description-moderation-error' : undefined
                  }
                  maxLength={4_000}
                  rows={4}
                  placeholder="Describe the problem and add any useful context."
                  onChange={(event) =>
                    updateSession((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
                {descriptionModeration.error ? (
                  <p
                    className="text-sm font-medium text-destructive"
                    id="issue-description-moderation-error"
                    role="status"
                  >
                    {descriptionModeration.error}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="expected-behavior">Expected behavior (optional)</FieldLabel>
                <Textarea
                  className={REPORT_TEXTAREA_CLASS}
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
                    className="text-sm font-medium text-destructive"
                    id="expected-behavior-moderation-error"
                    role="status"
                  >
                    {expectedBehaviorModeration.error}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="actual-behavior">Actual behavior (optional)</FieldLabel>
                <Textarea
                  className={REPORT_TEXTAREA_CLASS}
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
                    className="text-sm font-medium text-destructive"
                    id="actual-behavior-moderation-error"
                    role="status"
                  >
                    {actualBehaviorModeration.error}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <FieldLabel htmlFor="steps-to-reproduce">Steps to reproduce (optional)</FieldLabel>
                <Textarea
                  className={REPORT_TEXTAREA_CLASS}
                  id="steps-to-reproduce"
                  value={stepsText}
                  aria-invalid={
                    session.steps.some((step) => !step.text.trim()) ||
                    Boolean(stepsModeration.error)
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
                    className="text-sm font-medium text-destructive"
                    id="steps-to-reproduce-moderation-error"
                    role="status"
                  >
                    {stepsModeration.error}
                  </p>
                ) : null}
              </div>
            </div>
            <dl className="mt-6 grid gap-x-8 gap-y-5 rounded-lg bg-muted/40 p-4 md:grid-cols-2 [&>div]:grid [&>div]:gap-1 [&_dt]:flex [&_dt]:items-center [&_dt]:gap-1.5 [&_dt]:font-mono [&_dt]:text-[10px] [&_dt]:font-semibold [&_dt]:uppercase [&_dt]:text-muted-foreground [&_dt_svg]:size-3 [&_dd]:min-w-0 [&_dd]:break-words [&_dd]:text-sm">
              <div className="md:col-span-2">
                <dt>
                  <HugeiconsIcon icon={Globe02Icon} aria-hidden="true" /> Page
                </dt>
                <dd>{session.page?.url || session.origin}</dd>
              </div>
              <div>
                <dt>
                  <HugeiconsIcon icon={Clock01Icon} aria-hidden="true" /> Started
                </dt>
                <dd>{new Date(session.startedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt>
                  <HugeiconsIcon icon={ComputerIcon} aria-hidden="true" /> OS
                </dt>
                <dd>{environment.operatingSystem}</dd>
              </div>
              <div>
                <dt>
                  <HugeiconsIcon icon={BrowserIcon} aria-hidden="true" /> Browser
                </dt>
                <dd>{environment.browser}</dd>
              </div>
              <div>
                <dt>
                  <HugeiconsIcon icon={CpuIcon} aria-hidden="true" /> Platform
                </dt>
                <dd>{environment.platform}</dd>
              </div>
              <div className="md:col-span-2">
                <dt>
                  <HugeiconsIcon icon={SourceCodeIcon} aria-hidden="true" /> User agent
                </dt>
                <dd>
                  <code>{environment.userAgent}</code>
                </dd>
              </div>
              <div>
                <dt>
                  <HugeiconsIcon icon={PackageIcon} aria-hidden="true" /> BugReceipt
                </dt>
                <dd>{session.environment?.reproKitVersion || 'Unknown'}</dd>
              </div>
            </dl>
          </section>

          <section
            className={`rounded-xl border bg-card p-6 ${reviewStage === 'evidence' ? '' : 'hidden'}`}
            aria-label="Captured evidence"
          >
            <Tabs
              value={evidenceView}
              onValueChange={(value) => setEvidenceView(value as EvidenceView)}
            >
              <TabsList
                className="mb-5"
                aria-label="Captured evidence views"
                onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const views: EvidenceView[] = ['visual', 'console', 'network'];
                  const currentIndex = views.indexOf(evidenceView);
                  const nextIndex =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? views.length - 1
                        : (currentIndex + (event.key === 'ArrowLeft' ? -1 : 1) + views.length) %
                          views.length;
                  setEvidenceView(views[nextIndex] ?? 'visual');
                }}
              >
                <TabsTrigger
                  value="visual"
                  id="visual-evidence-tab"
                  aria-controls="visual-evidence-panel"
                  disabled={annotatingEvidence !== null}
                  onClick={() => setEvidenceView('visual')}
                >
                  Visual evidence
                </TabsTrigger>
                <TabsTrigger
                  value="console"
                  id="console-evidence-tab"
                  aria-controls="console-evidence-panel"
                  disabled={
                    isAnnotating ||
                    (annotatingEvidence !== null && annotatingEvidence !== 'console')
                  }
                  onClick={() => setEvidenceView('console')}
                >
                  Console <span>{session.diagnostics.length}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="network"
                  id="network-evidence-tab"
                  aria-controls="network-evidence-panel"
                  disabled={
                    isAnnotating ||
                    (annotatingEvidence !== null && annotatingEvidence !== 'network')
                  }
                  onClick={() => setEvidenceView('network')}
                >
                  Network <span>{session.network.length}</span>
                </TabsTrigger>
              </TabsList>
              <article
                id="visual-evidence-panel"
                className="min-w-0"
                role="tabpanel"
                aria-labelledby="visual-evidence-tab"
                hidden={evidenceView !== 'visual'}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Visual evidence</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Play the recording, save useful frames, and annotate the exact problem.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div
                      className="font-mono text-[10px] text-muted-foreground"
                      aria-label="Visual evidence status"
                    >
                      {recordingState === 'ready' ? 'Video available' : 'Video unavailable'}
                      {selectedFrames.length > 0
                        ? ` · ${selectedFrames.length} ${selectedFrames.length === 1 ? 'frame' : 'frames'} selected`
                        : ''}
                    </div>
                    {recordingState === 'ready' && recordingUrl && !isAnnotating && (
                      <div
                        className="flex items-center gap-2"
                        role="group"
                        aria-label="Recording actions"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => downloadBlobFromUrl(recordingUrl, `${exportBase}.webm`)}
                        >
                          <HugeiconsIcon icon={Download01Icon} aria-hidden="true" />
                          Download video
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          type="button"
                          onClick={() => void removeRecording()}
                          disabled={busy}
                        >
                          <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" />
                          Remove video
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {recordingState === 'loading' && (
                  <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    Loading screen recording…
                  </p>
                )}
                {recordingState === 'ready' && recordingUrl && !isAnnotating && (
                  <section className="space-y-4" aria-label="Recording preview">
                    <div className="rounded-xl border bg-black p-3 [&_video]:max-h-[60vh] [&_video]:w-full">
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
                      <Button
                        className="mt-3"
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
                            : 'Save current frame'}
                      </Button>
                    </div>
                  </section>
                )}
                {(recordingState === 'ready' || selectedFrames.length > 0) && (
                  <section className="mt-5" aria-label="Video frame evidence">
                    <section
                      className="rounded-xl border bg-muted/30 p-4"
                      aria-labelledby="selected-frame-title"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
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
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {selectedFrames.length > 1 && (
                              <div
                                className="flex items-center gap-1"
                                role="group"
                                aria-label="Selected frame navigation"
                              >
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  type="button"
                                  aria-label="View previous selected frame"
                                  onClick={() =>
                                    setSelectedFrameIndex((index) => Math.max(0, index - 1))
                                  }
                                  disabled={busy || isAnnotating || activeSelectedFrameIndex === 0}
                                >
                                  <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
                                </Button>
                                <span
                                  className="px-2 font-mono text-xs text-muted-foreground"
                                  aria-live="polite"
                                  aria-atomic="true"
                                >
                                  {activeSelectedFrameIndex + 1} / {selectedFrames.length}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon-sm"
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
                                  <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
                                </Button>
                              </div>
                            )}
                            <span>{formatVideoTime(activeSelectedFrame.videoTimeMs)}</span>
                            {!isAnnotating && selectedFrameState === 'ready' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  aria-label="Annotate selected frame"
                                  onClick={beginAnnotating}
                                  disabled={busy}
                                >
                                  <HugeiconsIcon icon={Edit02Icon} />
                                  {annotationCount > 0 ? 'Edit annotations' : 'Annotate'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  onClick={() => void downloadSelectedFrame()}
                                  disabled={busy}
                                >
                                  Download frame
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  type="button"
                                  aria-label="Remove selected frame"
                                  onClick={() => void removeSelectedFrame()}
                                  disabled={busy}
                                >
                                  Remove frame
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {selectedFrameState === 'loading' && activeSelectedFrame && (
                        <p className="py-8 text-center text-sm text-muted-foreground" role="status">
                          Loading selected video frame…
                        </p>
                      )}
                      {selectedFrameState === 'failed' && activeSelectedFrame && (
                        <p
                          className="rounded-lg border border-warning/40 bg-warning p-4 text-sm text-warning-foreground"
                          role="status"
                        >
                          The selected frame could not be loaded. Capture it again from the
                          recording.
                        </p>
                      )}
                      {selectedFrameState === 'ready' &&
                        selectedFrameUrl &&
                        activeSelectedFrame && (
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
                              className={`relative my-4 w-full overflow-hidden rounded-lg border bg-[#08121b] leading-none ${isAnnotating ? 'ring-2 ring-ring ring-offset-2 ring-offset-card' : ''}`}
                            >
                              <img
                                className="block h-auto w-full object-contain"
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
                                onUpdate={updateAnnotation}
                                onRemove={removeAnnotation}
                                onTextPlaced={() => setAnnotationTool('select')}
                              />
                            </div>
                          </>
                        )}
                      {selectedFrameState === 'missing' && selectedFrames.length === 0 && (
                        <div className="mt-4 grid min-h-40 place-content-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                          <strong>No frame saved yet</strong>
                          <p>Pause the video at the problem, then use Save current frame.</p>
                        </div>
                      )}
                    </section>
                  </section>
                )}
                {recordingState !== 'ready' && screenshotState === 'ready' && screenshotUrl && (
                  <>
                    <p className="mb-2 font-mono text-xs font-semibold text-muted-foreground uppercase">
                      Screenshot captured instead
                    </p>
                    <img
                      src={screenshotUrl}
                      alt={`Captured page: ${session.page?.title || 'untitled page'}`}
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => downloadBlobFromUrl(screenshotUrl, `${exportBase}.png`)}
                      >
                        Download screenshot.png
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        type="button"
                        onClick={() => void removeScreenshot()}
                        disabled={busy}
                      >
                        Remove screenshot
                      </Button>
                    </div>
                  </>
                )}
                {recordingState !== 'ready' &&
                  selectedFrameState !== 'ready' &&
                  screenshotState !== 'ready' && (
                    <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                      {session.page?.recordingError ||
                        session.page?.screenshotError ||
                        'No visual recording is included in this report.'}{' '}
                      The Markdown report is still available.
                    </p>
                  )}
              </article>

              <section
                id="console-evidence-panel"
                className="min-w-0"
                role="tabpanel"
                aria-labelledby="console-evidence-tab"
                hidden={evidenceView !== 'console'}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Console evidence</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Review messages recorded from the page. Remove anything you do not want to
                      include.
                    </p>
                    {consoleAnnotationCount > 0 && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {consoleAnnotationCount} visual{' '}
                        {consoleAnnotationCount === 1 ? 'annotation' : 'annotations'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
                    <p>
                      {session.filtering.redactionCount} sensitive value
                      {session.filtering.redactionCount === 1 ? '' : 's'} redacted locally
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={downloadConsoleEvidence}
                      disabled={session.diagnostics.length === 0 || reviewActionsDisabled}
                    >
                      <HugeiconsIcon icon={Download01Icon} aria-hidden="true" />
                      Download console
                    </Button>
                    {!annotatingEvidence && (
                      <Button
                        variant="outline"
                        size="sm"
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
                        <HugeiconsIcon icon={Edit02Icon} />
                        {consoleAnnotationCount > 0 ? 'Edit annotations' : 'Annotate'}
                      </Button>
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
                    onUpdateAnnotation={updateEvidenceAnnotation}
                    onRemoveAnnotation={removeEvidenceAnnotation}
                    onTextPlaced={() => setEvidenceAnnotationTool('select')}
                    onRemove={removeDiagnostic}
                  />
                )}
              </section>

              <section
                id="network-evidence-panel"
                className="min-w-0"
                role="tabpanel"
                aria-labelledby="network-evidence-tab"
                hidden={evidenceView !== 'network'}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">Network evidence</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Review requests recorded from the page. Remove anything you do not want to
                      include.
                    </p>
                    {networkAnnotationCount > 0 && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {networkAnnotationCount} visual{' '}
                        {networkAnnotationCount === 1 ? 'annotation' : 'annotations'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
                    <p>
                      {session.filtering.redactionCount} sensitive value
                      {session.filtering.redactionCount === 1 ? '' : 's'} redacted locally
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={downloadNetworkEvidence}
                      disabled={session.network.length === 0 || reviewActionsDisabled}
                    >
                      <HugeiconsIcon icon={Download01Icon} aria-hidden="true" />
                      Download network
                    </Button>
                    {!annotatingEvidence && (
                      <Button
                        variant="outline"
                        size="sm"
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
                        <HugeiconsIcon icon={Edit02Icon} />
                        {networkAnnotationCount > 0 ? 'Edit annotations' : 'Annotate'}
                      </Button>
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
                    onUpdateAnnotation={updateEvidenceAnnotation}
                    onRemoveAnnotation={removeEvidenceAnnotation}
                    onTextPlaced={() => setEvidenceAnnotationTool('select')}
                    onRemove={removeNetworkEvent}
                  />
                )}
              </section>
            </Tabs>
          </section>
          <section
            className={`rounded-xl border bg-card p-6 ${reviewStage === 'export' ? '' : 'hidden'}`}
            aria-labelledby="export-check-title"
          >
            <div className="mb-6 border-b pb-4">
              <h2 id="export-check-title" className="text-xl font-semibold tracking-tight">
                Choose files to download
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Check what will be included, then use Download as ZIP above to save the report.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <Table aria-label="Export manifest">
                <TableBody>
                  {[
                    ['Issue report', 'issue.md', true],
                    ['Screen recording', 'recording.webm', recordingState === 'ready'],
                    [
                      'Selected frames',
                      selectedFrames.length
                        ? `${selectedFrames.length} PNG ${selectedFrames.length === 1 ? 'file' : 'files'}`
                        : 'No selected frames',
                      selectedFrames.length > 0,
                    ],
                    ['Console evidence', 'console.json', session.diagnostics.length > 0],
                    ['Network evidence', 'network.har', session.network.length > 0],
                  ].map(([label, detail, included]) => (
                    <TableRow key={String(label)}>
                      <TableCell className="grid gap-0.5 font-medium">
                        {label}
                        <span className="font-mono text-[10px] font-normal text-muted-foreground">
                          {detail}
                        </span>
                      </TableCell>
                      <TableCell className="w-px text-right">
                        <Badge
                          variant={included ? 'default' : 'secondary'}
                          className={
                            included ? 'bg-success text-success-foreground hover:bg-success' : ''
                          }
                        >
                          {included ? 'Included' : 'Not included'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Files marked Not included were not captured or were removed during review.
            </p>
          </section>
        </div>
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 py-3 text-sm text-muted-foreground backdrop-blur">
        <div className="mx-auto flex max-w-[1575px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6">
          <p aria-live="polite">
            {notice || 'Export creates local files only. You choose whether to publish them.'}
          </p>
          <p className="flex shrink-0 items-center gap-2 font-mono text-[10px] font-semibold tracking-wide uppercase">
            <span className="size-2 rounded-full bg-success-foreground" aria-hidden="true" />
            Report stays local
          </p>
        </div>
      </footer>
      {error && (
        <Alert
          variant="destructive"
          className="fixed right-6 bottom-16 z-50 max-w-md bg-card shadow-xl"
        >
          <AlertTitle>Couldn’t complete that action</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
  onUpdateAnnotation: (annotation: Annotation) => void;
  onRemoveAnnotation: (id: string) => void;
  onTextPlaced: () => void;
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
  onUpdateAnnotation,
  onRemoveAnnotation,
  onTextPlaced,
  onRemove,
}: ConsoleEvidenceWindowProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all-types');
  const types = [
    ...new Set([
      'log',
      'info',
      'warn',
      'error',
      'debug',
      'table',
      'trace',
      ...events.map((event) => event.consoleType ?? event.level),
      ...(typeFilter === 'all-types' ? [] : [typeFilter]),
    ]),
  ];
  const query = search.trim().toLowerCase();
  const visibleEvents = events.filter(
    (event) =>
      (typeFilter === 'all-types' || (event.consoleType ?? event.level) === typeFilter) &&
      event.message.toLowerCase().includes(query),
  );
  return (
    <div className="overflow-hidden rounded-xl border bg-[#08121b] text-[#f6f1e8]">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <FieldLabel htmlFor="console-type-filter">Type</FieldLabel>
          <Select value={typeFilter} onValueChange={setTypeFilter} disabled={annotationEditing}>
            <SelectTrigger id="console-type-filter" className="min-w-36" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-types">All types</SelectItem>
              {types.map((type) => (
                <SelectItem key={type} value={type}>
                  console.{type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="search"
          aria-label="Search console messages"
          placeholder="Search console messages…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={annotationEditing}
          className="h-9 min-w-0 flex-1 basis-56"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch('')}
            disabled={annotationEditing}
          >
            Clear console search
          </Button>
        )}
        <span className="text-xs text-muted-foreground" role="status">
          Showing {visibleEvents.length} of {events.length} messages
        </span>
      </div>
      <div
        className={`relative min-h-80 ${annotationEditing ? 'ring-2 ring-inset ring-ring' : ''}`}
      >
        <div className="min-h-80">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3 [&>span]:size-2.5 [&>span]:rounded-full [&>span]:bg-white/20 [&>b]:ml-auto [&>b]:font-mono [&>b]:text-[10px] [&>b]:text-white/60">
            <span />
            <span />
            <span />
            <b>{events.length} captured</b>
          </div>
          {visibleEvents.length ? (
            visibleEvents.map((event) => (
              <div
                className="grid grid-cols-[6rem_1fr_auto] gap-3 border-b border-white/10 px-4 py-3 text-xs [&_time]:font-mono [&_time]:text-white/50 [&_code]:whitespace-pre-wrap [&_code]:break-words"
                key={event.id}
              >
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
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-destructive hover:text-destructive"
                  type="button"
                  aria-label="Remove console entry"
                  onClick={() => void onRemove(event.id)}
                  disabled={busy}
                >
                  Remove
                </Button>
              </div>
            ))
          ) : (
            <div className="space-y-3 p-10 text-center text-sm text-muted-foreground">
              <p>
                {typeFilter !== 'all-types'
                  ? 'No console messages match your type and search filters.'
                  : query
                    ? 'No console messages match your search.'
                    : 'No console messages were recorded. Continue with the visual or network evidence.'}
              </p>
              {(query || typeFilter !== 'all-types') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTypeFilter('all-types');
                    setSearch('');
                  }}
                >
                  Clear console filters
                </Button>
              )}
            </div>
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
          onUpdate={onUpdateAnnotation}
          onRemove={onRemoveAnnotation}
          onTextPlaced={onTextPlaced}
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
  onUpdateAnnotation,
  onRemoveAnnotation,
  onTextPlaced,
  onRemove,
}: NetworkEvidenceWindowProps) {
  const [methodFilter, setMethodFilter] = useState('all-methods');
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const methods = [
    ...new Set([
      ...events.map((event) => event.method),
      ...(methodFilter === 'all-methods' ? [] : [methodFilter]),
    ]),
  ].sort();
  const visibleEvents = events.filter(
    (event) =>
      (methodFilter === 'all-methods' || event.method === methodFilter) &&
      event.url.toLowerCase().includes(query),
  );
  const apiEvents = visibleEvents.filter((event) =>
    ['fetch', 'xmlhttprequest'].includes(event.resourceType),
  );
  const pageResources = visibleEvents.filter(
    (event) => !['fetch', 'xmlhttprequest'].includes(event.resourceType),
  );
  const orderedEvents = [...apiEvents, ...pageResources];

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <FieldLabel htmlFor="network-method-filter">Method</FieldLabel>
          <Select value={methodFilter} onValueChange={setMethodFilter} disabled={annotationEditing}>
            <SelectTrigger id="network-method-filter" className="min-w-36" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-methods">All methods</SelectItem>
              {methods.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="search"
          aria-label="Search network requests"
          placeholder="Search API name or URL…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={annotationEditing}
          className="h-9 min-w-0 flex-1 basis-56"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch('')}
            disabled={annotationEditing}
          >
            Clear network search
          </Button>
        )}
        <span className="text-xs text-muted-foreground" role="status">
          Showing {visibleEvents.length} of {events.length} requests
        </span>
      </div>
      <div
        className={`relative min-h-80 ${annotationEditing ? 'ring-2 ring-inset ring-ring' : ''}`}
      >
        <div className="min-h-80">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-3 text-sm [&>span]:text-xs [&>span]:text-muted-foreground">
            <strong>
              {apiEvents.length} API {apiEvents.length === 1 ? 'call' : 'calls'} ·{' '}
              {pageResources.length} page {pageResources.length === 1 ? 'resource' : 'resources'}
            </strong>
            <span>API calls appear first</span>
          </div>
          {visibleEvents.length ? (
            orderedEvents.map((event) => {
              const status = String(event.status ?? 'FAILED');
              const duration = `${Math.round(event.durationMs)} ms`;
              return (
                <Collapsible asChild key={event.id}>
                  <article className="m-3 rounded-lg border bg-background/30">
                    <div className="flex items-start gap-2 p-2">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="group h-auto min-w-0 flex-1 justify-start gap-3 p-2 text-left hover:bg-muted/60"
                          type="button"
                          aria-label={`Request and response for ${event.method} ${event.url}`}
                          disabled={busy}
                        >
                          <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            className="size-4 shrink-0 -rotate-90 transition-transform group-data-[state=open]:rotate-0"
                            aria-hidden="true"
                          />
                          <span className="grid min-w-0 flex-1 grid-cols-[auto_auto_1fr] items-center gap-x-3 gap-y-2">
                            <span className="w-fit rounded bg-secondary px-2 py-1 font-mono text-xs font-semibold">
                              <AnnotatedEvidenceText
                                value={event.method}
                                source="network"
                                eventId={event.id}
                                field="method"
                                annotations={textAnnotations}
                              />
                            </span>
                            <span
                              className={`w-fit rounded-full px-2 py-1 font-mono text-[10px] font-semibold ${event.error || (event.status ?? 0) >= 400 ? 'bg-destructive/10 text-destructive' : 'bg-success text-success-foreground'}`}
                            >
                              <AnnotatedEvidenceText
                                value={status}
                                source="network"
                                eventId={event.id}
                                field="status"
                                annotations={textAnnotations}
                              />
                            </span>
                            <time className="text-xs text-muted-foreground">
                              <AnnotatedEvidenceText
                                value={duration}
                                source="network"
                                eventId={event.id}
                                field="duration"
                                annotations={textAnnotations}
                              />
                            </time>
                            <code className="col-span-3 block min-w-0 break-all font-mono text-xs text-muted-foreground">
                              <AnnotatedEvidenceText
                                value={event.url}
                                source="network"
                                eventId={event.id}
                                field="url"
                                annotations={textAnnotations}
                              />
                            </code>
                          </span>
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="mt-1 text-destructive hover:text-destructive"
                        type="button"
                        aria-label="Remove network entry"
                        onClick={() => void onRemove(event.id)}
                        disabled={busy}
                      >
                        Remove
                      </Button>
                    </div>
                    <CollapsibleContent className="border-t px-4 pb-4">
                      <Tabs defaultValue="request" className="mt-3 gap-3">
                        <TabsList
                          variant="line"
                          aria-label={`Request and response details for ${event.method} ${event.url}`}
                        >
                          <TabsTrigger value="request">Request</TabsTrigger>
                          <TabsTrigger value="response">Response</TabsTrigger>
                        </TabsList>
                        <TabsContent value="request">
                          {event.requestBody ? (
                            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 font-mono text-xs leading-5">
                              <AnnotatedEvidenceText
                                value={event.requestBody}
                                source="network"
                                eventId={event.id}
                                field="requestBody"
                                annotations={textAnnotations}
                              />
                            </pre>
                          ) : (
                            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                              No request payload was recorded.
                            </p>
                          )}
                        </TabsContent>
                        <TabsContent value="response" className="space-y-3">
                          {event.responseBody ? (
                            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 font-mono text-xs leading-5">
                              <AnnotatedEvidenceText
                                value={event.responseBody}
                                source="network"
                                eventId={event.id}
                                field="responseBody"
                                annotations={textAnnotations}
                              />
                            </pre>
                          ) : (
                            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                              No response body was recorded.
                            </p>
                          )}
                          {event.error && (
                            <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                              <strong>Request error</strong>
                              <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words font-mono leading-5">
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
                        </TabsContent>
                      </Tabs>
                    </CollapsibleContent>
                  </article>
                </Collapsible>
              );
            })
          ) : (
            <div className="space-y-3 p-10 text-center text-sm text-muted-foreground">
              <p>
                {query
                  ? 'No requests match your search and method filter.'
                  : methodFilter === 'all-methods'
                    ? 'No network requests were recorded. Continue with the visual or console evidence.'
                    : `No ${methodFilter} requests to show.`}
              </p>
              {(query || methodFilter !== 'all-methods') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMethodFilter('all-methods');
                    setSearch('');
                  }}
                >
                  {query ? 'Clear filters' : 'Show all methods'}
                </Button>
              )}
            </div>
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
          onUpdate={onUpdateAnnotation}
          onRemove={onRemoveAnnotation}
          onTextPlaced={onTextPlaced}
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

async function getAnnotationNoteError(document: AnnotationDocument): Promise<string> {
  for (const annotation of document.items) {
    if (annotation.kind !== 'text' || !annotation.text.trim()) continue;
    const error = await getOffensiveLanguageError(annotation.text);
    if (error) return error;
  }
  return '';
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
  if (recordingUrl && session.page?.recording) {
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
  if (!session.page?.recording && screenshotUrl && session.page?.screenshotBlobId) {
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
