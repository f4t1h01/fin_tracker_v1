# Android Phase 1

## Done

- Replaced the mock Compose scaffold with a native finance client shell.
- Added Retrofit/OkHttp API wiring for existing auth, profile, dashboard, rates, transaction, category, and partner binding endpoints.
- Added encrypted JWT storage plus DataStore-backed cached profile/dashboard/rates snapshots.
- Added mobile-first screens for auth, profile, dashboard, rates, and settings.
- Added focused JVM tests for dashboard query building, currency utilities, and DTO parsing.

## To-do

- Configure Android SDK locally for `apps/android`.
- Run `:app:compileDebugKotlin` and `:app:testDebugUnitTest`.
- Run emulator/device QA for sign in, cached snapshot loading, transaction create/edit/delete, dashboard filters, rates selection, theme toggle, logout, and invalid-token recovery.
