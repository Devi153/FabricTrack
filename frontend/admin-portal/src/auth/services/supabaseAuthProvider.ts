import { configured, supabase } from "../supabase";
import type { AuthProvider } from "../types";

/** Adapter: React components depend on AuthProvider, not the Supabase SDK. */
export const supabaseAuthProvider: AuthProvider = {
  configured,
  async signIn(credentials) {
    if (!supabase) throw new Error("Authentication is not configured.");
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error)
      throw new Error(
        "Unable to sign in. Check your email and password, and try again.",
      );
  },
  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw new Error("Unable to sign out. Please try again.");
  },
  subscribe(listener) {
    if (!supabase) return () => {};
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase dispatches INITIAL_SESSION too. Never await SDK calls inside this callback.
      listener(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  },
};
