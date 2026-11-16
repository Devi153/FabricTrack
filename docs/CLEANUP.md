# Cleanup manifest

Removed obsolete or unreferenced source and generated/log material:

- fabrictrack/src/main/java/com/voxelfashion/fabrictrack/business/auth
- fabrictrack/src/main/java/com/voxelfashion/fabrictrack/business/BusinessProfileController.java
- fabrictrack/src/test/java/com/voxelfashion/fabrictrack/business/auth
- fabrictrack/legacy-backup-20261112-122636
- scripts/setup-business-local.ps1
- scripts/start-business-backend.ps1
- .business-auth-secret
- supabase/templates
- business-portal/src/features
- business-portal/src/lib
- business-portal/src/index.css
- business-portal/src/App.css
- business-portal/src/assets
- admin-portal/src/App.css
- admin-portal/src/assets
- admin-portal/src/features/auth/components/AdminWelcome.tsx
- fabrictrack/business-startup.log
- fabrictrack/startup-error.log
- BUSINESS_REBUILD.md
- CLEANUP_VALIDATION.md
- backend/src/main/resources/application.properties
- backend/src/main/resources/business-portal.properties

The optional business-workspace module preserves substantial unconnected inventory code; it is not part of either runtime build.

Additional unreferenced starter files removed:

- backend/HELP.md
- frontend/admin-portal/public/icons.svg
- frontend/business-portal/public/icons.svg
- frontend/business-portal/public/favicon.svg
- supabase/.temp (generated CLI metadata)
- supabase/.branches (generated local branch metadata)

Excluded generated material throughout the archive: node_modules/, target/, dist/, .idea/, .git/, *.tsbuildinfo and runtime logs. The uploaded original was left untouched.
