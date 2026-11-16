import { supabase } from "../auth/supabase";
export async function inviteAdmin(email: string): Promise<void> {
  if (!supabase) throw new Error("Sign-in is temporarily unavailable.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session)
    throw new Error("Your session has expired. Sign in again.");
  const response = await fetch("/api/admin/team/invitations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ email: email.trim() }),
    signal: AbortSignal.timeout(40000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message ||
        "Unable to confirm the invitation. Contact website support before retrying.",
    );
  }
}
