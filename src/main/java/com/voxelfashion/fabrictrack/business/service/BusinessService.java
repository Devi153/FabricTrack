package com.voxelfashion.fabrictrack.business.service;
import com.voxelfashion.fabrictrack.business.repository.BusinessStore;
import com.voxelfashion.fabrictrack.business.exception.BusinessProblem;
import com.voxelfashion.fabrictrack.business.security.OtpSecurity;
import com.voxelfashion.fabrictrack.business.sms.SmsSender;
import java.sql.*;
import java.util.*;
import static com.voxelfashion.fabrictrack.business.repository.BusinessStore.*;
public final class BusinessService {
    private final BusinessStore db;
    private final SmsSender sms;
    private final String pepper;
    public BusinessService(BusinessStore db, SmsSender sms, String pepper) {
        if (pepper.length() < 32) throw new IllegalStateException("BUSINESS_OTP_PEPPER must contain at least 32 characters.");
        this.db=db; this.sms=sms; this.pepper=pepper;
    }
    public boolean development() { return sms.development(); }
    public record Challenge(String challengeId, int expiresIn, int resendAfter, boolean development) {}
    public record Account(String id, String name, String phone, String plan) {}
    public record Login(String token, int expiresIn, Account account) {}
    public Challenge start(String rawPhone, String rawName, String purpose, String ip) throws SQLException {
        String phone=OtpSecurity.phone(rawPhone);
        if (!Set.of("register","login").contains(purpose == null ? "" : purpose)) throw new BusinessProblem(400,"Choose registration or login.");
        String name=purpose.equals("register") ? OtpSecurity.name(rawName) : "";
        UUID id=UUID.randomUUID();
        // Same-phone and same-IP requests serialize across backend instances.
        try (var c=db.open()) {
            c.setAutoCommit(false);
            lock(c,"ip:"+ip); lock(c,"phone:"+phone);
            boolean present=exists(c,"select 1 from business_private.accounts where phone=?",phone);
            if (purpose.equals("register") && present)
                throw new BusinessProblem(409,"This mobile number is already registered. Please sign in.");
            String code=OtpSecurity.code();
            update(c,"delete from business_private.send_events where created_at < now() - interval '1 day'");
            if (exists(c,"select 1 from business_private.send_events where phone=? and created_at > now()-interval '60 seconds'",phone))
                throw new BusinessProblem(429,"Please wait 60 seconds before requesting another code.");
            try (var s=query(c,"select count(*) from business_private.send_events where created_at>now()-interval '1 hour' and (phone=? or ip_hash=?)",phone,OtpSecurity.digest(pepper,ip)); var r=s.executeQuery()) {
                r.next(); if (r.getInt(1)>=10) throw new BusinessProblem(429,"Too many OTP requests. Try again in one hour.");
            }
            // Unknown login phones receive the same generic challenge response.
            update(c,"delete from business_private.challenges where phone=? or expires_at<now()",phone);
            update(c,"insert into business_private.send_events(phone,ip_hash) values (?,?)",phone,OtpSecurity.digest(pepper,ip));
            if (purpose.equals("register") || present) {
                update(c,"insert into business_private.challenges(id,phone,display_name,code_hash,expires_at) values (?,?,?,?,now()+interval '5 minutes')",
                    id,phone,name,OtpSecurity.digest(pepper,id+":"+code));
            }
            c.commit();
            if (purpose.equals("register") || present) {
                try { sms.send(phone,code); }
                catch (BusinessProblem e) {
                    try (var clean=db.open()) { update(clean,"delete from business_private.challenges where id=?",id); }
                    throw e;
                }
            }
        }
        return new Challenge(id.toString(),300,60,sms.development());
    }
    public Login verify(String rawId, String code) throws SQLException {
        UUID id;
        try { id=UUID.fromString(rawId); } catch (Exception e) { throw new BusinessProblem(400,"Invalid verification request."); }
        if (code==null || !code.matches("[0-9]{4}")) throw new BusinessProblem(400,"Enter the four-digit code.");
        try (var c=db.open()) {
            c.setAutoCommit(false);
            String phone,name,hash; int attempts;
            try (var s=query(c,"select phone,display_name,code_hash,attempts,expires_at>now() as valid from business_private.challenges where id=? for update",id);var r=s.executeQuery()) {
                if (!r.next() || !r.getBoolean("valid")) throw new BusinessProblem(400,"Code expired or invalid. Request another code.");
                phone=r.getString("phone");name=r.getString("display_name");hash=r.getString("code_hash");attempts=r.getInt("attempts");
            }
            if (attempts>=5) throw new BusinessProblem(429,"Too many attempts. Request another code.");
            if (!OtpSecurity.equal(hash,OtpSecurity.digest(pepper,id+":"+code))) {
                update(c,"update business_private.challenges set attempts=attempts+1 where id=?",id);
                c.commit(); // Failed attempts must survive the rejected request.
                throw new BusinessProblem(attempts==4?429:400, attempts==4?"Too many attempts. Request another code.":"Incorrect code. Please try again.");
            }
            // Registration challenges have a validated name; login challenges have an empty name.
            // Retain the existing schema and use its unique phone constraint for concurrent requests.
            if (!name.isEmpty()) {
                try (var insert=query(c,"insert into business_private.accounts(id,phone,display_name) values (?,?,?) on conflict(phone) do nothing",UUID.randomUUID(),phone,name)) {
                    if (insert.executeUpdate() == 0)
                        throw new BusinessProblem(409,"This mobile number is already registered. Please sign in.");
                }
            }
            Account account;
            try (var s=query(c,"select * from business_private.accounts where phone=?",phone);var r=s.executeQuery()) {
                if (!r.next()) throw new BusinessProblem(400,"Account not found. Please create an account first.");
                account=account(r);
            }
            String token=OtpSecurity.token();
            update(c,"delete from business_private.sessions where expires_at<now()");
            update(c,"insert into business_private.sessions(token_hash,account_id,expires_at) values (?,?,now()+interval '8 hours')",
                OtpSecurity.digest(pepper,token),UUID.fromString(account.id()));
            update(c,"delete from business_private.challenges where id=?",id);
            c.commit();
            return new Login(token,28800,account);
        }
    }
    private Account account(ResultSet r) throws SQLException {
        return new Account(r.getString("id"),r.getString("display_name"),r.getString("phone"),r.getString("plan"));
    }
    public Account authenticate(String token) throws SQLException {
        if (token==null || !token.matches("[A-Za-z0-9_-]{43}")) throw new BusinessProblem(401,"Please sign in to continue.");
        try (var c=db.open();var s=query(c,"select a.* from business_private.accounts a join business_private.sessions s on a.id=s.account_id where s.token_hash=? and s.expires_at>now()",OtpSecurity.digest(pepper,token));var r=s.executeQuery()) {
            if (!r.next()) throw new BusinessProblem(401,"Your session has expired. Please sign in again.");
            return account(r);
        }
    }
    public void logout(String token) throws SQLException {
        try (var c=db.open()) { update(c,"delete from business_private.sessions where token_hash=?",OtpSecurity.digest(pepper,token)); }
    }
}
