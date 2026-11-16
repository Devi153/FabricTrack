package com.vox.businessportal.domain;

import java.util.Set;

public enum WorkspaceCollection {
  FABRICS(
      "fabrics",
      "name type color gsm widthInches quantityMeters costPerMeter location minStockQuantity"
          + " supplierId"),
  SUPPLIERS("suppliers", "name contact email phone"),
  ROLLS("rolls", "fabricId label quantityMeters reservedMeters location dyeLot"),
  PASSPORTS(
      "passports", "fabricId composition shrinkagePercent dyeLot shade care notes photoDataUrl"),
  MOVEMENTS("movements", "fabricId rollId direction quantityMeters note unitPrice"),
  DESIGNS(
      "designs",
      "garmentKey garmentName name fabricId measurements productionSets wastagePercent"
          + " requiredMeters state actualWastageMeters"),
  PURCHASES("purchases", "supplierId fabricId rollId quantityMeters unitPrice reference"),
  RESERVATIONS("reservations", "designId rollId quantityMeters state"),
  PROCUREMENT("procurement", "fabricId quantityMeters note state");
  public final String table;
  public final Set<String> fields;

  WorkspaceCollection(String table, String fields) {
    this.table = table;
    this.fields = Set.of(fields.split(" "));
  }
}
