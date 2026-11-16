package com.vox.businessportal.infrastructure;

import com.vox.businessportal.application.PortalStore;
import com.vox.businessportal.domain.*;
import com.vox.businessportal.domain.Models.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcPortalStore implements PortalStore {
  private final JdbcTemplate jdbc;
  private final RowMapper<Owner> owner =
      (r, n) ->
          new Owner(
              r.getObject("id", UUID.class),
              r.getString("phone"),
              r.getString("owner_name"),
              r.getString("business_name"),
              r.getString("email"),
              r.getString("city"),
              r.getBoolean("onboarding_complete"),
              Plan.valueOf(r.getString("plan")));
  private final RowMapper<Challenge> challenge =
      (r, n) ->
          new Challenge(
              r.getObject("id", UUID.class),
              r.getString("phone"),
              r.getString("digest"),
              r.getTimestamp("created_at").toInstant(),
              r.getTimestamp("expires_at").toInstant(),
              r.getInt("attempts"),
              r.getBoolean("consumed"));
  private final RowMapper<Fabric> fabric =
      (r, n) ->
          new Fabric(
              r.getObject("id", UUID.class),
              r.getString("name"),
              r.getString("type"),
              r.getString("color"),
              r.getInt("gsm"),
              r.getBigDecimal("width_inches"),
              r.getBigDecimal("quantity_meters"),
              r.getBigDecimal("cost_per_meter"),
              r.getString("location"));

  public JdbcPortalStore(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public void lock(String key) {
    jdbc.query("select pg_advisory_xact_lock(hashtextextended(?,0))", r -> {}, key);
  }

  public Optional<Challenge> findChallenge(UUID id) {
    return jdbc
        .query("select * from business_portal.otp_challenges where id=?", challenge, id)
        .stream()
        .findFirst();
  }

  public Optional<Challenge> latestChallenge(String phone) {
    return jdbc
        .query("select * from business_portal.otp_challenges where phone=?", challenge, phone)
        .stream()
        .findFirst();
  }

  public void putChallenge(Challenge c) {
    jdbc.update("delete from business_portal.otp_challenges where phone=?", c.phone());
    jdbc.update(
        "insert into business_portal.otp_challenges(id,phone,digest,created_at,expires_at)"
            + " values(?,?,?,?,?)",
        c.id(),
        c.phone(),
        c.digest(),
        Timestamp.from(c.createdAt()),
        Timestamp.from(c.expiresAt()));
  }

  public void failedAttempt(UUID id) {
    jdbc.update("update business_portal.otp_challenges set attempts=attempts+1 where id=?", id);
  }

  public void consumeChallenge(UUID id) {
    jdbc.update("update business_portal.otp_challenges set consumed=true where id=?", id);
  }

  public int deliveryCount(String key, Instant now) {
    return jdbc.queryForObject(
        "select coalesce(sum(request_count),0)::integer from business_portal.delivery_limits where"
            + " bucket=? and window_start > ?",
        Integer.class,
        key,
        Timestamp.from(now.minusSeconds(900)));
  }

  public void countDelivery(String key, Instant now) {
    jdbc.update(
        "insert into business_portal.delivery_limits(bucket,window_start,request_count)"
            + " values(?,?,1) on conflict(bucket,window_start) do update set"
            + " request_count=business_portal.delivery_limits.request_count+1",
        key,
        Timestamp.from(now.truncatedTo(java.time.temporal.ChronoUnit.MINUTES)));
  }

  public Owner findOrCreateOwner(String phone) {
    jdbc.update(
        "insert into business_portal.owners(id,phone) values(?,?) on conflict(phone) do nothing",
        UUID.randomUUID(),
        phone);
    return jdbc.queryForObject("select * from business_portal.owners where phone=?", owner, phone);
  }

  public void createSession(String digest, UUID id, Instant expires) {
    jdbc.update(
        "insert into business_portal.sessions(token_digest,owner_id,expires_at) values(?,?,?)",
        digest,
        id,
        Timestamp.from(expires));
  }

  public Optional<Owner> ownerBySession(String digest, Instant now) {
    return jdbc
        .query(
            "select o.* from business_portal.owners o join business_portal.sessions s on"
                + " s.owner_id=o.id where s.token_digest=? and s.expires_at>?",
            owner,
            digest,
            Timestamp.from(now))
        .stream()
        .findFirst();
  }

  public void deleteSession(String digest) {
    jdbc.update("delete from business_portal.sessions where token_digest=?", digest);
  }

  public Owner saveProfile(UUID id, Profile p) {
    jdbc.update(
        "update business_portal.owners set"
            + " owner_name=?,business_name=?,email=?,city=?,onboarding_complete=true where id=?",
        p.ownerName(),
        p.businessName(),
        p.email(),
        p.city(),
        id);
    return jdbc.queryForObject("select * from business_portal.owners where id=?", owner, id);
  }

  public Owner lockOwner(UUID id) {
    return jdbc.queryForObject(
        "select * from business_portal.owners where id=? for update", owner, id);
  }

  public List<Fabric> fabrics(UUID id) {
    return jdbc.query(
        "select * from business_portal.fabrics where owner_id=? order by created_at desc,id",
        fabric,
        id);
  }

  public int fabricCount(UUID id) {
    return jdbc.queryForObject(
        "select count(*)::integer from business_portal.fabrics where owner_id=?",
        Integer.class,
        id);
  }

  public Fabric insertFabric(UUID ownerId, NewFabric f) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "insert into"
            + " business_portal.fabrics(id,owner_id,name,type,color,gsm,width_inches,quantity_meters,cost_per_meter,location)"
            + " values(?,?,?,?,?,?,?,?,?,?)",
        id,
        ownerId,
        f.name(),
        f.type(),
        f.color(),
        f.gsm(),
        f.widthInches(),
        f.quantityMeters(),
        f.costPerMeter(),
        f.location());
    if (f.quantityMeters().signum() > 0) {
      UUID rollId = UUID.randomUUID();
      jdbc.update(
          "insert into business_portal.rolls(id,owner_id,fabric_id,label,quantity_meters,location)"
              + " values(?,?,?,?,?,?)",
          rollId,
          ownerId,
          id,
          "Opening balance",
          f.quantityMeters(),
          f.location());
      jdbc.update(
          "insert into"
              + " business_portal.movements(id,owner_id,fabric_id,roll_id,direction,quantity_meters,note,unit_price)"
              + " values(?,?,?,?,?,?,?,?)",
          UUID.randomUUID(),
          ownerId,
          id,
          rollId,
          "IN",
          f.quantityMeters(),
          "Opening fabric stock",
          f.costPerMeter());
    }
    return jdbc.queryForObject(
        "select * from business_portal.fabrics where owner_id=? and id=?", fabric, ownerId, id);
  }
}
