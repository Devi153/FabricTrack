import { supabase } from "../supabase";
export interface PasswordService {
  requestReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  hasSession(): Promise<boolean>;
}
export const passwordService: PasswordService = {
  async requestReset(email) {
    if (!supabase)
      throw new Error("Password recovery is temporarily unavailable.");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/set-password`,
    });
    if (error)
      throw new Error("Unable to send the reset link. Please try again later.");
  },
  async hasSession() {
    if (!supabase) return false;
    const { data, error } = await supabase.auth.getSession();
    return !error && Boolean(data.session);
  },
  async updatePassword(password) {
    if (!supabase)
      throw new Error("Password setup is temporarily unavailable.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error)
      throw new Error(
        "Unable to save your password. Use a different strong password or request a new link.",
      );
    // Require an explicit password login after recovery or invitation acceptance.
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "local",
    });
    if (signOutError)
      throw new Error(
        "Password saved. Please close this tab and sign in again.",
      );
  },
};
