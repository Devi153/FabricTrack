import { test } from "node:test";
import assert from "node:assert/strict";
import { createPortalApi } from "./api.js";
test("business API uses secure session credentials and owner-free fabric payloads", async () => {
  const calls = [];
  const api = createPortalApi("/api/business/v1", async (url, options) => {
    calls.push([url, options]);
    return new Response(JSON.stringify({ id: "record" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  });
  await api.addFabric({ name: "Owner fabric" });
  assert.equal(calls[0][0], "/api/business/v1/fabrics");
  assert.equal(calls[0][1].credentials, "include");
  assert.equal(calls[0][1].cache, "no-store");
  assert.deepEqual(JSON.parse(calls[0][1].body), { name: "Owner fabric" });
});
test("delivery throttling propagates server retry timing", async () => {
  const api = createPortalApi(
    "/business",
    async () =>
      new Response(JSON.stringify({ message: "Wait", retryAfter: 45 }), {
        status: 429,
        headers: { "Retry-After": "45" },
      }),
  );
  await assert.rejects(
    api.requestOtp("+919876543210"),
    (e) => e.status === 429 && e.retryAfter === 45,
  );
});
test("an unavailable API raises an error instead of simulating authentication", async () => {
  const api = createPortalApi(
    "/business",
    async () => new Response("Offline", { status: 503 }),
  );
  await assert.rejects(api.verifyOtp("id", "2468"), (e) => e.status === 503);
});
