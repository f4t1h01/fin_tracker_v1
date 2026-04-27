# Android Phase 1

## Done

- Replaced the mock Compose scaffold with a native finance client shell.
- Added Retrofit/OkHttp API wiring for existing auth, profile, dashboard, rates, transaction, category, and partner binding endpoints.
- Added encrypted JWT storage plus DataStore-backed cached profile/dashboard/rates snapshots.
- Added mobile-first screens for auth, profile, dashboard, rates, and settings.
- Added focused JVM tests for dashboard query building, currency utilities, and DTO parsing.
- Added Room-backed offline outbox and cached JSON storage.
- Added WorkManager sync for pending offline creates when internet returns.
- Added API/Prisma `clientMutationId` idempotency support for transaction and goods item creates.
- Added My Goods Android overview/list/add-item surface.
- Added reusable Duet-styled Compose controls for buttons, fields, dropdown sheets, segmented controls, cards, and status banners.

## To-do

- Run emulator/device QA for sign in, cached snapshot loading, transaction create/edit/delete, dashboard filters, rates selection, theme toggle, logout, invalid-token recovery, My Goods, and offline queued creates.
- Verify pending offline expense and goods item survive app restart, then sync and appear in web after internet returns.
