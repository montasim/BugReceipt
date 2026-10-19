export const hero = {
  title: 'Bug reports developers can reproduce.',
  lead: 'BugReceipt records the Chrome tab you are testing, keeps the console and network evidence with your steps, and exports a report you review first. Nothing leaves your machine until you share it.',
  finePrint: 'Chrome desktop 125 and newer · Free · No account',
  scene: {
    page: {
      src: '/guide/hero-page.png',
      width: 1800,
      height: 1520,
      alt: 'Demo checkout page showing the error “We couldn’t place your order”',
    },
    panel: {
      src: '/guide/03-recording.png',
      width: 880,
      height: 1520,
      alt: 'BugReceipt side panel recording the tab, with three steps typed by the tester',
    },
    caption:
      'A real capture: the demo checkout failing on the left, the BugReceipt side panel recording it on the right.',
  },
} as const;

export const steps = [
  {
    title: 'Choose the tab',
    body: 'Open the side panel on the page where the problem happens and select Choose tab to record. Nothing is recorded until you confirm the tab in Chrome’s share dialog.',
    image: {
      src: '/guide/01-side-panel.png',
      width: 880,
      height: 1520,
      alt: 'BugReceipt side panel ready to record',
    },
  },
  {
    title: 'Reproduce and add steps',
    body: 'Use the page normally. The panel counts console messages and requests as they happen; type each action you take so the report carries human steps next to the evidence.',
    image: {
      src: '/guide/03-recording.png',
      width: 880,
      height: 1520,
      alt: 'BugReceipt side panel recording with three recorded steps',
    },
  },
  {
    title: 'Stop and review',
    body: 'Stop & review opens the workbench. Finish the report, remove anything private from the evidence, then download one ZIP.',
    image: {
      src: '/guide/05-report-details.png',
      width: 2880,
      height: 1800,
      alt: 'BugReceipt review page with the report details stage',
    },
  },
] as const;

export const demoVideo = {
  src: 'https://www.youtube-nocookie.com/embed/BVdi7FF21Sg?rel=0',
  title: 'BugReceipt product demo',
  caption: 'The 45-second demo follows one capture from the failing page to the downloaded report.',
} as const;

export const evidenceTabs = [
  {
    id: 'visual',
    label: 'Visual',
    title: 'Play the recording, keep the frames that matter',
    body: 'The WebM recording of the selected tab plays inside the review. Pause on the failure, save up to 20 frames, and annotate them with marker, highlight, border, and notes. Remove the video or any frame before export.',
    image: {
      src: '/guide/06-visual-evidence.png',
      width: 2880,
      height: 1800,
      alt: 'Visual evidence tab with the screen recording of the checkout page',
    },
  },
  {
    id: 'console',
    label: 'Console',
    title: 'Every message since recording started',
    body: 'Logs, warnings, errors, uncaught exceptions, and rejected promises, each with a timestamp. Search, filter by type, highlight the exact text the developer should read, and remove entries you do not want to share. The count of sensitive values redacted locally is shown above the list.',
    image: {
      src: '/guide/07-console-evidence.png',
      width: 2880,
      height: 1800,
      alt: 'Console evidence tab listing seven captured messages',
    },
  },
  {
    id: 'network',
    label: 'Network',
    title: 'The failing request, with its body',
    body: 'Fetch, XHR, and page resources with method, status, and timing. API calls come first. Open a request to read its headers with credentials redacted and its request and response bodies as formatted JSON or raw text.',
    image: {
      src: '/guide/08-network-evidence.png',
      width: 2880,
      height: 1800,
      alt: 'Network evidence tab with a failed POST request expanded to its JSON response',
    },
  },
] as const;

export const deliverables = {
  title: 'What the developer gets',
  lead: 'One ZIP under Chrome Downloads. The report is GitHub-ready Markdown; the evidence files sit beside it.',
  paragraphs: [
    'issue.md carries the title, description, numbered steps, expected and current behavior, the page and browser context, and the console and network excerpts you kept.',
    'console.json and network.har hold the full filtered diagnostics for tools that read them. Console and network evidence can also be downloaded on their own from the review.',
    'recording.webm and selected-frame PNGs carry the visual proof. Annotated frames are rendered into the PNG.',
    'BugReceipt does not open or submit a GitHub issue for you. You attach what you reviewed.',
  ],
  receiptCaption: 'The issue.md from the capture above, rendered as the developer receives it.',
} as const;

export const privacyColumns = [
  {
    title: 'Captured after you start',
    items: [
      'Video of the selected tab, without audio',
      'Console messages and exceptions',
      'Requests with status, timing, headers, and bodies',
      'Your reproduction steps',
      'Page URL and title, browser, platform',
    ],
  },
  {
    title: 'Filtered before storage',
    items: [
      'URL query strings',
      'Email addresses',
      'Bearer tokens and secret-shaped values',
      'Recognized sensitive request headers',
      'Oversized or binary bodies are bounded or omitted',
    ],
  },
  {
    title: 'Never read',
    items: [
      'Cookies and browser storage',
      'Page HTML or DOM snapshots',
      'Form values and keystrokes',
      'Clipboard contents',
      'Microphone or tab audio',
    ],
  },
] as const;

export const privacyFootnote =
  'Filtering reduces risk; it does not recognize every secret. Recordings and screenshots show whatever was on screen, so review the evidence before you share it.';

export const corrections = {
  title: 'Wrong wording? Send that too.',
  body: 'Select text on any page, right-click, and choose Suggest a correction. The side panel keeps the original text, takes your suggested wording and locale, and collects up to 20 corrections from one site into a local ZIP with a marked screenshot for each.',
  link: { href: '/guide#corrections', label: 'See the correction workflow in the guide' },
  images: [
    {
      src: '/guide/11-select-text.png',
      width: 2880,
      height: 1800,
      alt: 'Checkout page with a sentence selected',
    },
    {
      src: '/guide/14-correction-batch.png',
      width: 880,
      height: 1520,
      alt: 'BugReceipt side panel with two corrections in a batch',
    },
  ],
} as const;

export const audiences = [
  {
    title: 'QA engineers',
    body: 'One capture replaces a screenshot, a DevTools export, and a paragraph of guesses. The steps you type land next to the requests that failed.',
  },
  {
    title: 'Support teams',
    body: 'Ask a customer for one ZIP instead of a screen-share. They review what is in it before sending; you forward it to engineering as is.',
  },
  {
    title: 'Open-source maintainers',
    body: 'Issues arrive with console output, the failing request, and the browser version attached, so the first reply can be a fix instead of a question.',
  },
] as const;

export const faqs = [
  {
    question: 'Which browsers are supported?',
    answer:
      'Chrome desktop 125 and newer. The extension uses Chrome’s side panel and debugger APIs, so Firefox and Safari are not supported.',
  },
  {
    question: 'What happens if the page navigates during a capture?',
    answer:
      'A same-origin reload stays in the session. Leaving the recorded site or closing the tab ends the capture, and the report records why it stopped.',
  },
  {
    question: 'How long is evidence kept?',
    answer:
      'In extension-owned local storage until you delete the capture, start a new one, or download it. Only one capture exists at a time.',
  },
  {
    question: 'Does it work on localhost and staging?',
    answer:
      'Yes. Any regular HTTP or HTTPS page can be captured, including local development servers. Chrome settings pages and other restricted pages cannot.',
  },
  {
    question: 'What is the unpacked ZIP on GitHub Releases?',
    answer:
      'A manual install for people who cannot use the Chrome Web Store. It needs Developer mode and Load unpacked, and it does not update automatically.',
  },
] as const;
