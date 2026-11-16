package com.vox.businessportal.application;

import static com.vox.businessportal.domain.WorkspaceCollection.*;

import com.vox.businessportal.domain.*;
import com.vox.businessportal.domain.Models.*;
import com.vox.businessportal.domain.WorkspaceRequests.*;
import java.math.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkspaceService {
  private final PortalStore owners;
  private final WorkspaceRepository repository;
  private final OwnerWorkspaceService original;

  public WorkspaceService(
      PortalStore owners, WorkspaceRepository repository, OwnerWorkspaceService original) {
    this.owners = owners;
    this.repository = repository;
    this.original = original;
  }

  private UUID id(Map<String, Object> row, String key) {
    return UUID.fromString(row.get(key).toString());
  }

  private BigDecimal number(Map<String, Object> row, String key) {
    return new BigDecimal(row.getOrDefault(key, 0).toString());
  }

  private void onboarded(Owner owner) {
    if (!owner.onboardingComplete())
      throw new PortalException(409, "Complete your business details first.");
  }

  private Owner begin(Owner owner) {
    onboarded(owner);
    return owners.lockOwner(owner.id());
  }

  private void business(Owner owner) {
    if (owner.plan() != Plan.BUSINESS)
      throw new PortalException(403, "This feature is included in the Business plan.");
  }

  @Transactional(
      readOnly = true,
      isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
  public Map<String, Object> snapshot(Owner owner) {
    onboarded(owner);
    Map<String, Object> result = new LinkedHashMap<>();
    for (var c : WorkspaceCollection.values()) result.put(c.table, repository.list(owner.id(), c));
    return result;
  }

  @Transactional
  public Map<String, Object> addSupplier(Owner owner, Supplier request) {
    Owner current = begin(owner);
    if (repository.list(owner.id(), SUPPLIERS).size() >= current.plan().supplierLimit)
      throw new PortalException(409, "Your supplier limit has been reached.");
    String name = request.name().trim();
    if (repository.list(owner.id(), SUPPLIERS).stream()
        .anyMatch(s -> name.equalsIgnoreCase(s.get("name").toString())))
      throw new PortalException(409, "This supplier is already in your directory.");
    return repository.insert(
        owner.id(),
        SUPPLIERS,
        Map.of(
            "name",
            name,
            "contact",
            request.contact().trim(),
            "email",
            request.email().trim(),
            "phone",
            request.phone().trim()));
  }

  @Transactional
  public Map<String, Object> addRoll(Owner owner, Roll request) {
    begin(owner);
    return receive(
        owner,
        request.fabricId(),
        request.label(),
        request.quantityMeters(),
        request.location(),
        request.dyeLot(),
        null);
  }

  private Map<String, Object> receive(
      Owner owner,
      UUID fabricId,
      String label,
      BigDecimal amount,
      String location,
      String lot,
      BigDecimal receiptPrice) {
    var fabric = repository.find(owner.id(), FABRICS, fabricId);
    var roll =
        repository.insert(
            owner.id(),
            ROLLS,
            Map.of(
                "fabricId",
                fabricId,
                "label",
                label.trim(),
                "quantityMeters",
                amount,
                "reservedMeters",
                BigDecimal.ZERO,
                "location",
                location,
                "dyeLot",
                lot));
    repository.update(
        owner.id(),
        FABRICS,
        fabricId,
        Map.of("quantityMeters", number(fabric, "quantityMeters").add(amount)));
    repository.insert(
        owner.id(),
        MOVEMENTS,
        Map.of(
            "fabricId",
            fabricId,
            "rollId",
            id(roll, "id"),
            "direction",
            "IN",
            "quantityMeters",
            amount,
            "note",
            "New roll: " + label,
            "unitPrice",
            (receiptPrice == null ? number(fabric, "costPerMeter") : receiptPrice)));
    return roll;
  }

  @Transactional
  public Map<String, Object> move(Owner owner, Movement request) {
    begin(owner);
    var roll = repository.find(owner.id(), ROLLS, request.rollId());
    UUID fabricId = id(roll, "fabricId");
    var fabric = repository.find(owner.id(), FABRICS, fabricId);
    boolean inward = request.direction().equals("IN") || request.direction().equals("ADJUST_IN");
    BigDecimal next =
        InventoryMath.nextQuantity(
            number(roll, "quantityMeters"),
            number(roll, "reservedMeters"),
            request.quantityMeters(),
            inward);
    repository.update(owner.id(), ROLLS, request.rollId(), Map.of("quantityMeters", next));
    BigDecimal nextFabric =
        inward
            ? number(fabric, "quantityMeters").add(request.quantityMeters())
            : number(fabric, "quantityMeters").subtract(request.quantityMeters());
    repository.update(owner.id(), FABRICS, fabricId, Map.of("quantityMeters", nextFabric));
    return repository.insert(
        owner.id(),
        MOVEMENTS,
        Map.of(
            "fabricId",
            fabricId,
            "rollId",
            request.rollId(),
            "direction",
            request.direction(),
            "quantityMeters",
            request.quantityMeters(),
            "note",
            request.note(),
            "unitPrice",
            number(fabric, "costPerMeter")));
  }

  @Transactional
  public Map<String, Object> passport(Owner owner, UUID fabricId, Passport request) {
    begin(owner);
    repository.find(owner.id(), FABRICS, fabricId);
    if (request.supplierId() != null) repository.find(owner.id(), SUPPLIERS, request.supplierId());
    if (!request.photoDataUrl().isBlank()) validateImage(request.photoDataUrl());
    Map<String, Object> settings = new LinkedHashMap<>();
    settings.put("minStockQuantity", request.minStockQuantity());
    settings.put("supplierId", request.supplierId());
    repository.update(owner.id(), FABRICS, fabricId, settings);
    var values =
        Map.<String, Object>of(
            "fabricId",
            fabricId,
            "composition",
            request.composition(),
            "shrinkagePercent",
            request.shrinkagePercent(),
            "dyeLot",
            request.dyeLot(),
            "shade",
            request.shade(),
            "care",
            request.care(),
            "notes",
            request.notes(),
            "photoDataUrl",
            request.photoDataUrl());
    var existing =
        repository.list(owner.id(), PASSPORTS).stream()
            .filter(p -> fabricId.toString().equals(p.get("fabricId").toString()))
            .findFirst();
    return existing.isPresent()
        ? repository.update(owner.id(), PASSPORTS, id(existing.get(), "id"), values)
        : repository.insert(owner.id(), PASSPORTS, values);
  }

  private void validateImage(String data) {
    if (!data.matches("^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$"))
      throw new PortalException(400, "Use a JPG, PNG or WebP fabric photograph.");
    try {
      byte[] bytes = Base64.getDecoder().decode(data.substring(data.indexOf(',') + 1));
      if (bytes.length > 307200 || bytes.length < 12) throw new IllegalArgumentException();
      boolean jpeg = (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255;
      boolean png = (bytes[0] & 255) == 137 && bytes[1] == 80 && bytes[2] == 78 && bytes[3] == 71;
      boolean webp =
          bytes[0] == 82
              && bytes[1] == 73
              && bytes[2] == 70
              && bytes[3] == 70
              && bytes[8] == 87
              && bytes[9] == 69
              && bytes[10] == 66
              && bytes[11] == 80;
      if (!(jpeg || png || webp)) throw new IllegalArgumentException();
    } catch (IllegalArgumentException e) {
      throw new PortalException(400, "The fabric photograph is invalid or larger than 300 KB.");
    }
  }

  @Transactional
  public Map<String, Object> design(Owner owner, Design request) {
    Owner current = begin(owner);
    repository.find(owner.id(), FABRICS, request.fabricId());
    if (current.plan() == Plan.FREE && request.measurements().size() > 1)
      throw new PortalException(403, "Size breakdowns are included in Standard and Business.");
    String key = request.garmentName().trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    long count =
        repository.list(owner.id(), DESIGNS).stream()
            .filter(d -> key.equals(d.get("garmentKey")))
            .count();
    if (count >= current.plan().designsPerGarment)
      throw new PortalException(409, "The design-record limit for this garment has been reached.");
    BigDecimal required =
        InventoryMath.requirement(
            request.measurements().stream().map(SizeRow::meters).toList(),
            request.measurements().stream().map(SizeRow::units).toList(),
            request.productionSets(),
            request.wastagePercent());
    return repository.insert(
        owner.id(),
        DESIGNS,
        Map.of(
            "garmentKey",
            key,
            "garmentName",
            request.garmentName().trim(),
            "name",
            request.name().trim(),
            "fabricId",
            request.fabricId(),
            "measurements",
            request.measurements(),
            "productionSets",
            request.productionSets(),
            "wastagePercent",
            request.wastagePercent(),
            "requiredMeters",
            required,
            "state",
            "PLANNED"));
  }

  @Transactional
  public Map<String, Object> purchase(Owner owner, Purchase request) {
    begin(owner);
    repository.find(owner.id(), SUPPLIERS, request.supplierId());
    var fabric = repository.find(owner.id(), FABRICS, request.fabricId());
    var roll =
        receive(
            owner,
            request.fabricId(),
            request.rollLabel(),
            request.quantityMeters(),
            request.location(),
            request.dyeLot(),
            request.unitPrice());
    var weighted =
        InventoryMath.weightedCost(
            number(fabric, "quantityMeters"),
            number(fabric, "costPerMeter"),
            request.quantityMeters(),
            request.unitPrice());
    repository.update(
        owner.id(),
        FABRICS,
        request.fabricId(),
        Map.of("costPerMeter", weighted, "supplierId", request.supplierId()));
    return repository.insert(
        owner.id(),
        PURCHASES,
        Map.of(
            "supplierId",
            request.supplierId(),
            "fabricId",
            request.fabricId(),
            "rollId",
            id(roll, "id"),
            "quantityMeters",
            request.quantityMeters(),
            "unitPrice",
            request.unitPrice(),
            "reference",
            request.reference()));
  }

  @Transactional
  public Map<String, Object> reserve(Owner owner, UUID designId) {
    Owner current = begin(owner);
    business(current);
    var design = repository.find(owner.id(), DESIGNS, designId);
    if (!"PLANNED".equals(design.get("state")))
      throw new PortalException(409, "Only a planned design can be reserved.");
    UUID fabricId = id(design, "fabricId");
    var rolls =
        repository.list(owner.id(), ROLLS).stream()
            .filter(r -> fabricId.toString().equals(r.get("fabricId").toString()))
            .toList();
    BigDecimal required = number(design, "requiredMeters");
    BigDecimal available =
        rolls.stream()
            .map(r -> number(r, "quantityMeters").subtract(number(r, "reservedMeters")))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    if (available.compareTo(required) < 0)
      throw new PortalException(409, "Available roll stock cannot cover this production plan.");
    BigDecimal remaining = required;
    for (var roll : rolls) {
      BigDecimal take =
          number(roll, "quantityMeters").subtract(number(roll, "reservedMeters")).min(remaining);
      if (take.signum() > 0) {
        repository.update(
            owner.id(),
            ROLLS,
            id(roll, "id"),
            Map.of("reservedMeters", number(roll, "reservedMeters").add(take)));
        repository.insert(
            owner.id(),
            RESERVATIONS,
            Map.of(
                "designId",
                designId,
                "rollId",
                id(roll, "id"),
                "quantityMeters",
                take,
                "state",
                "ACTIVE"));
        remaining = remaining.subtract(take);
      }
      if (remaining.signum() == 0) break;
    }
    return repository.update(owner.id(), DESIGNS, designId, Map.of("state", "RESERVED"));
  }

  @Transactional
  public Map<String, Object> complete(Owner owner, UUID designId, Complete request) {
    Owner current = begin(owner);
    business(current);
    var design = repository.find(owner.id(), DESIGNS, designId);
    if (!"RESERVED".equals(design.get("state")))
      throw new PortalException(409, "Reserve the production batch before completing it.");
    if (request.actualWastageMeters().compareTo(number(design, "requiredMeters")) > 0)
      throw new PortalException(400, "Wastage cannot exceed the reserved batch quantity.");
    for (var reservation : repository.list(owner.id(), RESERVATIONS)) {
      if (!designId.toString().equals(reservation.get("designId").toString())
          || !"ACTIVE".equals(reservation.get("state"))) continue;
      UUID rollId = id(reservation, "rollId");
      var roll = repository.find(owner.id(), ROLLS, rollId);
      BigDecimal amount = number(reservation, "quantityMeters");
      repository.update(
          owner.id(),
          ROLLS,
          rollId,
          Map.of(
              "quantityMeters",
              number(roll, "quantityMeters").subtract(amount),
              "reservedMeters",
              number(roll, "reservedMeters").subtract(amount)));
      repository.update(
          owner.id(), RESERVATIONS, id(reservation, "id"), Map.of("state", "CONSUMED"));
      repository.insert(
          owner.id(),
          MOVEMENTS,
          Map.of(
              "fabricId",
              id(design, "fabricId"),
              "rollId",
              rollId,
              "direction",
              "OUT",
              "quantityMeters",
              amount,
              "note",
              "Production completed: " + design.get("name"),
              "unitPrice",
              BigDecimal.ZERO));
    }
    UUID fabricId = id(design, "fabricId");
    var fabric = repository.find(owner.id(), FABRICS, fabricId);
    repository.update(
        owner.id(),
        FABRICS,
        fabricId,
        Map.of(
            "quantityMeters",
            number(fabric, "quantityMeters").subtract(number(design, "requiredMeters"))));
    return repository.update(
        owner.id(),
        DESIGNS,
        designId,
        Map.of("state", "COMPLETED", "actualWastageMeters", request.actualWastageMeters()));
  }

  @Transactional
  public List<Fabric> importFabrics(Owner owner, Import request) {
    begin(owner);
    List<Fabric> result = new ArrayList<>();
    for (var r : request.records())
      result.add(
          original.addFabric(
              owner,
              new NewFabric(
                  r.name(),
                  r.type(),
                  r.color(),
                  r.gsm(),
                  r.widthInches(),
                  r.quantityMeters(),
                  r.costPerMeter(),
                  r.location())));
    return result;
  }

  @Transactional
  public Map<String, Object> procurement(Owner owner, Procurement request) {
    begin(owner);
    repository.find(owner.id(), FABRICS, request.fabricId());
    return repository.insert(
        owner.id(),
        PROCUREMENT,
        Map.of(
            "fabricId",
            request.fabricId(),
            "quantityMeters",
            request.quantityMeters(),
            "note",
            request.note(),
            "state",
            "DRAFT"));
  }
}
