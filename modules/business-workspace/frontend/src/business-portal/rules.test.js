import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePhone,
  validPhone,
  validOtp,
  nextScreen,
  secondsRemaining,
  PLAN_CATALOG,
} from "./rules.js";
test("international phone normalization handles pasted full numbers", () => {
  assert.equal(normalizePhone("+91", "98765 43210"), "+919876543210");
  assert.equal(normalizePhone("+91", "+44 (7700) 900123"), "+447700900123");
  assert.ok(validPhone("+919876543210"));
  assert.equal(validPhone("919876543210"), false);
});
test("only exactly four numeric digits are valid codes", () => {
  assert.ok(validOtp("0123"));
  for (const value of ["123", "12345", "12ab", ""])
    assert.equal(validOtp(value), false);
});
test("verified owners must finish setup before dashboard", () => {
  assert.equal(nextScreen(null), "login");
  assert.equal(nextScreen({ onboardingComplete: false }), "onboarding");
  assert.equal(nextScreen({ onboardingComplete: true }), "workspace");
});
test("countdown expires exactly at zero", () => {
  assert.equal(secondsRemaining(60000, 59500), 1);
  assert.equal(secondsRemaining(60000, 60000), 0);
  assert.equal(secondsRemaining(60000, 61000), 0);
});
test("plan metadata matches supplied Free Standard Business display mapping", () => {
  assert.deepEqual(
    PLAN_CATALOG.map((p) => [
      p.name,
      p.price,
      p.fabricLimit,
      p.supplierLimit,
      p.designsPerGarment,
      p.teamMembers,
    ]),
    [
      ["Free", 0, 5, 3, 2, 1],
      ["Standard", 19, 100, 25, 5, 1],
      ["Business", 200, null, null, null, 5],
    ],
  );
});
