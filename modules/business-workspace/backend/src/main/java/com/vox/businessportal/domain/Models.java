package com.vox.businessportal.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class Models {
  private Models() {}

  public record Owner(
      UUID id,
      String phone,
      String ownerName,
      String businessName,
      String email,
      String city,
      boolean onboardingComplete,
      Plan plan) {}

  public record Profile(String ownerName, String businessName, String email, String city) {}

  public record Challenge(
      UUID id,
      String phone,
      String digest,
      Instant createdAt,
      Instant expiresAt,
      int attempts,
      boolean consumed) {}

  public record Fabric(
      UUID id,
      String name,
      String type,
      String color,
      int gsm,
      BigDecimal widthInches,
      BigDecimal quantityMeters,
      BigDecimal costPerMeter,
      String location) {}

  public record NewFabric(
      String name,
      String type,
      String color,
      int gsm,
      BigDecimal widthInches,
      BigDecimal quantityMeters,
      BigDecimal costPerMeter,
      String location) {}
}
