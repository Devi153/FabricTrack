package com.vox.businessportal.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.vox.businessportal.config.PortalProperties;
import com.vox.businessportal.domain.*;
import com.vox.businessportal.domain.Models.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;

class BusinessAuthServiceTest {
  PortalStore store;
  VerificationSender sender;
  PortalTime time;
  PortalCrypto crypto;
  BusinessAuthService service;
  final Instant now = Instant.parse("2026-11-13T00:00:00Z");
  final String phone = "+919876543210";

  @BeforeEach
  void setup() {
    store = mock(PortalStore.class);
    sender = mock(VerificationSender.class);
    when(sender.channel()).thenReturn(VerificationChannel.PHONE);
    time = mock(PortalTime.class);
    when(time.now()).thenReturn(now);
    crypto =
        new PortalCrypto(
            new PortalProperties(
                "test-only-32-character-secret-please-change", null, true, null, null));
    service = new BusinessAuthService(store, List.of(sender), crypto, time);
  }

  @Test
  void createsFourDigitChallengeWithoutCreatingAnOwner() {
    var result = service.requestOtp(phone, "127.0.0.1");
    var value = ArgumentCaptor.forClass(String.class);
    verify(sender).send(eq(phone), value.capture());
    assertTrue(value.getValue().matches("[0-9]{4}"));
    var challenge = ArgumentCaptor.forClass(Challenge.class);
    verify(store).putChallenge(challenge.capture());
    assertTrue(
        crypto.matches(
            challenge.getValue().digest(), result.challengeId() + ":" + value.getValue()));
    assertEquals(now.plusSeconds(300), challenge.getValue().expiresAt());
    assertEquals(60, result.resendAfterSeconds());
    verify(store, never()).findOrCreateOwner(anyString());
  }

  @Test
  void cooldownRejectsBeforeSending() {
    when(store.latestChallenge(phone))
        .thenReturn(
            Optional.of(
                new Challenge(
                    UUID.randomUUID(),
                    phone,
                    "hash",
                    now.minusSeconds(15),
                    now.plusSeconds(285),
                    0,
                    false)));
    var e = assertThrows(PortalException.class, () -> service.requestOtp(phone, "client"));
    assertEquals(429, e.status());
    assertEquals(45, e.retryAfter());
    verify(sender, never()).send(anyString(), anyString());
  }

  @Test
  void rateLimitRejectsExcessPhoneDelivery() {
    when(store.deliveryCount(eq("phone:" + crypto.digest(phone)), eq(now))).thenReturn(3);
    assertEquals(
        429,
        assertThrows(PortalException.class, () -> service.requestOtp(phone, "client")).status());
    verify(sender, never()).send(anyString(), anyString());
  }

  @Test
  void rateLimitRejectsExcessClientDelivery() {
    when(store.deliveryCount(eq("client:" + crypto.digest("client")), eq(now))).thenReturn(10);
    assertEquals(
        429,
        assertThrows(PortalException.class, () -> service.requestOtp(phone, "client")).status());
    verify(sender, never()).send(anyString(), anyString());
  }

  @Test
  void incorrectCodePersistsAttemptCounter() {
    UUID id = UUID.randomUUID();
    when(store.findChallenge(id))
        .thenReturn(
            Optional.of(
                new Challenge(
                    id, phone, crypto.digest(id + ":1234"), now, now.plusSeconds(300), 0, false)));
    assertThrows(PortalException.class, () -> service.verify(id, "0000"));
    verify(store).failedAttempt(id);
    verify(store, never()).createSession(anyString(), any(), any());
  }

  @Test
  void expiryBoundaryAndReusedCodeReject() {
    for (int caseNumber = 0; caseNumber < 3; caseNumber++) {
      UUID id = UUID.randomUUID();
      when(store.findChallenge(id))
          .thenReturn(
              Optional.of(
                  new Challenge(
                      id,
                      phone,
                      crypto.digest(id + ":1234"),
                      now,
                      caseNumber == 0 ? now : now.plusSeconds(300),
                      caseNumber == 1 ? 5 : 0,
                      caseNumber == 2)));
      assertThrows(PortalException.class, () -> service.verify(id, "1234"));
    }
    verify(store, never()).consumeChallenge(any());
  }

  @Test
  void verifiedCodeCreatesOwnerAndHashedSession() {
    UUID id = UUID.randomUUID();
    Owner owner = new Owner(UUID.randomUUID(), phone, "", "", "", "", false, Plan.FREE);
    when(store.findChallenge(id))
        .thenReturn(
            Optional.of(
                new Challenge(
                    id, phone, crypto.digest(id + ":1234"), now, now.plusSeconds(300), 0, false)));
    when(store.findOrCreateOwner(phone)).thenReturn(owner);
    var result = service.verify(id, "1234");
    assertEquals(owner, result.owner());
    assertEquals(64, result.sessionToken().length());
    verify(store).consumeChallenge(id);
    verify(store)
        .createSession(crypto.digest(result.sessionToken()), owner.id(), now.plusSeconds(28800));
    verify(store).lock("phone:" + crypto.digest(phone));
  }

  @Test
  void rejectsBadPhonesBeforeStorage() {
    for (String target : List.of("123", "919876543210", "+012345678"))
      assertEquals(
          400,
          assertThrows(PortalException.class, () -> service.requestOtp(target, "client")).status());
    verifyNoInteractions(store);
  }

  @Test
  void unknownExpiredSessionRequiresLogin() {
    assertEquals(
        401, assertThrows(PortalException.class, () -> service.requireOwner(null)).status());
    String token = "a".repeat(64);
    when(store.ownerBySession(crypto.digest(token), now)).thenReturn(Optional.empty());
    assertEquals(
        401, assertThrows(PortalException.class, () -> service.requireOwner(token)).status());
  }

  @Test
  void missingDeliveryProviderDoesNotReturnDemoCode() {
    var emptyService = new BusinessAuthService(store, List.of(), crypto, time);
    assertEquals(
        503,
        assertThrows(PortalException.class, () -> emptyService.requestOtp(phone, "client"))
            .status());
  }
}
