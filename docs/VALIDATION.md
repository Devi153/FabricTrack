# Delivery validation

Checked on 2026-11-15.

| Check | Result |
| --- | --- |
| Admin frontend Vitest | 19 passed |
| Business frontend Vitest | 3 passed |
| Both frontend TypeScript and Vite production builds | Passed |
| Both frontend ESLint | Passed |
| Admin Prettier formatting check | Passed |
| Backend compilation and tests | 32 passed, 6 database tests skipped |
| Full backend context, business disabled | Passed |
| Full backend context, business enabled with mocked store | Passed |
| Public business config and protected dashboard through actual security chains | Passed |
| Supabase TOML parse | Passed |

Backend tests include admin authorities, security and invitations, business endpoint security, and OTP helpers. The full business context test catches duplicate bean and controller mappings without requiring private operator credentials or a live database.

The managed Java environment required source/target 21 compiler flags instead of --release and an explicit Mockito agent for test execution. These were command-line environment accommodations; the delivered POM still requires Java 21. Use a full JDK 21 on Windows.

Live PostgreSQL integration and Twilio delivery were not exercised. No existing Supabase database was reset or modified. Browser screenshot verification was blocked because this environment denied Chromium's required socket operations; responsive styles and component behavior were checked through source review, builds and tests. Windows PowerShell launchers were reviewed, but could not be executed on Linux.

Generated node_modules, target, dist, IDE metadata, compiler caches and logs are excluded from the delivery. Install dependencies with npm ci. Existing operator configuration is retained; avoid sharing the private project archive publicly.
