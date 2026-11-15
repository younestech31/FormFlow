# Architecture

## One product across three targets

`apps/web` contains the only React UI. Capacitor and Tauri package that same built UI; they are not separate implementations.

## Shared layers

- `packages/core`: document, page, form-field and candidate types; deterministic, explainable heuristics.
- `packages/pdf-engine`: PDF.js page/text inspection and pdf-lib AcroForm reading/writing.
- `packages/local-storage`: IndexedDB-backed reusable template persistence.
- Platform shells: native file picking, filesystem, printing and packaging adapters only.

## Planned recognition pipeline

1. Inspect native PDF widgets and their field names.
2. Extract text runs and page coordinates from text PDFs.
3. Analyze vector drawing operations (rules, rectangles and checkbox-like shapes).
4. Associate nearby labels and candidate writing areas with deterministic spatial rules.
5. Show suggestions with method and confidence; never silently confirm a candidate.
6. On the first-page preview, let the user add, rename, move, resize, change type, or remove candidate fields. The current editor is an in-memory review surface.
7. Next, save the edited geometry in a reusable local template, fill values and export the PDF.

No OCR is included. Scanned-image text must be entered manually unless a non-OCR approach is later agreed.

## Platform parity

All field logic and screen flows belong in shared packages. Differences are limited to native adapters. Shared tests must run for all platforms before a feature is released.

## Privacy

No server, account, cloud database, telemetry, or paid API is required for core workflows. Documents remain local by default.

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
