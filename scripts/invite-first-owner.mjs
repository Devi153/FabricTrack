/** Run locally once during client handover, never bundle into React. */
import { createRequire } from 'node:module';
const require = createRequire(new URL('../admin-portal/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_ADMIN_KEY, OWNER_EMAIL } = process.env;
if (!SUPABASE_ADMIN_KEY || !OWNER_EMAIL) {
  console.error('Set SUPABASE_ADMIN_KEY and OWNER_EMAIL in this terminal first.');
  process.exit(1);
}
const client = createClient(process.env.SUPABASE_URL || 'http://127.0.0.1:54321', SUPABASE_ADMIN_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
const redirectTo = `${(process.env.ADMIN_PORTAL_URL || 'http://127.0.0.1:5173').replace(/\/+$/, '')}/set-password`;
const { data, error } = await client.auth.admin.inviteUserByEmail(OWNER_EMAIL.trim(), {redirectTo});
if (error || !data.user) {
  console.error('Owner invitation was not completed. Check whether this email already has an account and inspect Supabase locally.');
  process.exit(1);
}
const { error: grantError } = await client.auth.admin.updateUserById(data.user.id, {app_metadata:{role:'PLATFORM_ADMIN',can_manage_admins:true}});
if (grantError) {
  console.error('Email was sent but owner permissions were not activated. Review the user in Supabase before sign-in.');
  process.exit(1);
}
console.log('Owner invitation sent and account-management permission assigned. Open the email, set a password, then sign in.');
