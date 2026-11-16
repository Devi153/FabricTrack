import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useAdminAuth } from "../hooks/useAdminAuth";
import type { AuthProvider, AdminProfile } from "../types";
import type { AdminService } from "../services/adminService";
const profile: AdminProfile = {
  userId: "1",
  email: "admin@example.test",
  role: "PLATFORM_ADMIN",
};
function dependencies() {
  let listener: (token: string | null) => void = () => {};
  const unsubscribe = vi.fn();
  const provider: AuthProvider = {
    configured: true,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    subscribe: (callback) => {
      listener = callback;
      return unsubscribe;
    },
  };
  const service: AdminService = {
    getProfile: vi.fn().mockResolvedValue(profile),
  };
  return {
    provider,
    service,
    unsubscribe,
    emit: (token: string | null) => act(() => listener(token)),
  };
}
describe("useAdminAuth", () => {
  it("verifies restored sessions against the backend and unsubscribes", async () => {
    const d = dependencies();
    const { result, unmount } = renderHook(() =>
      useAdminAuth(d.provider, d.service),
    );
    d.emit("token");
    await waitFor(() => expect(result.current.admin).toEqual(profile));
    expect(d.service.getProfile).toHaveBeenCalledWith(
      "token",
      expect.any(AbortSignal),
    );
    unmount();
    expect(d.unsubscribe).toHaveBeenCalledOnce();
  });
  it("denies rejected profiles and cleans up the local session", async () => {
    const d = dependencies();
    vi.mocked(d.service.getProfile).mockRejectedValue(
      new Error("Access denied"),
    );
    const { result } = renderHook(() => useAdminAuth(d.provider, d.service));
    d.emit("business");
    await waitFor(() => expect(result.current.error).toBe("Access denied"));
    expect(result.current.admin).toBeNull();
    await waitFor(() => expect(d.provider.signOut).toHaveBeenCalledOnce());
  });
  it("ignores a stale verification after sign-out", async () => {
    const d = dependencies();
    let resolve!: (value: AdminProfile) => void;
    vi.mocked(d.service.getProfile).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { result } = renderHook(() => useAdminAuth(d.provider, d.service));
    d.emit("old-token");
    await waitFor(() => expect(d.service.getProfile).toHaveBeenCalled());
    d.emit(null);
    await act(async () => resolve(profile));
    expect(result.current.admin).toBeNull();
    expect(result.current.checking).toBe(false);
  });
  it("prevents duplicate submissions and reports provider failure", async () => {
    const d = dependencies();
    let reject!: (error: Error) => void;
    vi.mocked(d.provider.signIn).mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    );
    const { result } = renderHook(() => useAdminAuth(d.provider, d.service));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.login({
        email: " admin@example.test ",
        password: "secret",
      });
    });
    await act(async () => {
      await result.current.login({
        email: "admin@example.test",
        password: "secret",
      });
    });
    expect(d.provider.signIn).toHaveBeenCalledOnce();
    expect(d.provider.signIn).toHaveBeenCalledWith({
      email: "admin@example.test",
      password: "secret",
    });
    await act(async () => {
      reject(new Error("Authentication unavailable"));
      await pending;
    });
    expect(result.current.error).toBe("Authentication unavailable");
    expect(result.current.busy).toBe(false);
  });
});
