/** Replace this adapter's paths/DTO mapping if you keep your existing owner API. */
export class PortalApiError extends Error {
  constructor(message, status, retryAfter = 0) {
    super(message);
    this.name = "PortalApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
const base = (
  import.meta.env?.VITE_BUSINESS_API_BASE || "/api/business/v1"
).replace(/\/$/, "");
export function createPortalApi(baseUrl = base, fetcher = globalThis.fetch) {
  async function request(path, { method = "GET", body, signal } = {}) {
    const response = await fetcher(baseUrl + path, {
      method,
      credentials: "include",
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let data = null;
    try {
      data = await response.json();
    } catch {}
    if (!response.ok)
      throw new PortalApiError(
        data?.message || "The service is unavailable. Please try again.",
        response.status,
        Number(response.headers.get("Retry-After") || data?.retryAfter || 0),
      );
    return data;
  }
  return {
    session: (signal) => request("/session", { signal }),
    requestOtp: (phone) =>
      request("/auth/otp", { method: "POST", body: { phone } }),
    verifyOtp: (challengeId, code) =>
      request("/auth/verify", { method: "POST", body: { challengeId, code } }),
    logout: () => request("/auth/logout", { method: "POST", body: {} }),
    saveProfile: (profile) =>
      request("/owner/profile", { method: "PUT", body: profile }),
    fabrics: (signal) => request("/fabrics", { signal }),
    workspace: (signal) => request("/workspace", { signal }),
    addSupplier: (body) => request("/suppliers", { method: "POST", body }),
    addRoll: (body) => request("/rolls", { method: "POST", body }),
    moveStock: (body) => request("/movements", { method: "POST", body }),
    savePassport: (id, body) =>
      request(`/fabrics/${id}/passport`, { method: "PUT", body }),
    addDesign: (body) => request("/designs", { method: "POST", body }),
    addPurchase: (body) => request("/purchases", { method: "POST", body }),
    reserveDesign: (id) =>
      request(`/designs/${id}/reserve`, { method: "POST", body: {} }),
    completeDesign: (id, body) =>
      request(`/designs/${id}/complete`, { method: "POST", body }),
    importFabrics: (records) =>
      request("/fabrics/import", { method: "POST", body: { records } }),
    procurement: (body) => request("/procurement", { method: "POST", body }),
    addFabric: (fabric) =>
      request("/fabrics", { method: "POST", body: fabric }),
  };
}
export const portalApi = createPortalApi();
