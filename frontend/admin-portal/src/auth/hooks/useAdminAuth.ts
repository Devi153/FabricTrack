import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthProvider, AdminProfile, Credentials } from "../types";
import { supabaseAuthProvider } from "../services/supabaseAuthProvider";
import { adminService } from "../services/adminService";
import type { AdminService } from "../services/adminService";

function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to complete authentication. Please try again.";
}
/** Injected ports keep orchestration testable and separate from the SDK and UI. */
export function useAdminAuth(
  provider: AuthProvider = supabaseAuthProvider,
  service: AdminService = adminService,
) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [checking, setChecking] = useState(provider.configured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef(false);
  useEffect(() => {
    let active = true;
    let revision = 0;
    let controller: AbortController | undefined;
    const unsubscribe = provider.subscribe((token) => {
      const current = ++revision;
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      setAdmin(null);
      setChecking(Boolean(token));
      if (!token) return;
      // Deferring also keeps sign-out outside Supabase's auth callback lock.
      queueMicrotask(async () => {
        if (!active || current !== revision) return;
        try {
          const profile = await service.getProfile(token, signal);
          if (active && current === revision) {
            setAdmin(profile);
            setError("");
          }
        } catch (failure) {
          if (!active || current !== revision) return;
          setError(message(failure));
          try {
            await provider.signOut();
          } catch {
            /* Access remains denied even if local cleanup fails. */
          }
        } finally {
          if (active && current === revision) setChecking(false);
        }
      });
    });
    return () => {
      active = false;
      ++revision;
      controller?.abort();
      unsubscribe();
    };
  }, [provider, service]);
  const login = useCallback(
    async (credentials: Credentials) => {
      if (operation.current) return;
      operation.current = true;
      setBusy(true);
      setError("");
      try {
        await provider.signIn({
          ...credentials,
          email: credentials.email.trim(),
        });
      } catch (failure) {
        setError(message(failure));
      } finally {
        operation.current = false;
        setBusy(false);
      }
    },
    [provider],
  );
  const logout = useCallback(async () => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      await provider.signOut();
      setAdmin(null);
    } catch (failure) {
      setError(message(failure));
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }, [provider]);
  return {
    admin,
    checking,
    busy,
    error,
    configured: provider.configured,
    login,
    logout,
  };
}
