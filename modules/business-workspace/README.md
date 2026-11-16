# Unconnected business workspace — reference source

This folder preserves the larger unfinished workspace module from the uploaded project. It was outside the active application's component scan and React entry point. It is intentionally outside backend/ and frontend/ source roots, and is not a runnable Maven module.

The source includes domain/application/infrastructure/API packages, related SQL and React workspace components/tests. It uses a different authentication/configuration model from the active business phone/OTP portal. Do not copy its controllers or security configuration into the active build without reconciling API routes, authentication, dependencies and schema changes.

Before future integration: define the intended operational features, reuse the active account/session identity, review and version migrations, add required dependencies, then connect tested endpoints and React routes. ORIGINAL_INTEGRATION.md is historical reference and may contain old folder names.
