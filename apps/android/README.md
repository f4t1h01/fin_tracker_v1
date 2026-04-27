# Duet Android

Kotlin Android client scaffold for Duet that keeps the existing backend and database as the shared source of truth.

## Intent

- Reuse the current PostgreSQL database through the existing API layer.
- Mirror the current Duet visual language in a faster-to-build Compose UI.
- Keep room for future native Android integration without blocking the web app.

## Current contents

- Single-activity Jetpack Compose app
- Warm editorial Duet theme adapted for mobile surfaces
- Email/password auth against the existing API
- Profile snapshot, transaction entry/edit/delete, recent activity, dashboard, exchange rates, settings, partner binding, and category basics
- Online-first cached loading with encrypted JWT storage, DataStore preferences, Room cached JSON, and Room-backed offline-create outbox
- My Goods overview/list/add-item support
- WorkManager sync for pending offline transaction and goods item creates

## Open in Android Studio

1. Open `apps/android` as a project.
2. Let Android Studio install the Android SDK and Gradle components it requests.
3. Sync the project.
4. Run the `app` configuration on an emulator or device.

## Planned next integration

- Run emulator QA for offline queued creates and reconnect sync.
- Add AI advisor, receipt image, and voice drafting in later phases.
