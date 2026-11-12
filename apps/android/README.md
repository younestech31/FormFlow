# Android shell

This package embeds the exact same `apps/web` interface with Capacitor. Do not create an Android-only UI.

## Local setup

```bash
npm install
npx cap add android
npm run build --workspace @formflow/web
npx cap sync android
npx cap open android
```

The native `android/` directory is generated locally and intentionally not committed yet. Commit generated native project files after verifying a successful Android SDK build. Product logic remains in shared packages.
