// The PDF calls the middle plan STARTER, not Standard. Paid activation belongs to billing.
export const PLAN_CATALOG = Object.freeze([
  {
    code: "FREE",
    name: "Free",
    price: 0,
    fabricLimit: 5,
    supplierLimit: 3,
    designsPerGarment: 2,
    teamMembers: 1,
  },
  {
    code: "STARTER",
    name: "Standard",
    price: 19,
    fabricLimit: 100,
    supplierLimit: 25,
    designsPerGarment: 5,
    teamMembers: 1,
  },
  {
    code: "BUSINESS",
    name: "Business",
    price: 200,
    fabricLimit: null,
    supplierLimit: null,
    designsPerGarment: null,
    teamMembers: 5,
  },
]);
export function normalizePhone(countryCode, nationalNumber) {
  const raw = String(nationalNumber).trim();
  if (raw.startsWith("+")) return raw.replace(/[\s()-]/g, "");
  return countryCode + raw.replace(/[\s()-]/g, "");
}
export function validPhone(value) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}
export function validOtp(value) {
  return /^\d{4}$/.test(value);
}
export function secondsRemaining(instant, now = Date.now()) {
  return Math.max(0, Math.ceil((instant - now) / 1000));
}
export function nextScreen(user) {
  if (!user) return "login";
  return user.onboardingComplete ? "workspace" : "onboarding";
}
