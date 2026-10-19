export const hero = {
  eyebrow: 'For QA and support teams',
  title: 'Bug reports developers can reproduce.',
  lead: 'A screenshot gets you “cannot reproduce”. BugReceipt records the tab, keeps the console and network evidence with your steps, and exports one report you review first.',
  trust: [
    { label: 'Free' },
    { label: 'Open source', href: 'https://github.com/montasim/BugReceipt' },
    { label: 'No account' },
    { label: 'Nothing uploaded' },
    { label: 'Chrome desktop 125+' },
  ],
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
    caption: 'Screenshots from the demo capture: the page failing, the side panel recording.',
  },
} as const;

export const insteadOf = {
  title: 'What gets sent today.',
  lead: 'Each one leaves the developer asking for more.',
  columns: [
    {
      label: 'Screenshot',
      title: 'Shows the symptom',
      body: 'Not the request that failed, not the error behind it.',
    },
    {
      label: 'Screen recording',
      title: 'Shows the clicks',
      body: 'Still no console, still no network, and nothing to search.',
    },
    {
      label: 'DevTools export',
      title: 'Needs a developer to make',
      body: 'And a call to explain which part matters.',
    },
  ],
  note: 'One BugReceipt ZIP carries all three, with your steps, reviewed before it leaves.',
} as const;

export const steps = [
  {
    title: 'Choose the tab',
    body: 'Open the side panel and pick the tab in Chrome’s share dialog. Nothing is recorded before that.',
    image: {
      src: '/guide/01-side-panel.png',
      width: 880,
      height: 1520,
      alt: 'BugReceipt side panel ready to record',
    },
  },
  {
    title: 'Reproduce and add steps',
    body: 'Use the page as usual. Type what you do; the panel counts the evidence as it arrives.',
    image: {
      src: '/guide/03-recording.png',
      width: 880,
      height: 1520,
      alt: 'BugReceipt side panel recording with three recorded steps',
    },
  },
  {
    title: 'Stop and review',
    body: 'Finish the report, remove anything private, download one ZIP.',
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
  caption: '45 seconds, from the failing page to the downloaded report.',
} as const;

export const evidenceTabs = [
  {
    id: 'visual',
    label: 'Visual',
    title: 'Play it. Mark the exact problem.',
    body: 'Save frames from the recording and annotate them. Remove the video or any frame before export.',
    image: {
      src: '/guide/annotated-frame.png',
      width: 2880,
      height: 1800,
      alt: 'Visual evidence tab with a saved frame of the checkout page and a highlight drawn over the error',
    },
  },
  {
    id: 'console',
    label: 'Console',
    title: 'Every message since recording started',
    body: 'Search, filter by type, highlight the exact line. Remove what you do not want shared.',
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
    body: 'Method, status, timing. Open a request for its headers and JSON body, credentials already redacted.',
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
  lead: 'One ZIP or folder. GitHub-ready Markdown, with the evidence beside it.',
  receiptCaption: 'An excerpt of the issue.md from that capture.',
  files: [
    {
      label: 'issue.md',
      title: 'The report',
      body: 'Title, steps, expected and current behavior, environment, console and network excerpts.',
    },
    {
      label: 'console.json · network.har',
      title: 'The diagnostics',
      body: 'The full filtered evidence, for tools that read it.',
    },
    {
      label: 'recording.webm · frames',
      title: 'The visual proof',
      body: 'The tab recording and your saved frames, annotations included.',
    },
  ],
  note: 'BugReceipt does not open or submit a GitHub issue for you.',
} as const;

export const privacyColumns = [
  {
    label: 'Recorded',
    title: 'Captured after you start',
    items: [
      'Tab video, no audio',
      'Console messages',
      'Requests and responses',
      'Your steps',
      'Page and browser context',
    ],
  },
  {
    label: 'Redacted',
    title: 'Filtered before storage',
    items: [
      'URL query strings',
      'Email addresses',
      'Bearer tokens and secrets',
      'Sensitive request headers',
      'Oversized bodies',
    ],
  },
  {
    label: 'Not collected',
    title: 'Never read',
    items: [
      'Cookies and storage',
      'Page HTML',
      'Form values and keystrokes',
      'Clipboard',
      'Microphone or tab audio',
    ],
  },
] as const;

export const privacyFootnote =
  'Filtering does not recognize every secret, and recordings show whatever was on screen. Review before you share.';

export const corrections = {
  title: 'Wrong wording? Send that too.',
  body: 'Select text, right-click, choose Suggest a correction. Add your wording, then export the batch as a local ZIP.',
  link: { href: '/guide#corrections', label: 'Correction workflow in the guide' },
  scene: {
    page: {
      src: '/guide/correction-page.png',
      width: 1800,
      height: 1520,
      alt: 'Demo checkout page with the sentence under the heading selected',
    },
    panel: {
      src: '/guide/14-correction-batch.png',
      width: 880,
      height: 1520,
      alt: 'BugReceipt side panel holding two corrections, the second with its suggested wording',
    },
    caption: 'The selected sentence on the page, and the panel collecting corrections.',
  },
} as const;

export const audiences = [
  {
    label: 'QA',
    title: 'QA engineers',
    body: 'Close the loop in one message. The steps you typed sit next to the request that failed.',
  },
  {
    label: 'Support',
    title: 'Support teams',
    body: 'No screen-share. The customer sends one ZIP they reviewed; you forward it.',
  },
  {
    label: 'Open source',
    title: 'Maintainers',
    body: 'The first reply is a fix, not a question. Console, request, and browser version arrive attached.',
  },
] as const;

export const faqs = [
  {
    question: 'Which browsers are supported?',
    answer: 'Chrome desktop 125 and newer. Firefox and Safari are not supported.',
  },
  {
    question: 'What if the page navigates during a capture?',
    answer:
      'Same-origin reloads stay in the session. Leaving the site or closing the tab ends it, and the report says why.',
  },
  {
    question: 'How long is evidence kept?',
    answer:
      'In the extension’s local storage until you delete, replace, or download it. One capture at a time.',
  },
  {
    question: 'Does it work on localhost and staging?',
    answer:
      'Yes. Any HTTP or HTTPS page, including local servers. Chrome’s own pages cannot be captured.',
  },
  {
    question: 'What is the unpacked ZIP on GitHub Releases?',
    answer:
      'A manual install for people who cannot use the Web Store. It needs Developer mode and does not update itself.',
  },
] as const;
