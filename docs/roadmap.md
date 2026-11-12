# Roadmap

## Foundation (this commit)
- [x] Shared React + TypeScript + Vite UI.
- [x] Local PDF text/page inspection.
- [x] Existing AcroForm field inspection and basic value writing.
- [x] Conservative label-anchor candidate heuristic.
- [x] IndexedDB template storage API.
- [x] Capacitor and Tauri shell configuration.
- [x] PWA shell and Vercel deployment config.

## Milestone 1 — document workspace
- [x] In-app first-page PDF preview with detected-candidate overlays.
- [ ] Page navigation and zoom controls (the current preview/editor is limited to page one).
- [ ] Drag/drop and native file picker adapters.
- [ ] Recent documents and local metadata management.

## Milestone 2 — recognition and editor
- [x] First-pass inspection of PDF vector paths; detect axis-aligned rectangles, small checkbox-like squares, and long horizontal rules.
- [x] Basic spatial association of extracted digital text labels with nearby geometric candidates.
- [ ] Improve spatial association for multi-column, rotated, and complex layouts. (Basic RTL left/right association is implemented.)
- [x] First-page overlay editor: manually add, move, resize, relabel, change type, and delete candidate fields.
- [x] Editable field type choices: text, multiline, checkbox, radio, date, select, and signature.
- [ ] Save manual corrections in reusable local templates.

## Milestone 3 — fill and export
- [ ] Fill native AcroForm fields and custom overlay fields.
- [ ] Flattened/editable PDF export options where possible.
- [ ] Optional local personal profile, with review before insertion.
- [ ] Arabic/RTL text shaping, font embedding and rendering tests.

## Milestone 4 — parity and quality
- [ ] Shared test suite for detection, field geometry, templates and export.
- [ ] Android and desktop filesystem adapters.
- [ ] Printing, accessibility and offline tests on all targets.
- [ ] User documentation and release packaging.

## Explicit non-goals
AI/ML recognition, OCR, paid APIs, subscriptions, mandatory accounts, and cloud document storage.

## Geometry detection scope

The first vector pass consumes PDF.js operator lists and recognizes simple, axis-aligned closed rectangles and long horizontal paths. It proposes square checkbox candidates and rectangular/underline text-field candidates, and may attach a nearby extractable PDF text fragment as a label. It does not recognize arbitrary artwork, rotated/curved boxes, or text embedded in scanned images. Suggestions can be false positives (for example, table cells) and are not confirmed fields until reviewed by the user.
