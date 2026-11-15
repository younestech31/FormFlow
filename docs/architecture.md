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

All field logic and screen flows belong in shared packages. Differences are limited to native adapters. Shared tests must run for all platforms before ¶»§q«^