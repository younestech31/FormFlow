# Architecture

## One product across three targets

`apps/web` contains the only React UI. Capacitor and Tauri package that same built UI; they are not separate implementations.

## Shared layers

- `packages/core`: document, page, form-field and candidate types; deterministic, explainable heuristics.
- `packages/pdf-engine`: PDF.js page/text inspection and image rendering, local Tesseract.js OCR, and pdf-lib AcroForm reading/writing.
- `packages/local-storage`: IndexedDB-backed reusable template persistence.
- Platform shells: native file picking, filesystem, printing and packaging adapters only.

## Planned recognition pipeline

1. Inspect native PDF widgets and their field names.
2. Extract text runs and page coordinates from text PDFs.
3. Analyze vector drawing operations (rules, rectangles and checkbox-like shapes).
4. Associate nearby labels and candidate writing areas with deterministic spatial rules.
5. Show suggestions with method and confidence; never silently confirm a candidate.
6. On the first-page preview, let the user add, rename, move, resize, change type, or remove candidate fields. The current editor is an in-memory review surface.
7. For raster-only pages, render one PDF page to a bounded-resolution canvas and optionally run the bundled local OCR worker.
8. Map recognized line boxes back to PDF page coordinates; show the source text, confidence score, and bounding boxes for human review and correction.
9. Use reviewed OCR text with the same deterministic spatial label rules as native PDF text. Keep low-confidence OCR text visible for correction but exclude it from automatic field-label inference until the user edits the line.
10. Save reviewed geometry in a reusable local template, fill values, and export the PDF.

OCR is optional and page-scoped. Text-layer extraction remains the first path for born-digital PDFs, avoiding unnecessary image rendering and OCR. OCR output is probabilistic and is never silently treated as verified legal or identity data.

## Platform parity

All field logic and screen flows belong in shared packages. Differences are limited to native adapters. Shared tests must run for all platforms before a feature is released.

## Privacy

No server, account, cloud database, telemetry, or paid API is required for core workflows. Documents remain local by default. The OCR runtime, WASM core, and Arabic/French/English trained data are served as same-origin static assets; after the runtime and selected models have been loaded once, the service worker and local OCR cache support subsequent offline use. The first OCR use requires those assets to be available on the device.

## Local OCR runtime

`Tesseract.js` runs the Tesseract LSTM engine through WebAssembly in a dedicated worker. `scripts/prepare-ocr-assets.mjs` copies the pinned worker/core binaries and downloads pinned `tessdata_fast` Arabic (`ara`), French (`fra`), and English (`eng`) models at build time. No OCR provider is contacted while recognizing a document. A single worker is reused and language packs are switched with worker reinitialization. Each OCR request renders one page at approximately 220 DPI, capped at a 2,800-pixel long edge to limit memory usage on office computers. The OCR line boxes are mapped back to the PDF.js page coordinate system.

Tesseract confidence values are heuristic engine scores, not calibrated probabilities. Text below the configured 45% threshold is excluded from automatic label matching until a user edits/reviews the line; that explicit edit marks the line as reviewed. Scanned page review remains mandatory; this integration has not yet been benchmarked against a representative corpus of real Algerian administrative forms. See [OCR implementation and limitations](ocr.md).

## Offline web shell

The Vite build emits a static asset manifest. During service-worker installation, FormFlow pre-caches the application entry bundle, lazy-loaded PDF inspection and export chunks, stylesheets, bundled fonts, and the PDF.js worker. Navigations use the cached shell when the network is unavailable. Requests for user PDF files bypass the service-worker cache; document contents remain in the local processing flow.

## Deterministic PDF geometry pass

The PDF engine reads PDF.js operator lists in addition to text content. A small graphics-state tracker handles save/restore and affine transforms, then converts path coordinates to page viewport coordinates. The shared core applies simple shape rules to axis-aligned closed rectangles and long horizontal lines. Nearby digital text fragments can be attached as provisional labels. This is geometry classification, not OCR or semantic understanding; raster-only scanned page content remains unreadable.

## Local templates and flattened export

The web app stores field geometry and template metadata in IndexedDB. A SHA-256 fingerprint of the selected source PDF is stored with each template so it is offered only for the matching document. No source PDF or field values are uploaded or stored as part of the template. The PDF export layer writes overlay values into page content with pdf-lib; bundled IBM Plex Sans Arabic font assets, Arabic contextual reshaping, and the Unicode bidirectional algorithm are used for Arabic/mixed-direction runs. Existing AcroForm text, checkbox, dropdown and radio values are updated in the native form. Custom overlays are flattened page content rather than interactive AcroForm widgets. Arabic native-field appearance generation remains unsupported; Arabic values are supported in custom overlay fields. Rotated pages are rejected until their coordinate transform is implemented.

## PDF preview rendering and workspace layout

- PDF.js renders the preview at a resolution derived from the page's fitted CSS width and the device pixel ratio. The backing canvas is capped at 4,096 pixels per dimension and approximately 8 million pixels to control memory usage on large documents.
- The preview renderer reports logical page dimensions separately from the backing-canvas dimensions. The SVG field editor therefore remains in PDF page coordinates and stays aligned with the sharper raster image.
- Once a document is open, the desktop UI becomes a viewport-height workspace: the PDF stage stays on the left and a tabbed inspector sits on the right. Scrolling is contained in the document stage or the currently selected inspector panel rather than the entire page.
- On narrow screens, the workspace becomes a vertical layout with a bounded PDF stage and no horizontal overflow. The inspector tabs are localized and keyboard-accessible.

## Deterministic recognition pipeline (expanded)

Recognition remains local and rule-based; it does not call an AI model or OCR service.

1. Normalize extracted digital text, then merge adjacent PDF text runs into visual lines using baseline proximity, horizontal gaps, and direction-aware reading order. Arabic-dominant runs are assembled right-to-left; rotated text bounds are mapped using both axes of the PDF text matrix.
2. Recognize common Arabic, French, and English form-label vocabulary as well as explicit colon-ended labels. Label association uses page, overlap, distance, orientation, and punctuation cues rather than a single nearest-text rule. Suggested label-only writing areas are bounded by neighboring text and existing controls.
3. Classify closed vector rectangles as likely text fields or checkboxes; classify small curved circular marks as radio choices; recognize labelled writing rules; and infer date, signature, and multiline types from label/geometry cues.
4. Reconstruct empty axis-aligned table cells from separate horizontal and vertical vector rules independently per PDF page. A cell containing extracted text is not suggested as an empty field. Grid cells require a nearby recognizable label.
5. Read native AcroForm widget annotations and their page-space rectangles. Suppress geometry suggestions that overlap those controls, including local-coordinate appearance artifacts found at page edges.
6. Combine tightly packed, consistently sized digit boxes into one text/date field when their row pattern and nearby label support that interpretation; do not merge spaced checkbox choices or known gender/status groups, and suppress filled digit sequences.
6. Assign deterministic heuristic confidence scores and present candidates for human review; scores are ranking cues, not calibrated probabilities. Users can rename, move, resize, change type, or remove every suggestion.

The detector does not infer the meaning of arbitrary prose. The label vocabulary is deliberately small and extendable through reviewed deterministic rules. It cannot read text in raster scans; without OCR, scanned-image labels must be entered manually. Grid reconstruction currently targets axis-aligned vector tables and does not claim support for every complex or rotated layout.
