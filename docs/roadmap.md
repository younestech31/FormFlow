# Roadmap

## Foundation (this commit)
- [x] Shared React + TypeScript + Vite UI.
- [x] Local PDF text/page inspection.
- [x] Existing AcroForm field inspection and basic value writing.
- [x] Conservative label-anchor candidate heuristic.
- [x] IndexedDB template storage API.
- [x] Capacitor and Tauri shell configuration.
- [x] PWA shell and Vercel deployment config.

## Milestone 1 â€” document workspace
- [x] In-app multi-page PDF preview, page navigation, and detected-candidate overlays.
- [ ] Zoom controls.
- [ ] Drag/drop and native file picker adapters.
- [ ] Recent documents and local metadata management.

## Milestone 2 â€” recognition and editor
- [x] First-pass inspection of PDF vector paths; detect axis-aligned rectangles, small checkbox-like squares, and long horizontal rules.
- [x] Basic spatial association of extracted digital text labels with nearby geometric candidates.
- [ ] Improve spatial association for multi-column, rotated, and complex layouts. (Basic RTL left/right association is implemented.)
- [x] Multi-page overlay editor: manually add, move, resize, relabel, change type, and delete candidate fields.
- [x] Editable field type choices: text, multiline, checkbox, radio, date, select, and signature.
- [x] Save and re-apply templates locally using a SHA-256 source-file fingerprint.

## Milestone 3 â€” fill and export
- [x] Insert values for custom overlay fields into a flattened PDF export (including Arabic shaping and bidirectional layout).
- [x] Native¶»§q«^