# Existing separate frontend: business-portal

The module is under `src/business-portal`. Import its `BusinessPortal.jsx` from your existing router/root. Keep existing application providers and packages; the module itself uses React and scoped CSS.

The API adapter calls `/api/business/v1`. Proxy that path to your shared `fabrictract` backend in development/production. A Vite snippet is supplied as an inactive example. Same-origin HTTPS keeps the secure owner cookie working. Local HTTP testing needs the exact local frontend Origin and explicit BUSINESS_SECURE_COOKIE=false on the backend.

Existing API shapes can be reused by changing `src/business-portal/api.js`. Do not create parallel owner identities when your existing backend already manages owners; the actual entity/session mapping needs those existing classes.

Tests in `tests/` use Vitest, jsdom and Testing Library. A separate inactive Vitest example and dependency list are supplied. Merge test scripts into your own package.json if needed. The files do not overwrite your existing package manifest, entry point, index.html or router.
