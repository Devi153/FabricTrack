// The display name Standard maps to the PDF's Starter entitlement code.
export const tierName = (code) =>
  ({ FREE: "Free", STARTER: "Standard", BUSINESS: "Business" })[code] || "Free";
export const paidFeatures = [
  "lowStock",
  "idleStock",
  "reorder",
  "costAnalysis",
  "priceHistory",
  "fullSearch",
  "sizeBreakdown",
];
export const businessFeatures = [
  "reservation",
  "cuttingWaste",
  "readiness",
  "supplierIntelligence",
];
export function hasFeature(plan, feature) {
  if (businessFeatures.includes(feature)) return plan === "BUSINESS";
  if (paidFeatures.includes(feature))
    return plan === "STARTER" || plan === "BUSINESS";
  return true;
}
export const FEATURE_GROUPS = [
  [
    "Fabric management",
    [
      ["Active fabric records", "5", "100", "Unlimited"],
      ["Photographs", "1 per fabric", "1 per fabric", "1 per fabric"],
      [
        "Type, color, GSM, width & location",
        "Included",
        "Included",
        "Included",
      ],
      ["Search & filters", "Basic", "Full", "Full"],
    ],
  ],
  [
    "Rolls & quality passports",
    [
      ["Multiple rolls & movement history", "Included", "Included", "Included"],
      ["Composition, shrinkage & dye lots", "Included", "Included", "Included"],
      [
        "Defects, quality notes & wash care",
        "Included",
        "Included",
        "Included",
      ],
    ],
  ],
  [
    "Stock & suppliers",
    [
      [
        "Inward, outward, adjustments & valuation",
        "Included",
        "Included",
        "Included",
      ],
      ["Low-stock alerts", "—", "Included", "Included"],
      ["Supplier directory", "3", "25", "Unlimited"],
      [
        "Purchase history & procurement records",
        "Included",
        "Included",
        "Included",
      ],
      ["Historical price comparison", "—", "Included", "Included"],
    ],
  ],
  [
    "Design & consumption",
    [
      ["Design records per garment", "2", "5", "Unlimited"],
      [
        "Fabric links & production calculations",
        "Included",
        "Included",
        "Included",
      ],
      ["Size-wise consumption & history", "Basic", "Full", "Full"],
      ["Production stock reservation", "—", "—", "Included"],
      ["Actual cutting wastage tracking", "—", "—", "Included"],
    ],
  ],
  [
    "Fabric intelligence",
    [
      ["Inventory dashboard", "Basic", "Full", "Full"],
      ["Idle fabrics & cost analysis", "—", "Included", "Included"],
      ["Reorder recommendations", "—", "Basic", "Advanced"],
      ["Production readiness & supplier prices", "—", "—", "Included"],
    ],
  ],
  [
    "Account & data",
    [
      ["Team members", "1", "1", "5"],
      [
        "CSV import/export & mobile interface",
        "Included",
        "Included",
        "Included",
      ],
      [
        "Data security & backups",
        "Configured infrastructure",
        "Configured infrastructure",
        "Configured infrastructure",
      ],
      ["Support", "Self-service", "Email", "Priority email"],
    ],
  ],
];
