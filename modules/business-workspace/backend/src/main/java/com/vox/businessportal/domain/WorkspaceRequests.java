package com.vox.businessportal.domain;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;

public final class WorkspaceRequests {
  private WorkspaceRequests() {}

  public record Supplier(
      @NotBlank @Size(max = 120) String name,
      @NotNull @Size(max = 120) String contact,
      @NotNull @Email @Size(max = 254) String email,
      @NotNull @Size(max = 30) String phone) {}

  public record Roll(
      @NotNull UUID fabricId,
      @NotBlank @Size(max = 80) String label,
      @NotNull @DecimalMin("0.1") @DecimalMax("100000000") @Digits(integer = 9, fraction = 1)
          BigDecimal quantityMeters,
      @NotNull @Size(max = 100) String location,
      @NotNull @Size(max = 100) String dyeLot) {}

  public record Movement(
      @NotNull UUID rollId,
      @NotBlank @Pattern(regexp = "IN|OUT|ADJUST_IN|ADJUST_OUT") String direction,
      @NotNull @DecimalMin("0.1") @DecimalMax("100000000") @Digits(integer = 9, fraction = 1)
          BigDecimal quantityMeters,
      @NotNull @Size(max = 500) String note) {}

  public record Passport(
      @NotNull @Size(max = 250) String composition,
      @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal shrinkagePercent,
      @NotNull @Size(max = 100) String dyeLot,
      @NotNull @Size(max = 100) String shade,
      @NotNull @Size(max = 500) String care,
      @NotNull @Size(max = 2000) String notes,
      @NotNull @Size(max = 420000) String photoDataUrl,
      @NotNull @DecimalMin("0") @DecimalMax("100000000") BigDecimal minStockQuantity,
      UUID supplierId) {}

  public record SizeRow(
      @NotBlank @Size(max = 20) String size,
      @NotNull @DecimalMin("0.1") @DecimalMax("1000") BigDecimal meters,
      @Min(1) @Max(1000) int units) {}

  public record Design(
      @NotBlank @Size(max = 120) String garmentName,
      @NotBlank @Size(max = 120) String name,
      @NotNull UUID fabricId,
      @NotEmpty @Size(max = 20) List<@Valid SizeRow> measurements,
      @Min(1) @Max(1000000) int productionSets,
      @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal wastagePercent) {}

  public record Purchase(
      @NotNull UUID supplierId,
      @NotNull UUID fabricId,
      @NotBlank @Size(max = 80) String rollLabel,
      @NotNull @DecimalMin("0.1") @DecimalMax("100000000") BigDecimal quantityMeters,
      @NotNull @DecimalMin("0") @DecimalMax("10000000") BigDecimal unitPrice,
      @NotNull @Size(max = 100) String location,
      @NotNull @Size(max = 100) String dyeLot,
      @NotNull @Size(max = 120) String reference) {}

  public record Complete(
      @NotNull @DecimalMin("0") @DecimalMax("100000000") BigDecimal actualWastageMeters) {}

  public record FabricInput(
      @NotBlank @Size(max = 120) String name,
      @NotBlank @Pattern(regexp = "Cotton|Linen|Silk|Denim|Knit|Other") String type,
      @NotBlank @Size(max = 60) String color,
      @Min(1) @Max(2000) int gsm,
      @NotNull @DecimalMin("0.1") @DecimalMax("200") @Digits(integer = 3, fraction = 1)
          BigDecimal widthInches,
      @NotNull @DecimalMin("0") @DecimalMax("100000000") @Digits(integer = 9, fraction = 1)
          BigDecimal quantityMeters,
      @NotNull @DecimalMin("0") @DecimalMax("10000000") @Digits(integer = 8, fraction = 2)
          BigDecimal costPerMeter,
      @NotNull @Size(max = 100) String location) {}

  public record Import(@NotEmpty @Size(max = 1000) List<@Valid FabricInput> records) {}

  public record Procurement(
      @NotNull UUID fabricId,
      @NotNull @DecimalMin("0.1") @DecimalMax("100000000") BigDecimal quantityMeters,
      @NotNull @Size(max = 1000) String note) {}
}
