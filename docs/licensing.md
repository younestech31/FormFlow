# License decision pending

FormFlow is intended to become open source, but the owner has not selected a license.

- **MIT**: simple permissive license.
- **Apache-2.0**: permissive license with express patent grant and notice requirements.
- **AGPL-3.0**: copyleft license with obligations that can also apply to modified software offered over a network.

Do not choose on the owner's behalf. Before the first public release, select one option and add its complete official text in the root `LICENSE` file. Until then, the repository has no explicit open-source reuse grant.

## Added PDF export dependencies and font

The PDF export path uses these direct packages; their upstream licenses remain applicable:

- @pdf-lib/fontkit — MIT.
- arabic-persian-reshaper — MIT.
- bidi-js — MIT.
- @fontsource/ibm-plex-sans-arabic — IBM Plex Sans Arabic font files under the SIL Open Font License 1.1 (OFL-1.1). The font is bundled with the web app and embedded in generated PDFs.
- pdf-lib — MIT.
- pdfjs-dist — Apache-2.0.
- tesseract.js 7.0.0 and tesseract.js-core 7.0.0 — Apache-2.0. Their browser worker and WebAssembly core are copied into generated static assets at build time.
- Tesseract `tessdata_fast` recognition models (`ara`, `fra`, `eng`) — Apache-2.0; model source is pinned to commit `87416418657359cb625c412a48b6e1d6d41c29bd`. The build script writes their license text beside the generated model assets.

fake-indexeddb is used only in development tests and is Apache-2.0. Keep upstream notices and licenses available with redistributed dependency assets. This dependency inventory does not select a license for FormFlow itself; the repository owner must still choose and add a root LICENSE file before release.
