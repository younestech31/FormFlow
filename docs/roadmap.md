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
- [x] In-app multi-page PDF preview, page navigation, and detected-candidate overlays.
- [ ] Zoom controls.
- [ ] Drag/drop and native file picker adapters.
- [ ] Recent documents and local metadata management.

## Milestone 2 — recognition and editor
- [x] First-pass inspection of PDF vector paths; detect axis-aligned rectangles, small checkbox-like squares, and long horizontal rules.
- [x] Basic spatial association of extracted digital text labels with nearby geometric candidates.
- [ ] Improve spatial association for multi-column, rotated, and complex layouts. (Basic RTL left/right association is implemented.)
- [x] Multi-page overlay editor: manually add, move, resize, relabel, change type, and delete candidate fields.
- [x] Editable field type choices: text, multiline, checkbox, radio, date, select, and signature.
- [x] Save and re-apply templates locally using a SHA-256 source-file fingerprint.

## Milestone 3 — fill and export
- [x] Insert values for custom overlay fields into a flattened PDF export (including Arabic shaping and bidirectional layout).
- [x] Native AcroForm value controls for text, checkbox, dropdown and radio fields.
- [x] Flattened PDF export for text, multiline text, checkbox and radio overlay values.
- [ ] Additional editable/flattened export options and page-rotation support.
- [ ] Optional local personal profile, with review before insertion.
- [x] Arabic/RTL shaping, IBM Plex Sans Arabic font embedding, and PDF text extraction tests for custom overlay fields.

## Milestone 4 — parity and quality
- [x] Shared test suite for detection, field geometry, templates and export.
- [ ] Android and desktop filesystem adapters.
- [ ] Printing, accessibility and offline tests on all targets.
- [ ] User documentation and release packaging.

## Explicit non-goals
AI/ML recognition, OCR, paid APIs, subscriptions, mandatory accounts, and cloud document storage.

## Geometry detection scope

The first vector pass consumes PDF.js operator lists and recognizes simple, axis-aligned closed rectangles and long horizontal paths. It proposes square checkbox candidates and rectangular/underline text-field candidates, and may attach a nearby extractable PDF text fragment as a label. It does not recognize arbitrary artwork, rotated/curved boxes, or text embedded in scanned images. Suggestions can be false positives (for example, table cells) and are not confirmed fields until reviewed by the user.

## Recently completed: preview quality and workspace usability

- [x] Adaptive high-density PDF canvas rendering with explicit canvas memory limits.
- [x] Keep PDF field overlays aligned to logical page coordinates at higher render scales.
- [x] Replace the long document-editing page with a fixed-height desktop workspace and focused inspector tabs.
- [x] Provide a responsive mobile layout without horizontal overflow.
- [x] Verify two-page navigation, canvas/overlay alignment, tab switching, language changes, and contained scrolling with a browser-driven synthetic PDF check.

## Recently completed: deterministic recognition upgrade

- [x] Merge fragmented PDF text into visual lines with Arabic right-to-left reading order.
- [x] Recognize common Arabic, French, and English form labels with bounded label-only writing areas.
- [x] Use directional spatial scoring to associate labels with boxes, writing lines, and checkbox/radio options.
- [x] Reconstruct empty cells from axis-aligned vector table rules while excluding text-filled cells.
- [x] Detect radio circles and group aligned options; infer date, signature, and multiline field types.
- [x] Extract native AcroForm widget rectangles and suppress duplicate geometry/appearance suggestions.
- [x] Add regression tests for split text, RTL labels, table cells, radio options, decorative lines, rotated text bounds, and native widget artifacts.
- [x] Group segmented identity/registration digit boxes into one editable field while preserving checkbox choice groups and ignoring filled sequences.

- [x] Isolate table-grid reconstruction by PDF page to prevent vector edges on different pages from creating ghost cells.
