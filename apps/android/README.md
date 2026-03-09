# Duet Android

Kotlin Android client scaffold for Duet that keeps the existing backend and database as the shared source of truth.

## Intent

- Reuse the current PostgreSQL database through the existing API layer.
- Mirror the current Duet visual language in a faster-to-build Compose UI.
- Keep room for future native Android integration without blocking the web app.

## Current contents

- Single-activity Jetpack Compose app
- Warm editorial Duet theme inspired by the current web UI
- Core screens mocked with sample data: landing, auth, profile, dashboard
- API config placeholder for wiring the current backend later

## Open in Android Studio

1. Open `apps/android` as a project.
2. Let Android Studio install the Android SDK and Gradle components it requests.
3. Sync the project.
4. Run the `app` configuration on an emulator or device.

## Planned next integration

- Replace sample data with Retrofit or Ktor API calls to the existing backend.
- Reuse auth, profile, transaction, and dashboard endpoints.
- Add Room or DataStore only for local session/cache support.
