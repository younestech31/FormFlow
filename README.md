# FormFlow

An offline-first workspace for inspecting, preparing, and filling reusable forms. One shared application powers web, Android, and desktop.

**FormFlow intentionally uses no AI, machine learning, OCR service, paid API, subscription, or mandatory cloud service.** Document processing is local and suggestions remain user-reviewable.

## Foundation included

- React + TypeScript + Vite shared web UI.
- PDF.js local text/page inspection.
- pdf-lib inspection and filling of existing AcroForm fields.
- Deterministic label-anchor heuristics (not semantic document understanding).
- IndexedDB template storage foundation.
- Capacitor Android shell configuration and Tauri 2 desktop shell.
- PWA manifest and application-shell service worker.
- Vercel monorepo build configuration.

This is a foundation, not a complete form editor. Visual PDF rendering, vector geometry detection, drag/resize editing, custom-field overlay, template UI, and finished export workflows are planned milestones.

## Important limitation

Text extraction works for text-based PDFs. A scanned PDF contains page images, not selectable text. No OCR is included, so FormFlow cannot read labels inside scans; a later geometry-only/manual workflow can still help users place fields.

## Requirements

Node.js 22.12+ and npm. The Vercel project currently uses Node 26. Android builds also need Android Studio/SDK. Desktop builds need Rust and Tauri's platform prerequisites.

## Run the web app

```bash
npm install
npm run dev
```

```bash
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
