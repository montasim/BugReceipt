import { SiteShell } from './site-shell';

const captureGuide = [
  [
    'Install and open the side panel',
    'Add BugReceipt from the Chrome Web Store and pin it to the toolbar. Click the icon on any regular HTTP or HTTPS page to open the persistent side panel.',
    [
      'Works on Chrome desktop 125 and newer. Chrome settings pages and other restricted pages cannot be captured.',
      'Use the theme toggle in the panel header to switch between light and dark.',
      'No account, sign-in, or configuration is needed.',
    ],
    {
      src: '/guide/01-side-panel.png',
      alt: 'BugReceipt side panel in light mode, ready to record, with the three-step overview and the Choose tab to record button',
    },
  ],
  [
    'Start a capture',
    'Select Choose tab to record. In Chrome’s share dialog, pick the tab where the problem happens. Nothing is recorded until you confirm.',
    [
      'Start before you reproduce the bug: console and network events from earlier cannot be recovered.',
      'Only one capture can be active at a time. Review or discard the existing capture before starting another.',
      'Recording is video only, with no microphone or tab audio. If recording is unavailable, BugReceipt keeps a final screenshot instead.',
    ],
    {
      src: '/guide/02-choose-tab.png',
      alt: 'BugReceipt side panel start screen with the Choose tab to record button',
    },
  ],
  [
    'Reproduce the problem and add steps',
    'Use the page normally while the panel counts recorded steps, console messages, and network requests. Type each action you take and press Ctrl or Command + Enter to add it.',
    [
      'A same-origin reload stays in the session. Leaving the recorded site or closing the tab ends capture and records why it stopped.',
      'Use Return to recorded tab if you switch tabs while recording continues.',
      'Capture pauses with an Evidence limit reached notice when the bounded diagnostic buffer fills.',
    ],
    {
      src: '/guide/03-recording.png',
      alt: 'BugReceipt side panel recording the selected tab, showing the timer, captured evidence count, three recorded steps, and the Stop & review button',
    },
  ],
  [
    'Stop and open the review workbench',
    'Select Stop & review. The review page opens with three stages: Report details, Review evidence, and Choose files. Edits are saved when you change sections or download.',
    [
      'The panel warns when evidence is incomplete, for example after an interrupted recording or a cancelled debugger banner.',
      'Reopen an unfinished capture later with Review existing capture.',
    ],
    {
      src: '/guide/04-ready-for-review.png',
      alt: 'BugReceipt side panel showing a capture waiting for review with counts of steps, console messages, network requests, and the screen recording',
    },
  ],
  [
    'Write the report details',
    'Give the issue a title, then fill in the optional description, expected behavior, current behavior, and steps to reproduce. Recorded steps are pre-filled, one per line.',
    [
      'Required fields and flagged wording are highlighted before export can continue.',
      'The report records page URL and title, capture time, operating system, browser, and user agent automatically.',
    ],
    {
      src: '/guide/05-report-details.png',
      alt: 'Report details stage of the review page with issue title, description, steps, current and expected behavior, and page and browser context',
    },
  ],
  [
    'Curate visual evidence',
    'Play the WebM recording, pause at the moment of failure, and select Save current frame. Up to 20 frames can be saved per capture.',
    [
      'Annotate a frame with select, marker, highlight, border, and text-note tools, plus color and line-width options.',
      'Download any annotated frame as a PNG, or remove individual frames and the recording from the export.',
      'Recordings show everything that was on screen, so check them for sensitive content before sharing.',
    ],
    {
      src: '/guide/06-visual-evidence.png',
      alt: 'Visual evidence tab with the screen recording of the checkout page and Download video and Remove video actions',
    },
  ],
  [
    'Inspect console evidence',
    'Review logs, warnings, errors, uncaught exceptions, and rejected promises collected after recording started.',
    [
      'Search messages and filter by type to find the relevant entry quickly.',
      'Highlight exact text with annotations so the developer sees the line that matters.',
      'Remove entries you do not want shared; an Undo toast restores them. Download console evidence as JSON separately if needed.',
    ],
    {
      src: '/guide/07-console-evidence.png',
      alt: 'Console evidence tab listing captured messages with type filter, search, redaction count, and per-entry Remove actions',
    },
  ],
  [
    'Inspect network evidence',
    'Review fetch, XHR, and page-resource requests with method, status, duration, and a filtered URL. API calls appear first.',
    [
      'Filter by HTTP method and search by API name or URL.',
      'Open a request to see request headers with credentials redacted, plus bounded text or JSON bodies. Switch between formatted JSON and raw text; annotate raw text.',
      'Remove entries before export, or download the filtered network evidence as a HAR file.',
    ],
    {
      src: '/guide/08-network-evidence.png',
      alt: 'Network evidence tab with a failed POST request expanded to its JSON response, with Request, Response, and Request headers tabs',
    },
  ],
  [
    'Choose files and export',
    'The export manifest lists issue.md, recording.webm, selected-frame PNGs, console.json, and network.har, and shows which are included. Select Download as ZIP to save the bundle under Chrome Downloads.',
    [
      'The Markdown report is GitHub-ready, but BugReceipt never creates or submits an issue for you.',
      'Delete this capture permanently removes the session and its evidence from extension storage.',
    ],
    {
      src: '/guide/09-choose-files.png',
      alt: 'Choose files stage listing issue.md, recording.webm, selected frames, console.json, and network.har with Included or Not included badges',
    },
  ],
] as const;

