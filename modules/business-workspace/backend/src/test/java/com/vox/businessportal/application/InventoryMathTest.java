package com.vox.businessportal.application;

import static org.junit.jupiter.api.Assertions.*;

import com.vox.businessportal.domain.*;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class InventoryMathTest {
  BigDecimal n(String value) {
    return new BigDecimal(value);
  }

  @Test
  void consumptionUsesExactDecimalArithmeticAndSizeRatios() {
    assertEquals(
        n("504.0"),
        InventoryMath.requirement(
            List.of(n("1.4"), n("1.6"), n("1.8")), List.of(1, 1, 1), 100, n("5")));
  }

  @Test
  void reservedStockCannotBeConsumedByOrdinaryIssue() {
    assertEquals(
        409,
        assertThrows(
                PortalException.class,
                () -> InventoryMath.nextQuantity(n("100"), n("60"), n("41"), false))
            .status());
    assertEquals(n("60"), InventoryMath.nextQuantity(n("100"), n("60"), n("40"), false));
  }

  @Test
  void weightedCostReflectsNewReceiptWithoutChangingHistoricalPrice() {
    assertEquals(n("133.33"), InventoryMath.weightedCost(n("100"), n("100"), n("50"), n("200")));
  }
}
