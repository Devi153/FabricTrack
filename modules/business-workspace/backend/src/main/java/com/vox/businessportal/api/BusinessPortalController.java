package com.vox.businessportal.api;

import com.vox.businessportal.application.*;
import com.vox.businessportal.config.PortalProperties;
import com.vox.businessportal.domain.*;
import com.vox.businessportal.domain.Models.*;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/business/v1")
public class BusinessPortalController {
  public static final String COOKIE = "vox_business_session";
  private final BusinessAuthService auth;
  private final OwnerWorkspaceService workspace;
  private final PortalProperties properties;

  public BusinessPortalController(
      BusinessAuthService auth, OwnerWorkspaceService workspace, PortalProperties properties) {
    this.auth = auth;
    this.workspace = workspace;
    this.properties = properties;
  }

  public record PhoneRequest(@NotBlank @Size(max = 16) String phone) {}

  public record CodeRequest(
      @NotNull UUID challengeId, @NotBlank @Pattern(regexp = "[0-9]{4}") String code) {}

  public record ProfileRequest(
      @NotBlank @Size(max = 100) String ownerName,
      @NotBlank @Size(max = 120) String businessName,
      @NotNull @Email @Size(max = 254) String email,
      @NotNull @Size(max = 100) String city) {}

  public record FabricRequest(
      @NotBlank @Size(max = 120) String name,
      @NotBlank @Pattern(regexp = "Cotton|Linen|Silk|Denim|Knit|Other") String type,
      @NotBlank @Size(max = 60) String color,
      @Min(1) @Max(2000) int gsm,
      @NotNull @DecimalMin("0.1") @DecimalMax("200") @Digits(integer = 3, fraction = 1)
          BigDecimal widthInches,
      @NotNull @DecimalMin("0") @DecimalMax("100000000") @Digits(integer = 9, fraction = 1)
          BigDecimal quantityMeters,
      @NotNull @DecimalMin("0") @DecimalMax("10000000") @Digits(integer = 8, fraction = 2)
          BigDecimal costPerMeter,
      @NotNull @Size(max = 100) String location) {}

  @GetMapping("/session")
  public Owner session(@CookieValue(value = COOKIE, required = false) String token) {
    return auth.requireOwner(token);
  }

  @PostMapping("/auth/otp")
  public BusinessAuthService.OtpRequested request(
      @Valid @RequestBody PhoneRequest request, HttpServletRequest servlet) {
    sameOrigin(servlet);
    return auth.requestOtp(request.phone(), servlet.getRemoteAddr());
  }

  @PostMapping("/auth/verify")
  public ResponseEntity<Owner> verify(
      @Valid @RequestBody CodeRequest request, HttpServletRequest servlet) {
    sameOrigin(servlet);
    var verified = auth.verify(request.challengeId(), request.code());
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, cookie(verified.sessionToken(), 28800))
        .body(verified.owner());
  }

  @PostMapping("/auth/logout")
  public ResponseEntity<Map<String, Boolean>> logout(
      @CookieValue(value = COOKIE, required = false) String token, HttpServletRequest servlet) {
    sameOrigin(servlet);
    auth.logout(token);
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, cookie("", 0))
        .body(Map.of("signedOut", true));
  }

  @PutMapping("/owner/profile")
  public Owner profile(
      @CookieValue(value = COOKIE, required = false) String token,
      @Valid @RequestBody ProfileRequest request,
      HttpServletRequest servlet) {
    sameOrigin(servlet);
    return workspace.saveProfile(
        auth.requireOwner(token),
        new Profile(request.ownerName(), request.businessName(), request.email(), request.city()));
  }

  @GetMapping("/fabrics")
  public List<Fabric> fabrics(@CookieValue(value = COOKIE, required = false) String token) {
    return workspace.listFabrics(auth.requireOwner(token));
  }

  @PostMapping("/fabrics")
  @ResponseStatus(HttpStatus.CREATED)
  public Fabric addFabric(
      @CookieValue(value = COOKIE, required = false) String token,
      @Valid @RequestBody FabricRequest r,
      HttpServletRequest servlet) {
    sameOrigin(servlet);
    return workspace.addFabric(
        auth.requireOwner(token),
        new NewFabric(
            r.name(),
            r.type(),
            r.color(),
            r.gsm(),
            r.widthInches(),
            r.quantityMeters(),
            r.costPerMeter(),
            r.location()));
  }

  private String cookie(String token, long seconds) {
    return ResponseCookie.from(COOKIE, token)
        .path("/api/business")
        .httpOnly(true)
        .secure(properties.secureCookie())
        .sameSite("Strict")
        .maxAge(seconds)
        .build()
        .toString();
  }

  private void sameOrigin(HttpServletRequest request) {
    String expected = properties.allowedOrigin();
    if (expected == null || expected.isBlank())
      throw new PortalException(503, "Business Portal origin is not configured.");
    if (!expected.equals(request.getHeader("Origin")))
      throw new PortalException(
          403, "This request did not come from the configured Business Portal.");
  }
}
