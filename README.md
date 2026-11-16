# FabricTrack — organized project

Shared Spring Boot backend, separate admin and business frontends. LifeVault was used as a reference for source organization; its application code and database were not copied. Read docs/PROJECT_REVIEW.md for the comparison and docs/CLEANUP.md for removed files.

## Folder map

| Folder | Purpose |
| --- | --- |
| backend | Active shared Java 21 / Spring Boot API |
| frontend/admin-portal | Admin login, recovery, invitations and staff dashboard |
| frontend/business-portal | Existing mobile / four-digit OTP business portal |
| supabase | Existing local Supabase configuration |
| scripts | Local-console and real-SMS backend launchers |
| modules/business-workspace | Inactive, unfinished workspace source retained for future integration |
| docs | Architecture, review, cleanup and validation notes |

## Run on Windows

Extract into a NEW folder. Example root below: C:\Users\Ajay R\Desktop\VoxelFabricTrack. The backend folder is now `backend`, and both portals are inside `frontend`.

Requirements: full JDK 21; Node 22.22.2+ within Node 22, or Node 24.15+; npm; Docker Desktop. Existing dependency engines do not support Node 22.15.

### 1. Keep the existing database running

From the ORIGINAL folder that manages your existing Supabase instance:

```powershell
npx supabase status
# Only if it is stopped:
npx supabase start
```

Do not run `db reset`. Do not start a second Supabase instance from the extracted folder. The expected local PostgreSQL port is 54322. Use the database credentials from your own local instance; the launcher defaults to postgres/postgres only for standard local setup.

### 2. Backend — terminal 1

Stop the previous backend on 8081 first. For local testing with OTP printed in the terminal:

```powershell
cd "C:\Users\Ajay R\Desktop\VoxelFabricTrack"
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
# Set your actual DB password if different from the standard local default:
# $env:BUSINESS_DB_PASSWORD = "YOUR_DATABASE_PASSWORD"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\start-business-local.ps1"
```

This enables the business-local profile and console mode. Keep the stable .business-otp-pepper file private; the launcher reuses it. Keep your existing SUPABASE_ADMIN_KEY environment variable for admin invitations.

### 3. Business frontend — terminal 2

```powershell
cd "C:\Users\Ajay R\Desktop\VoxelFabricTrack\frontend\business-portal"
npm ci
npm run dev
```

Open http://127.0.0.1:5174. Existing registration, phone login, OTP, account, Free plan and logout behavior is retained. Operational modules remain marked as not implemented.

### 4. Admin frontend — terminal 3

```powershell
cd "C:\Users\Ajay R\Desktop\VoxelFabricTrack\frontend\admin-portal"
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Keep the existing admin .env.local values. Admin uses Supabase authentication; staff with invitation permission can open Team access. Login, forgot/reset password and logout remain available.

### Real SMS instead of console mode

Keep real Twilio credentials in environment variables, outside React and source files. Open a new terminal after changing Windows environment variables. Set BUSINESS_DB_PASSWORD, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER, then run:

```powershell
cd "C:\Users\Ajay R\Desktop\VoxelFabricTrack"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\start-business-sms.ps1"
```

Do not use start-business-local.ps1 for real SMS: it explicitly selects console mode. Check the running mode:

```powershell
curl.exe http://127.0.0.1:8081/api/business/auth/config
```

Real SMS mode returns {"development":false}. This confirms adapter mode, not successful provider delivery. Twilio trial/provider restrictions still apply; this cleanup does not remove them. Live delivery was not tested here.

### IDE setup

Open backend/pom.xml as the Maven project. Set project SDK, Maven runner and the application runtime to JDK 21. Use the launch scripts for business startup, or configure equivalent environment variables in the IDE run configuration. Business is disabled by default when no BUSINESS_ENABLED variable is supplied, preserving admin-only startup.

## Checks

Inside each frontend: `npm test`, `npm run build`, `npm run lint`.

Inside backend:

```powershell
.\mvnw.cmd clean test
```

Database integration tests need explicit TEST_BUSINESS_DB_* variables and a disposable database; do not point them at your working database. See docs/VALIDATION.md for checks completed on this delivery and environment limitations.
