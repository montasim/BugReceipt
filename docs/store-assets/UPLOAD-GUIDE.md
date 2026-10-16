# BugReceipt Chrome Web Store assets

## Screenshots

Upload these in this order:

1. `bugreceipt-slide-1.png` — record a bug while reproducing it
2. `bugreceipt-slide-2.png` — review steps, console, network, and recording evidence
3. `bugreceipt-slide-3.png` — include browser, platform, and page context
4. `bugreceipt-slide-4.png` — report a translation or wording correction
5. `bugreceipt-slide-5.png` — export one complete developer handoff

All five images are 1280×800 PNGs and use the same dark BugReceipt visual system.

The panel shown in every slide is captured from the compiled BugReceipt extension UI. The marketing copy is composed around that capture; it is not a fabricated replacement panel. The set now covers core bug capture as well as the correction workflow.

## Video

Upload `bugreceipt-store-demo.mp4` as the product video. It is a 45-second, silent walkthrough with embedded captions that explains the workflow step by step: find the issue, open the side panel, capture context, preserve the original wording, add a suggestion, review locales, collect multiple corrections, check the handoff, and export the final bundle.

## Source

`compose-assets.html` is the deterministic source used to render the screenshots. `video-scenes.html` is the deterministic source for the nine-step video scenes. `ui-start.png`, `ui-recording.png`, `ui-ready.png`, `ui-correction.png`, and `ui-batch.png` are captures of the actual extension side panel used by the compositions. `marketing-background.png` is the background texture used by the source.
