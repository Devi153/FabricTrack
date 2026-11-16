package com.vox.businessportal.application;

import com.vox.businessportal.config.PortalProperties;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public class PortalCrypto {
  private final byte[] pepper;
  private final SecureRandom random = new SecureRandom();

  public PortalCrypto(PortalProperties properties) {
    String secret = properties.otpPepper();
    if (secret == null || secret.length() < 32)
      throw new IllegalStateException("BUSINESS_OTP_PEPPER must be at least 32 random characters");
    pepper = secret.getBytes(StandardCharsets.UTF_8);
  }

  public String code() {
    return String.format(Locale.ROOT, "%04d", random.nextInt(10000));
  }

  public String token() {
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }

  public String digest(String value) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(pepper, "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    } catch (GeneralSecurityException exception) {
      throw new IllegalStateException("Verification cryptography is unavailable", exception);
    }
  }

  public boolean matches(String expected, String value) {
    return MessageDigest.isEqual(
        expected.getBytes(StandardCharsets.UTF_8), digest(value).getBytes(StandardCharsets.UTF_8));
  }
}
