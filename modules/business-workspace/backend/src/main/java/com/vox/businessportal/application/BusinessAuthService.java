package com.vox.businessportal.application;

import com.vox.businessportal.domain.*;
import com.vox.businessportal.domain.Models.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BusinessAuthService {
  private final PortalStore store;
  private final List<VerificationSender> senders;
  private final PortalCrypto crypto;
  private final PortalTime time;

  public BusinessAuthService(
      PortalStore store, List<VerificationSender> senders, PortalCrypto crypto, PortalTime time) {
    this.store = store;
    this.senders = List.copyOf(senders);
    this.crypto = crypto;
    this.time = time;
  }

  public record OtpRequested(UUID challengeId, int expiresInSeconds, int resendAfterSeconds) {}

  public record Verified(Owner owner, String sessionToken) {}

  @Transactional
  public OtpRequested requestOtp(String phone, String clientAddress) {
    if (phone == null || !phone.matches("\\+[1-9][0-9]{7,14}"))
      throw new PortalException(
          400, "Use an international phone number beginning with + and its country code.");
    Instant now = time.now();
    String phoneKey = "phone:" + crypto.digest(phone),
        clientKey = "client:" + crypto.digest(clientAddress);
    // Sorted transaction locks keep shared IP/phone rate counters consistent across instances.
    java.util.stream.Stream.of(phoneKey, clientKey).sorted().forEach(store::lock);
    store
        .latestChallenge(phone)
        .ifPresent(
            previous -> {
              long seconds = Duration.between(previous.createdAt(), now).getSeconds();
              if (seconds < 60)
                throw new PortalException(
                    429, "Please wait before requesting another code.", (int) (60 - seconds));
            });
    if (store.deliveryCount(phoneKey, now) >= 3 || store.deliveryCount(clientKey, now) >= 10)
      throw new PortalException(
          429, "Too many verification requests. Please try again in 15 minutes.", 900);
    String code = crypto.code();
    UUID id = UUID.randomUUID();
    store.putChallenge(
        new Challenge(
            id, phone, crypto.digest(id + ":" + code), now, now.plusSeconds(300), 0, false));
    senders.stream()
        .filter(sender -> sender.channel() == VerificationChannel.PHONE)
        .findFirst()
        .orElseThrow(() -> new PortalException(503, "Phone verification delivery is unavailable."))
        .send(phone, code);
    store.countDelivery(phoneKey, now);
    store.countDelivery(clientKey, now);
    return new OtpRequested(id, 300, 60);
  }

  @Transactional(noRollbackFor = PortalException.class)
  public Verified verify(UUID id, String code) {
    Challenge first = store.findChallenge(id).orElseThrow(PortalException::invalidCode);
    store.lock("phone:" + crypto.digest(first.phone()));
    Challenge challenge = store.findChallenge(id).orElseThrow(PortalException::invalidCode);
    if (challenge.consumed()
        || challenge.attempts() >= 5
        || !time.now().isBefore(challenge.expiresAt())) throw PortalException.invalidCode();
    if (code == null
        || !code.matches("[0-9]{4}")
        || !crypto.matches(challenge.digest(), id + ":" + code)) {
      store.failedAttempt(id);
      throw PortalException.invalidCode();
    }
    store.consumeChallenge(id);
    Owner owner = store.findOrCreateOwner(challenge.phone());
    String token = crypto.token();
    store.createSession(crypto.digest(token), owner.id(), time.now().plusSeconds(28800));
    return new Verified(owner, token);
  }

  @Transactional(readOnly = true)
  public Owner requireOwner(String token) {
    if (token == null || !token.matches("[a-f0-9]{64}")) throw PortalException.unauthorized();
    return store
        .ownerBySession(crypto.digest(token), time.now())
        .orElseThrow(PortalException::unauthorized);
  }

  @Transactional
  public void logout(String token) {
    if (token != null && token.matches("[a-f0-9]{64}")) store.deleteSession(crypto.digest(token));
  }
}
