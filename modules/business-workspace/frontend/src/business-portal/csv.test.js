import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, importRecords, toCsv } from "./csv.js";
import { hasFeature, tierName } from "./tiers.js";
test("CSV round trips quoted fabric names, commas and multiline locations", () => {
  const f = {
    name: 'Cotton, "organic"',
    type: "Cotton",
    color: "Ivory",
    gsm: 180,
    widthInches: 58,
    quantityMeters: 100,
    costPerMeter: 185,
    location: "Rack A\nShelf 1",
  };
  assert.deepEqual(importRecords(toCsv([f])), [f]);
  assert.throws(() => parseCsv('"unclosed'), /unclosed/);
});
test("CSV template validation rejects missing specifications and invalid quantities", () => {
  assert.throws(
    () => importRecords("name,quantityMeters\nCotton,10"),
    /column/,
  );
  assert.throws(
    () =>
      importRecords(
        "name,type,color,gsm,widthInches,quantityMeters,costPerMeter\nCotton,Cotton,Ivory,180,58,NaN,185",
      ),
    /invalid number/,
  );
});
test("Standard display preserves Starter entitlement and Business-only feature gates", () => {
  assert.equal(tierName("STARTER"), "Standard");
  assert.equal(hasFeature("FREE", "lowStock"), false);
  assert.equal(hasFeature("STARTER", "lowStock"), true);
  assert.equal(hasFeature("STARTER", "reservation"), false);
  assert.equal(hasFeature("BUSINESS", "reservation"), true);
  assert.equal(hasFeature("FREE", "fullSearch"), false);
});
