import type { CaptureSession } from '@bugreceipt/capture-model';
import {
  Add01Icon,
  Alert01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  LinkSquare02Icon,
  RefreshCcwIcon,
  StopIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { FormEvent } from 'react';
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
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '../../components/ui/field';
import { Separator } from '../../components/ui/separator';
import { Skeleton } from '../../components/ui/skeleton';
import { Spinner } from '../../components/ui/spinner';
import { Textarea } from '../../components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import { Brand } from '../brand';
import { SupportLink } from '../support-link';
import {
  formatRecordingDuration,
  getInterruptionCopy,
  useCaptureWorkflow,
} from './use-capture-workflow';

export function SidePanelApp() {
  const workflow = useCaptureWorkflow();
  const interruptionCopy = workflow.session
    ? getInterruptionCopy(workflow.session.endReason)
    : null;

  return (
    <TooltipProvider>
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-background">
        <header className="flex h-16 shrink-0 items-center border-b px-5">
          <Brand showVersion={false} />
          <SupportLink />
        </header>

        <div className="flex flex-1 flex-col gap-5 px-5 py-5">
          {workflow.error ? (
            <StatusAlert
              title={getErrorTitle(workflow.error)}
              detail={workflow.error}
              retry={workflow.session ? undefined : workflow.start}
              busy={workflow.busy}
            />
          ) : null}

          {workflow.session?.captureWarnings?.map((warning) => (
            <StatusAlert
              key={warning}
              title="Evidence recording interrupted"
              detail={warning}
              busy={false}
              retry={undefined}
            />
          ))}
          {(workflow.session?.filtering.droppedEventCount ?? 0) > 0 && (
            <StatusAlert
              title="Evidence limit reached"
              detail="Some additional events or updates were omitted. Stop and start a new capture for a shorter reproduction."
              busy={false}
              retry={undefined}
            />
          )}

          {workflow.pendingAction === 'loading' && !workflow.session ? (
            <LoadingState />
          ) : workflow.session?.status === 'recording' ? (
            <RecordingState workflow={workflow} />
          ) : workflow.session?.status === 'ready-for-review' ? (
            <ReadyState workflow={workflow} interruptionCopy={interruptionCopy} />
          ) : (
            <StartState workflow={workflow} />
          )}
        </div>
      </main>
    </TooltipProvider>
  );
}

type Workflow = ReturnType<typeof useCaptureWorkflow>;

function LoadingState() {
  return (
    <section className="flex flex-1 flex-col gap-5" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Spinner />
        <span>Checking for an active capture…</span>
      </div>
      <Skeleton className="h-14 w-11/12 rounded-lg" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-10 w-36 rounded-md" />
    </section>
  );
}

function StartState({ workflow }: { workflow: Workflow }) {
  const pending = workflow.pendingAction;
  const isStarting = pending === 'starting' || pending === 'granting-access';

  return (
    <section className="flex flex-1 flex-col gap-5">
      {workflow.notice ? (
        <Alert className="border-success/35 bg-success text-success-foreground" role="status">
          <AlertTitle>Access granted</AlertTitle>
          <AlertDescription className="text-success-foreground/80">
            {workflow.notice}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2 pt-1">
        <h1 className="max-w-[18rem] text-[28px] leading-[1.02] font-semibold tracking-[-0.045em]">
          Ready to record <span className="text-primary">the problem?</span>
        </h1>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          Open the page where the problem happens, then choose that tab to begin.
        </p>
      </div>

      <CaptureGuide />

      <Button
        className="mt-auto w-fit"
        size="lg"
        type="button"
        onClick={() => void workflow.start()}
        disabled={workflow.busy}
        aria-busy={isStarting}
        aria-label={
          pending === 'granting-access'
            ? 'Requesting site access'
            : pending === 'starting'
              ? 'Starting capture'
              : undefined
        }
      >
        {isStarting ? <Spinner aria-hidden="true" /> : null}
        {pending === 'granting-access'
          ? 'Requesting access…'
          : pending === 'starting'
            ? 'Starting capture…'
            : workflow.hasSiteAccess
              ? 'Choose tab to record'
              : 'Allow access to this page'}
        {!isStarting ? <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" /> : null}
      </Button>
    </section>
  );
}

function CaptureGuide() {
  const steps = [
    ['01', 'Choose the affected tab', 'Select the browser page where the problem happens.'],
    ['02', 'Reproduce the problem', 'Use the page normally while BugReceipt records evidence.'],
    ['03', 'Stop and review', 'Check what was captured before downloading or sharing.'],
  ];

  return (
    <Card className="gap-0 py-0 shadow-none" aria-label="How capture works">
      <CardContent className="px-3 py-1">
        <ol>
          {steps.map(([index, title, detail], stepIndex) => (
            <li key={title}>
              {stepIndex > 0 ? <Separator /> : null}
              <div className="grid grid-cols-[2rem_1fr] gap-2 py-3">
                <span className="pt-0.5 font-mono text-[10px] text-muted-foreground">{index}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function EvidenceReceipt({ session }: { session?: CaptureSession }) {
  const rows = [
    ['01', 'Steps you recorded', session ? String(session.steps.length) : '—'],
    ['02', 'Console messages', session ? String(session.diagnostics.length) : '—'],
    ['03', 'Network requests', session ? String(session.network.length) : '—'],
    ['04', 'Screen recording', session?.page ? '1' : '—'],
  ];

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardContent className="px-3 py-1">
        <dl>
          {rows.map(([index, label, value], rowIndex) => (
            <div key={label}>
              {rowIndex > 0 ? <Separator /> : null}
              <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 py-3 text-sm">
                <dt className="contents">
                  <span className="font-mono text-[10px] text-muted-foreground">{index}</span>
                  <span className="font-medium">{label}</span>
                </dt>
                <dd className="font-mono text-xs text-muted-foreground">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function RecordingState({ workflow }: { workflow: Workflow }) {
  const session = workflow.session;
  if (!session || session.status !== 'recording') return null;
  const eventCount = session.diagnostics.length + session.network.length;

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <span
            className="size-2.5 shrink-0 animate-pulse rounded-full bg-destructive"
            aria-hidden="true"
          />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {workflow.recordingElsewhere
              ? 'Recording continues in another tab'
              : 'Recording the selected tab'}
          </p>
          <time
            className="ml-auto font-mono text-xl font-semibold tabular-nums"
            role="timer"
            aria-label="Recording duration"
            dateTime={`PT${Math.floor(workflow.recordingElapsedMs / 1_000)}S`}
          >
            {formatRecordingDuration(workflow.recordingElapsedMs)}
          </time>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
          <p className="min-w-0 truncate text-sm text-muted-foreground" title={session.origin}>
            {session.origin}
          </p>
          <Badge className="shrink-0" variant="secondary">
            {eventCount} technical items
          </Badge>
        </div>
      </div>

      {workflow.recordingElsewhere ? (
        <OtherTabState workflow={workflow} />
      ) : (
        <>
          {session.page?.recordingError ? (
            <Alert className="border-warning/40 bg-warning text-warning-foreground" role="status">
              <HugeiconsIcon icon={Alert01Icon} aria-hidden="true" />
              <AlertTitle>Screen recording unavailable</AlertTitle>
              <AlertDescription className="text-warning-foreground/80">
                {session.page.recordingError}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex items-center justify-between text-sm font-medium">
            <span>Steps you performed</span>
            <span className="font-mono text-xs text-muted-foreground">
              {session.steps.length}/50
            </span>
          </div>

          {session.steps.length ? (
            <ol className="max-h-40 space-y-2 overflow-y-auto rounded-lg border bg-card p-3 text-sm">
              {session.steps.map((item, index) => (
                <li key={item.id} className="grid grid-cols-[1.5rem_1fr] gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ol>
          ) : null}

          <StepForm workflow={workflow} />

          <div className="mt-auto grid grid-cols-[1fr_auto] gap-2">
            <Button
              type="button"
              onClick={() => void workflow.stop()}
              disabled={workflow.busy}
              aria-busy={workflow.pendingAction === 'stopping'}
              aria-label={workflow.pendingAction === 'stopping' ? 'Preparing review' : undefined}
            >
              {workflow.pendingAction === 'stopping' ? (
                <Spinner aria-hidden="true" />
              ) : (
                <HugeiconsIcon icon={StopIcon} aria-hidden="true" />
              )}
              {workflow.pendingAction === 'stopping' ? 'Preparing review…' : 'Stop & review'}
            </Button>
            <DiscardCapture workflow={workflow} label="Discard" />
          </div>
        </>
      )}
    </section>
  );
}

function StepForm({ workflow }: { workflow: Workflow }) {
  function submit(event: FormEvent) {
    event.preventDefault();
    void workflow.addStep();
  }

  return (
    <form onSubmit={submit}>
      <Field className="gap-4" data-invalid={Boolean(workflow.stepModeration.error)}>
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor="step">Add a step you performed</FieldLabel>
          <span className="font-mono text-[10px] text-muted-foreground" id="step-character-count">
            {workflow.step.length}/1,000
          </span>
        </div>
        <Textarea
          className="max-h-[calc(6lh+1rem+2px)] overflow-y-auto"
          id="step"
          value={workflow.step}
          onChange={(event) => workflow.setStep(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || (!event.ctrlKey && !event.metaKey)) return;
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }}
          placeholder="Example: Clicked Save"
          maxLength={1_000}
          rows={3}
          aria-invalid={Boolean(workflow.stepModeration.error)}
          aria-busy={workflow.stepModeration.checking}
          aria-describedby={
            workflow.stepModeration.error
              ? 'step-character-count step-moderation-error'
              : 'step-character-count'
          }
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            {workflow.stepModeration.error ? (
              <FieldError id="step-moderation-error">{workflow.stepModeration.error}</FieldError>
            ) : (
              <FieldDescription>Press Ctrl or Command + Enter to add</FieldDescription>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={
              workflow.busy || !workflow.step.trim() || Boolean(workflow.stepModeration.error)
            }
            aria-busy={workflow.pendingAction === 'adding-step'}
            aria-label={workflow.pendingAction === 'adding-step' ? 'Adding step' : 'Add step'}
          >
            {workflow.pendingAction === 'adding-step' ? (
              <Spinner aria-hidden="true" />
            ) : (
              <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
            )}
            {workflow.pendingAction === 'adding-step' ? 'Adding…' : 'Add step'}
          </Button>
        </div>
      </Field>
    </form>
  );
}

function OtherTabState({ workflow }: { workflow: Workflow }) {
  return (
    <Card className="gap-4 border-warning/30 bg-warning py-5 shadow-none">
      <CardContent className="space-y-4 px-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Recording is active in another tab.
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Return to the recorded tab before adding steps or finishing the report.
          </p>
        </div>
        <div className="grid gap-2">
          <Button
            type="button"
            onClick={() => void workflow.returnToRecordedTab()}
            disabled={workflow.busy}
            aria-busy={workflow.pendingAction === 'returning'}
            aria-label={workflow.pendingAction === 'returning' ? 'Opening recorded tab' : undefined}
          >
            {workflow.pendingAction === 'returning' ? (
              <Spinner aria-hidden="true" />
            ) : (
              <HugeiconsIcon icon={LinkSquare02Icon} aria-hidden="true" />
            )}
            {workflow.pendingAction === 'returning' ? 'Opening tab…' : 'Return to recorded tab'}
          </Button>
          <DiscardCapture workflow={workflow} label="Discard capture" />
        </div>
      </CardContent>
    </Card>
  );
}

function ReadyState({
  workflow,
  interruptionCopy,
}: {
  workflow: Workflow;
  interruptionCopy: ReturnType<typeof getInterruptionCopy>;
}) {
  const session = workflow.session;
  if (!session) return null;

  return (
    <section className="flex flex-1 flex-col gap-5">
      <div className="space-y-2 pt-1">
        <Badge variant={interruptionCopy ? 'outline' : 'secondary'}>
          {interruptionCopy ? 'Capture interrupted' : 'Existing capture'}
        </Badge>
        <h1 className="text-[28px] leading-[1.05] font-semibold tracking-[-0.04em]">
          {interruptionCopy?.title ?? 'A capture is already waiting for review.'}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {interruptionCopy?.detail ??
            'Open it to review or download the report. To record something new, discard this capture first.'}
        </p>
      </div>

      <EvidenceReceipt session={session} />

      <div className="mt-auto grid grid-cols-1 gap-2">
        <Button
          type="button"
          onClick={() => void workflow.openReview()}
          disabled={workflow.busy}
          aria-busy={workflow.pendingAction === 'opening-review'}
          aria-label={workflow.pendingAction === 'opening-review' ? 'Opening review' : undefined}
        >
          {workflow.pendingAction === 'opening-review' ? <Spinner aria-hidden="true" /> : null}
          {workflow.pendingAction === 'opening-review' ? 'Opening…' : 'Review existing capture'}
          {workflow.pendingAction !== 'opening-review' ? (
            <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
          ) : null}
        </Button>
        <DiscardCapture workflow={workflow} label="Discard to start new" />
      </div>
    </section>
  );
}

function DiscardCapture({ workflow, label }: { workflow: Workflow; label: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" disabled={workflow.busy}>
          <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle>Discard this capture?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the recording, your steps, and all technical evidence from this
            device. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep capture</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => void workflow.discard()}
            aria-busy={workflow.pendingAction === 'discarding'}
          >
            <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" />
            Discard capture
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StatusAlert({
  title,
  detail,
  retry,
  busy,
}: {
  title: string;
  detail: string;
  retry: (() => Promise<void>) | undefined;
  busy: boolean;
}) {
  return (
    <Alert variant="destructive" className="grid-cols-[1rem_1fr_auto] bg-destructive/8">
      <HugeiconsIcon icon={Alert01Icon} aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="col-start-2">{detail}</AlertDescription>
      {retry ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="col-start-3 row-span-2 row-start-1 self-center"
              size="icon-sm"
              variant="ghost"
              type="button"
              onClick={() => void retry()}
              disabled={busy}
              aria-label="Retry"
            >
              <HugeiconsIcon icon={RefreshCcwIcon} aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Retry</TooltipContent>
        </Tooltip>
      ) : null}
    </Alert>
  );
}

function getErrorTitle(error: string) {
  if (error.includes('regular web pages')) return 'This page cannot be captured';
  if (error.includes('access')) return 'Chrome could not request access';
  if (error.includes('selected')) return 'No tab selected';
  return 'Capture needs attention';
}
