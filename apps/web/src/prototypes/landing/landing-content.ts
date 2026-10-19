export const hero = {
  title: 'Bug reports developers can reproduce.',
  lead: 'Record the tab. Keep the console and network evidence with your steps. Review, then export. Nothing leaves your machine until you share it.',
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
    caption: 'Screenshots from the demo capture: the page failing, the side panel recording.',
  },
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
    title: 'Play it. Keep the frames that matter.',
    body: 'Pause on the failure, save up to 20 frames, annotate them. Remove the video or any frame before export.',
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
    body: 'One capture instead of a screenshot, a DevTools export, and a paragraph of guesses.',
  },
  {
    label: 'Support',
    title: 'Support teams',
    body: 'Ask the customer for one ZIP. They review it; you forward it.',
  },
  {
    label: 'Open source',
    title: 'Maintainers',
    body: 'Issues arrive with the console, the request, and the browser version attached.',
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