const correctionGuide = [
  [
    'Select the wording on the page',
    'Highlight the exact text that reads wrong, from a single word to a full sentence, on any regular HTTP or HTTPS page. No capture needs to be running.',
    [
      'One selection becomes one correction. Keep it to a single passage so the developer can find it.',
      'Selected text is read from the page itself; text inside form fields is not captured.',
    ],
    {
      src: '/guide/11-select-text.png',
      alt: 'Checkout page with the sentence under the heading highlighted as a text selection',
    },
  ],
  [
    'Right-click and choose Suggest a correction',
    'Right-click the highlighted text and pick Suggest a correction from Chrome’s context menu. BugReceipt opens the side panel with the selection already filled in as the original text.',
    [
      'The original text is read-only, with the page title shown underneath it.',
      'The source locale is detected from the page language when available and stays editable.',
      'A screenshot of the visible viewport with the selection marked is stored locally for the export.',
    ],
    {
      src: '/guide/12-correction-opened.png',
      alt: 'BugReceipt side panel just opened from the context menu, showing the selected sentence as original text and an empty suggested text field',
    },
  ],
  [
    'Enter the suggested wording',
    'Type the corrected text in Suggested text and adjust the source and target locale if needed. The draft stays in the panel while you keep working on the page.',
    [
      'The suggestion has to differ from the original text before it can be exported.',
      'Flagged wording is highlighted under the field and blocks export until it is revised.',
    ],
    {
      src: '/guide/13-correction-suggestion.png',
      alt: 'BugReceipt side panel with original text, a suggested replacement, and source and target locale set to en',
    },
  ],
  [
    'Collect more corrections from the same page',
    'Select the next passage, right-click, and choose Suggest a correction again. Each selection is added to the batch, and numbered chips at the top switch between them.',
    [
      'Switching chips saves the current draft. A check mark shows a correction that already has suggested text; a red number still needs one.',
      'A batch holds up to 20 corrections from one site. Finish or discard it before collecting on another site.',
    ],
    {
      src: '/guide/14-correction-batch.png',
      alt: 'BugReceipt side panel with two correction chips, both checked, showing the second correction Discount code to Promo code',
    },
  ],
  [
    'Check the screenshot and export',
    'Scroll down in the panel to review the stored screenshot, then select Export corrections. A ZIP with corrections.json and one PNG per correction is saved under Chrome Downloads.',
    [
      'Every correction in the batch needs suggested text before the export runs.',
      'The screenshot shows everything that was on screen, so review it before sharing the ZIP. Nothing is uploaded.',
      'Discard clears the batch and its screenshots from extension storage.',
    ],
    {
      src: '/guide/15-correction-export.png',
      alt: 'BugReceipt side panel scrolled to the screenshot preview of the page with the Export corrections and Discard buttons',
    },
  ],
] as const;

type GuideStep = (typeof captureGuide)[number] | (typeof correctionGuide)[number];

function GuideSteps({ steps, idPrefix }: { steps: readonly GuideStep[]; idPrefix: string }) {
  return (
    <ol className="guide-list">
      {steps.map(([title, description, details, image], index) => (
        <li key={title} id={`${idPrefix}-${index + 1}`}>
          <div className="guide-copy">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{title}</h3>
            <p>{description}</p>
            <ul>
              {details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </div>
          <figure className="guide-figure">
            <img src={image.src} alt={image.alt} loading="lazy" />
          </figure>
        </li>
      ))}
    </ol>
  );
}

export function GuidePage() {
  return (
    <SiteShell>
      <main id="top">
        <section className="clean-shell content-section guide-section" id="capture">
          <div className="section-heading">
            <p className="eyebrow">User guide · Part 1</p>
            <h2>Capture and report a bug.</h2>
            <p>
              From installing the extension to the exported report, this part walks through each
              screen and what you can do on it. Part 2 covers{' '}
              <a href="#corrections">text corrections</a>.
            </p>
          </div>
          <GuideSteps steps={captureGuide} idPrefix="step" />
        </section>
        <section className="clean-shell content-section guide-section" id="corrections">
          <div className="section-heading">
            <p className="eyebrow">User guide · Part 2</p>
            <h2>Suggest a text correction.</h2>
            <p>
              Report wrong wording or translations without a full bug capture: select the text, send
              it to the side panel, add the suggestion, and export the batch.
            </p>
          </div>
          <GuideSteps steps={correctionGuide} idPrefix="correction" />
        </section>
      </main>
    </SiteShell>
  );
}
