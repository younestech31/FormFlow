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
- [ ] In-app PDF page preview and page navigation.
- [ ] Drag/drop and native file picker adapters.
- [ ] Recent documents and local metadata management.

## Milestone 2 — recognition and editor
- [ ] Inspect PDF vector paths, rules, rectangles and checkbox candidates.
- [ ] Spatial association between labels and blank fields.
- [ ] Visual overlay editor to add/move/resize/rename/delete fields.
- [ ] Text, multiline, checkbox, radio, date and select field types.
- [ ] Manual corrections saved in reusable templates.

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
