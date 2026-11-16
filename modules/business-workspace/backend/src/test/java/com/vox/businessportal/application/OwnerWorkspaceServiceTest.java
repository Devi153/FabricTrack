package com.vox.businessportal.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.vox.businessportal.domain.*;
import com.vox.businessportal.domain.Models.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;

class OwnerWorkspaceServiceTest {
  PortalStore store;
  OwnerWorkspaceService service;
  Owner owner;

  @BeforeEach
  void setup() {
    store = mock(PortalStore.class);
    service = new OwnerWorkspaceService(store);
    owner =
        new Owner(UUID.randomUUID(), "+919876543210", "Owner", "Studio", "", "", true, Plan.FREE);
  }

  NewFabric fabric() {
    return new NewFabric(
        "Cotton",
        "Cotton",
        "Ivory",
        180,
        new BigDecimal("58"),
        new BigDecimal("100"),
        new BigDecimal("185"),
        "A-01");
  }

  @Test
  void newAccountStartsEmptyAndQueriesOnlyCurrentOwner() {
    when(store.fabrics(owner.id())).thenReturn(List.of());
    assertTrue(service.listFabrics(owner).isEmpty());
    verify(store).fabrics(owner.id());
    verifyNoMoreInteractions(store);
  }

  @Test
  void rejectsInventoryBeforeOnboarding() {
    Owner incomplete = new Owner(owner.id(), owner.phone(), "", "", "", "", false, Plan.FREE);
    assertEquals(
        409, assertThrows(PortalException.class, () -> service.listFabrics(incomplete)).status());
    assertThrows(PortalException.class, () -> service.addFabric(incomplete, fabric()));
    verifyNoInteractions(store);
  }

  @Test
  void freePlanRejectsSixthFabric() {
    when(store.lockOwner(owner.id())).thenReturn(owner);
    when(store.fabricCount(owner.id())).thenReturn(5);
    assertEquals(
        409,
        assertThrows(PortalException.class, () -> service.addFabric(owner, fabric())).status());
    verify(store, never()).insertFabric(any(), any());
  }

  @Test
  void validFabricUsesSessionOwnerAndLocksBeforeCheckingLimit() {
    when(store.lockOwner(owner.id())).thenReturn(owner);
    when(store.fabricCount(owner.id())).thenReturn(4);
    service.addFabric(owner, fabric());
    var order = inOrder(store);
    order.verify(store).lockOwner(owner.id());
    order.verify(store).fabricCount(owner.id());
    order.verify(store).insertFabric(eq(owner.id()), any());
  }

  @Test
  void profileIsTrimmedAndSavedToSessionOwner() {
    service.saveProfile(owner, new Profile("  Devi ", " Studio ", "", " Chennai "));
    verify(store).saveProfile(owner.id(), new Profile("Devi", "Studio", "", "Chennai"));
  }

  @Test
  void plansMatchPricingPdf() {
    assertAll(
        () -> assertEquals(0, Plan.FREE.monthlyPriceInr),
        () -> assertEquals(19, Plan.STARTER.monthlyPriceInr),
        () -> assertEquals(200, Plan.BUSINESS.monthlyPriceInr),
        () -> assertFalse(Plan.FREE.allowsFabricCount(5)),
        () -> assertTrue(Plan.STARTER.allowsFabricCount(99)),
        () -> assertFalse(Plan.STARTER.allowsFabricCount(100)),
        () -> assertEquals(3, Plan.FREE.supplierLimit),
        () -> assertEquals(25, Plan.STARTER.supplierLimit),
        () -> assertEquals(5, Plan.BUSINESS.teamMembers),
        () -> assertEquals(2, Plan.FREE.designsPerGarment),
        () -> assertEquals(5, Plan.STARTER.designsPerGarment));
  }
}
