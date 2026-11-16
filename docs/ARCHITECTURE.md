# Active application architecture

The React admin and business applications both proxy /api to localhost:8081 through their Vite configurations. The backend has two security paths: admin JWT authentication against the existing Supabase issuer, and a higher-priority business chain for the existing opaque business sessions. Registration/config/verification are public in that business chain; dashboard/account/logout require a business session.

The business feature has controller, service, repository, sms, security, config and exception packages. BusinessStore uses JDBC directly, through the runtime PostgreSQL driver. It initializes the existing business_private schema from db/business/schema.sql. The detached workspace module is not scanned or compiled by the active backend.

Configuration is centralized in backend/src/main/resources/application.yml. business.* properties configure the active OTP module. Old vox.business.* workspace properties are not part of this runtime. Environment values hold DB credentials, OTP pepper, Twilio credentials and admin invitation secrets. Frontend VITE_* values are public client configuration only.

The script start-business-local.ps1 selects console mode and business-local. start-business-sms.ps1 selects twilio. Both enable business authentication. Direct default startup leaves business disabled so admin-only startup does not need business credentials.
