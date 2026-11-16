import { afterEach, describe, expect, it, vi } from "vitest";
import { adminService } from "../services/adminService";
afterEach(() => vi.unstubAllGlobals());
describe("adminService", () => {
  it("sends bearer credentials only in headers", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ userId: "1" }) });
    vi.stubGlobal("fetch", fetcher);
    await adminService.getProfile("private-token");
    expect(fetcher).toHaveBeenCalledWith(
      "/api/admin/me",
      expect.objectContaining({
        headers: { Authorization: "Bearer private-token" },
      }),
    );
  });
  it("maps forbidden responses to a clear error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );
    await expect(adminService.getProfile("token")).rejects.toMatchObject({
      status: 403,
      message: "This account does not have Voxel Fashion admin access.",
    });
  });
});
