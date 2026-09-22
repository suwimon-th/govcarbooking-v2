# Release preparation status

Prepared, not applied to production:
1. `scripts/create_driver_leaves.sql`: empty database table, RLS denies anon/authenticated access, service-only RPC. Existing local data is not imported.
2. `scripts/enable_driver_leave_assignment_guard.sql`: booking trigger; affects old and new clients immediately. Must be tested before applying at release.
3. Set `DRIVER_LEAVES_STORAGE=supabase` only after schema verification. Local demo is disabled for this storage mode. Without the setting production leave API stays disabled.

Required before deployment:
- Use an isolated PostgreSQL/Supabase database to verify both migrations, repeatability and concurrent leave/booking writes. No isolated PostgreSQL runtime is currently configured on this machine. SQL has not been executed or concurrency-tested.
- Verify LINE identity ownership, administrator permissions, cancellation and full-day boundaries against that database.
- Verify actual driver LINE linkage and production LIFF configuration; local TESTER linkage is not used with Supabase storage.
- Audit current uncommitted release changes and save the currently deployed revision and database backup.
- Confirm fixed session secret, Supabase keys, production domain, email/LINE recipients.
- Apply additive schema, release code, enable booking guard and storage during controlled cutover. Until all pieces are enabled, keep leave writes disabled.
- Rollback requires a reviewed compatibility plan for both application and booking trigger. Preserve recorded leaves; do not drop data to rollback.

Theme preference is browser-local (`govcar-theme`). No account, password or database change is involved.
