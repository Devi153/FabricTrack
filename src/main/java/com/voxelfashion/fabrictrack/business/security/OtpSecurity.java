package com.voxelfashion.fabrictrack.business.security;
import com.voxelfashion.fabrictrack.business.exception.BusinessProblem;
import java.security.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;
public final class OtpSecurity {
    private static final SecureRandom RANDOM = new SecureRandom();
    private OtpSecurity() {}
    public static String phone(String value) {
        String p = value == null ? "" : value.replaceAll("[\\s()-]", "");
        if (!p.matches("\\+[1-9][0-9]{7,14}")) throw new BusinessProblem(400, "Enter a mobile number with country code, such as +91.");
        return p;
    }
    public static String name(String value) {
        String n = value == null ? "" : value.strip();
        if (n.length() < 2 || n.length() > 80 || n.chars().anyMatch(Character::isISOControl))
            throw new BusinessProblem(400, "Enter a name between 2 and 80 characters.");
        return n;
    }
    public static String code() { return String.format(Locale.ROOT, "%04d", RANDOM.nextInt(10000)); }
    public static String token() { byte[] b = new byte[32]; RANDOM.nextBytes(b); return Base64.getUrlEncoder().withoutPadding().encodeToString(b); }
    public static String digest(String secret, String value) {
        try {
            Mac m = Mac.getInstance("HmacSHA256");
            m.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(m.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) { throw new IllegalStateException(e); }
    }
    public static boolean equal(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
