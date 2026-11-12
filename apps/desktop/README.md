# Desktop shell

Tauri 2 hosts the same built web application. Rust commands are reserved for platform adapters (native dialogs, filesystem access and printing), not a separate feature set.

Install Rust and the Tauri prerequisites for your operating system. Then:

```bash
cd apps/desktop
npm install
npm run tauri dev
```

Build the UI before packaging:

```bash
cd ../..
npm run build --workspace @formflow/web
cd apps/desktop
npm run tauri build
```
