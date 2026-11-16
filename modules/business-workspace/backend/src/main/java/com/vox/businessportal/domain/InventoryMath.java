package com.vox.businessportal.domain;

import java.math.*;
import java.util.List;

public final class InventoryMath {
  private InventoryMath() {}

  public static BigDecimal nextQuantity(
      BigDecimal current, BigDecimal reserved, BigDecimal amount, boolean inward) {
    if (amount.signum() <= 0) throw new PortalException(400, "Enter a positive quantity.");
    var next = inward ? current.add(amount) : current.subtract(amount);
    if (next.compareTo(reserved) < 0)
      throw new PortalException(409, "The movement would use stock reserved for production.");
    return next;
  }

  public static BigDecimal requirement(
      List<BigDecimal> meters, List<Integer> ratio, int sets, BigDecimal waste) {
    BigDecimal total = BigDecimal.ZERO;
    for (int i = 0; i < meters.size(); i++)
      total = total.add(meters.get(i).multiply(BigDecimal.valueOf(ratio.get(i))));
    return total
        .multiply(BigDecimal.valueOf(sets))
        .multiply(BigDecimal.ONE.add(waste.divide(BigDecimal.valueOf(100))))
        .setScale(1, RoundingMode.HALF_UP);
  }

  public static BigDecimal weightedCost(
      BigDecimal quantity, BigDecimal cost, BigDecimal incoming, BigDecimal price) {
    return quantity
        .multiply(cost)
        .add(incoming.multiply(price))
        .divide(quantity.add(incoming), 2, RoundingMode.HALF_UP);
  }
}
