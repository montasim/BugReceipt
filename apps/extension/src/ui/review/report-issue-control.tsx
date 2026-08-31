import type { CaptureSession } from '@bugreceipt/capture-model';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { renderExtensionDiagnosisReport } from '../../application/extension-diagnosis';
import { sendReportEmail } from '../../infrastructure/report-email';
import { ActivityIndicator } from '../activity-indicator';
import { useOffensiveLanguageValidation } from '../use-offensive-language-validation';

interface ReportIssueControlProps {
  session: CaptureSession;
  emailConfigured: boolean;
  onSent: (diagnosisIncluded: boolean) => void;
}

export function ReportIssueControl({ session, emailConfigured, onSent }: ReportIssueControlProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [includeDiagnosis, setIncludeDiagnosis] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const subjectModeration = useOffensiveLanguageValidation(subject);
  const descriptionModeration = useOffensiveLanguageValidation(description);

  const resetForm = useCallback(() => {
    setSubject('');
    setDescription('');
    setIncludeDiagnosis(false);
    setSubmitted(false);
    setFormError('');
  }, []);

  const closeDialog = useCallback(() => {
    if (sending) return;
    setOpen(false);
    resetForm();
  }, [resetForm, sending]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    subjectRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!sending) closeDialog();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled)',
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [closeDialog, open, sending]);

  async function submitIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setFormError('');
    if (!subject.trim() || !description.trim() || !emailConfigured) return;
    const [subjectError, descriptionError] = await Promise.all([
      subjectModeration.validateNow(),
      descriptionModeration.validateNow(),
    ]);
    if (subjectError || descriptionError) return;

    setSending(true);
    try {
      await sendReportEmail({
        sessionId: session.id,
        subject: `Extension issue: ${subject.trim()}`,
        markdown: `# ${subject.trim()}\n\n${description.trim()}\n`,
        ...(includeDiagnosis ? { diagnosis: renderExtensionDiagnosisReport(session) } : {}),
      });
      onSent(includeDiagnosis);
      setOpen(false);
      resetForm();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'The issue email could not be sent.');
    } finally {
      setSending(false);
    }
  }

  const subjectError =
    subjectModeration.error || (submitted && !subject.trim() ? 'Enter a subject.' : '');
  const descriptionError =
    descriptionModeration.error ||
    (submitted && !description.trim() ? 'Describe the problem.' : '');

  return (
    <>
      <button className="report-issue-trigger" type="button" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 3h14v14H9l-4 4V3Z" />
          <path d="M12 7v5M12 15.5v.5" />
        </svg>
        Report an issue
      </button>

      {open ? (
        <div
          className="report-issue-layer"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            ref={dialogRef}
            className="report-issue-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-issue-title"
            aria-describedby="report-issue-intro"
          >
            <div className="report-issue-dialog-heading">
              <div>
                <h2 id="report-issue-title">Report an issue</h2>
                <p id="report-issue-intro">
                  Tell us what went wrong in BugReceipt. Nothing is sent until you choose Send
                  email.
                </p>
              </div>
              <button
                className="report-issue-close"
                type="button"
                aria-label="Close report issue form"
                onClick={closeDialog}
                disabled={sending}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="m5 5 10 10M15 5 5 15" />
                </svg>
              </button>
            </div>

            <form
              className="report-issue-form"
              noValidate
              onSubmit={(event) => void submitIssue(event)}
            >
              <div className="report-issue-field">
                <label htmlFor="extension-issue-subject">Subject</label>
                <input
                  ref={subjectRef}
                  id="extension-issue-subject"
                  value={subject}
                  maxLength={200}
                  required
                  aria-invalid={Boolean(subjectError)}
                  aria-busy={subjectModeration.checking}
                  aria-describedby={subjectError ? 'extension-issue-subject-error' : undefined}
                  onChange={(event) => setSubject(event.target.value)}
                />
                {subjectError ? (
                  <p
                    id="extension-issue-subject-error"
                    className="field-validation-error"
                    role="status"
                  >
                    {subjectError}
                  </p>
                ) : null}
              </div>

              <div className="report-issue-field">
                <label htmlFor="extension-issue-description">Description</label>
                <textarea
                  id="extension-issue-description"
                  value={description}
                  maxLength={4_000}
                  rows={7}
                  required
                  aria-invalid={Boolean(descriptionError)}
                  aria-busy={descriptionModeration.checking}
                  aria-describedby={
                    descriptionError ? 'extension-issue-description-error' : undefined
                  }
                  placeholder="What happened, and what did you expect instead?"
                  onChange={(event) => setDescription(event.target.value)}
                />
                {descriptionError ? (
                  <p
                    id="extension-issue-description-error"
                    className="field-validation-error"
                    role="status"
                  >
                    {descriptionError}
                  </p>
                ) : null}
              </div>

              <label className="diagnosis-consent" htmlFor="include-extension-diagnosis">
                <input
                  id="include-extension-diagnosis"
                  type="checkbox"
                  checked={includeDiagnosis}
                  aria-describedby="diagnosis-consent-description"
                  onChange={(event) => setIncludeDiagnosis(event.target.checked)}
                />
                <span>
                  <strong>Include diagnosis report</strong>
                  <small id="diagnosis-consent-description">
                    Attaches version, capture state, page and browser details, evidence counts, and
                    locally filtered console and network metadata. Visual evidence and network
                    bodies are excluded.
                  </small>
                </span>
              </label>

              {!emailConfigured ? (
                <p className="report-issue-configuration" role="status">
                  Email delivery is unavailable in this extension build.
                </p>
              ) : null}
              {formError ? (
                <p className="report-issue-error" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="report-issue-actions">
                <button
                  className="button quiet"
                  type="button"
                  onClick={closeDialog}
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  className="button primary email-action"
                  type="submit"
                  aria-busy={sending}
                  aria-label={sending ? 'Sending issue by email' : undefined}
                  disabled={
                    sending ||
                    !emailConfigured ||
                    subjectModeration.checking ||
                    descriptionModeration.checking ||
                    Boolean(subjectModeration.error) ||
                    Boolean(descriptionModeration.error)
                  }
                >
                  {sending ? <ActivityIndicator /> : null}
                  {sending ? 'Sending…' : 'Send email'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
