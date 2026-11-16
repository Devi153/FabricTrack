package com.vox.businessportal.application;

import com.vox.businessportal.domain.Models.*;
import java.time.Instant;
import java.util.*;

/** Persistence port keeps authentication rules independent of the JDBC adapter. */
public interface PortalStore {
  void lock(String key);

  Optional<Challenge> findChallenge(UUID id);

  Optional<Challenge> latestChallenge(String phone);

  void putChallenge(Challenge challenge);

  void failedAttempt(UUID id);

  void consumeChallenge(UUID id);

  int deliveryCount(String bucket, Instant now);

  void countDelivery(String bucket, Instant now);

  Owner findOrCreateOwner(String phone);

  void createSession(String digest, UUID ownerId, Instant expiresAt);

  Optional<Owner> ownerBySession(String digest, Instant now);

  void deleteSession(String digest);

  Owner saveProfile(UUID ownerId, Profile profile);

  Owner lockOwner(UUID ownerId);

  List<Fabric> fabrics(UUID ownerId);

  int fabricCount(UUID ownerId);

  Fabric insertFabric(UUID ownerId, NewFabric fabric);
}
