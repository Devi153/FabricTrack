package com.vox.businessportal.domain;

/** Entitlements from the supplied project PDF. Upgrade activation belongs to billing. */
public enum Plan {
  FREE(0, 5, 3, 2, 1),
  STARTER(19, 100, 25, 5, 1),
  BUSINESS(200, Integer.MAX_VALUE, Integer.MAX_VALUE, Integer.MAX_VALUE, 5);
  public final int monthlyPriceInr, fabricLimit, supplierLimit, designsPerGarment, teamMembers;

  Plan(int price, int fabrics, int suppliers, int designs, int members) {
    monthlyPriceInr = price;
    fabricLimit = fabrics;
    supplierLimit = suppliers;
    designsPerGarment = designs;
    teamMembers = members;
  }

  public boolean allowsFabricCount(int count) {
    return count < fabricLimit;
  }
}
