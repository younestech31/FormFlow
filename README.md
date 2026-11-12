# FormFlow

An offline-first workspace for inspecting, preparing, and filling reusable forms. One shared application powers web, Android, and desktop.

**FormFlow intentionally uses no AI, machine learning, OCR service, paid API, subscription, or mandatory cloud service.** Document processing is local and suggestions remain user-reviewable.

## Foundation included

- React + TypeScript + Vite shared web UI.
- PDF.js local text/page inspection.
- pdf-lib inspection and filling of existing AcroForm fields.
- Deterministic label-anchor heuristics and first-pass PDF vector-shape detection for axis-aligned rectangles and long horizontal lines (not semantic document understanding).
- IndexedDB template storage foundation.
- Capacitor Android shell configuration and Tauri 2 desktop shell.
- PWA manifest and application-shell service worker.
- Vercel monorepo build configuration.

This is an early foundation, not yet a complete form editor. The web app can navigate between PDF pages and lets users review detected candidates on each page, add a field manually, edit its label and type, drag it, resize it, or delete it. Templates can now be saved in IndexedDB on the current device and re-applied to the same PDF (matched by a local SHA-256 fingerprint). Existing AcroForm text, checkbox, dropdown and radio fields can be filled, and custom text, Arabic, French, checkbox and radio overlay values can be written into the exported PDF. Custom fields are currently flattened into the output PDF rather than created as interactive AcroForm widgets; expanded export options and Android/Desktop native builds remain planned.

## Important limitation

Text extraction works for text-based PDFs. The inspection engine also reads PDF drawing paths and proposes likely checkboxes, rectangular fields, and long underline fields using geometry rules. These are heuristic suggestions and can mistake table cells or decorative shapes for fields. The visual preview and field editor support navigation across all PDF pages. Templates retain geometry for every page. Exported custom fields are flattened page content, not interactive AcroForm controls. A scanned PDF contains page images, not selectable text. No OCR is included, so FormFlow cannot read labels inside scans; geometric hints may be found only when the scan's PDF wrapper contains separate vector objects, otherwise fields must be added manually.

## Requirements

Node.js 22.12+ and npm. The Vercel project currently uses Node 26. Android builds also need Android Studio/SDK. Desktop builds need Rust and Tauri's platform prerequisites.

## Run the web app

```bash
npm install
npm run dev
```

```bash
npm test
npm run typecheck
npm run build
```

## Structure

- `apps/web`: shared React application and PWA.
- `apps/android`: Capacitor wrapper around the same web build.
- `apps/desktop`: Tauri wrapper around the same web build.
- `packages/core`: shared domain types and deterministic detection heuristics.
- `packages/pdf-engine`: local PDF.js/pdf-lib operations.
- `packages/local-storage`: local template persistence.
- `docs`: architecture, roadmap, licensing decision.

## Platform parity contract

The shared UI and domain packages define product behavior. Native adapters may handle file pickers, filesystem access, printing, permissions, and packaging only. A feature is not complete until it is available and tested on all three targets.

## Privacy

The initial scaffold does not upload documents. No backend, account system, telemetry, or cloud database is needed for core features. Templates are stored locally in the browser's IndexedDB.

## Vercel

The root `vercel.json` builds `@formflow/web` and publishes `apps/web/dist`. The existing Vercel project remains linked to this repository and its `main` branch.

## License

The project owner has not selected a license yet. See [docs/licensing.md](docs/licensing.md). Until a LICENSE file is added, do not assume the source code has an open-source reuse grant.
