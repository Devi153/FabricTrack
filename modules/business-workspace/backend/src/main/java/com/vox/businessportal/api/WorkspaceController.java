package com.vox.businessportal.api;

import com.vox.businessportal.application.*;
import com.vox.businessportal.config.PortalProperties;
import com.vox.businessportal.domain.PortalException;
import com.vox.businessportal.domain.WorkspaceRequests;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/business/v1")
public class WorkspaceController {
  private final BusinessAuthService auth;
  private final WorkspaceService workspace;
  private final PortalProperties properties;

  public WorkspaceController(
      BusinessAuthService auth, WorkspaceService workspace, PortalProperties properties) {
    this.auth = auth;
    this.workspace = workspace;
    this.properties = properties;
  }

  private void origin(HttpServletRequest request) {
    if (properties.allowedOrigin() == null
        || !properties.allowedOrigin().equals(request.getHeader("Origin")))
      throw new PortalException(
          403, "This request did not come from the configured Business Portal.");
  }

  @GetMapping("/workspace")
  public Object snapshot(
      @CookieValue(value = BusinessPortalController.COOKIE, required = false) String token) {
    return workspace.snapshot(auth.requireOwner(token));
  }

  @PostMapping("/suppliers")
  public Object supplier(
      @CookieValue(value = BusinessPortalController.COOKIE, required = false) String token,
      @Valid @RequestBody WorkspaceRequests.Supplier r,
      HttpServletRequest request) {
    origin(request);
    return workspace.addSupplier(auth.requireOwner(token), r);
  }

  @PostMapping("/rolls")
  public Object roll(
      @CookieValue(value = BusinessPortalController.COOKIE, required = false) String token,
      @Valid @RequestBody WorkspaceRequests.Roll r,
      HttpServletRequest request) {
    origin(request);
    return workspace.addRoll(auth.requireOwner(token), r);
  }

  @PostMapping("/movements")
  public Object movement(
      @CookieValue(value = BusinessPortalController.COOKIE, required = false) String token,
      @Valid @RequestBody WorkspaceRequests.Movement r,
      HttpServletRequest request) {
    origin(request);
    return workspace.move(auth.requireOwner(token), r);
  }

  @PutMapping("/fabrics/{id}/passport")
  public Object passport(
      @CookieValue(value = BusinessPortalController.COOKIE, required = false) String token,
      @PathVariable UUID id,
      @Valid @RequestBody WorkspaceRequests.Passport r,
      HttpServletRequest request) {
    origin(request);
    return workspace.passport(auth.requireOwner(token), id, r);
  }

  @PostMapping("/designs")
  public Object design(
      @CookieValue(value = BusinessPortalController.COOKIE, required = false) String token,
      @Valid @RequestBody WorkspaceRequests.Design r,
      HttpServletRequest request) {
    origin(request);
    return workspace.design(auth.requireOwner(token), r);
  }

  @PostMapping("/purchases")
  public Object purchase(
      @CookieValue(value = BusinessPortalController.COOKIE, required = false) String token,
      @Valid @RequestBody WorkspaceRequests.Purchase r,
      HttpServletRequest request) {
    origin(request);
    return workspace.purchase(auth.requireOwner(token), r);
  }

  @PostMapping("/designs/{id}/reserve")
  public Object reserve(
      @CookieValue(value = BusinessPortalController.COOKIE, required = false) String token,
      @PathVariable UUID id,
      HttpServletRequest request) {
    origin(request);
    return workspace.reserve(auth.requireOwner(token), id);
  }

  @PostMapping("/designs/{id}/complete")
  public Object complete(
      @CookieValue(value = BusinessPortalController.COOKIE, required = false) String token,
      @PathVariable UUID id,
      @Valid @RequestBody WorkspaceRequests.Complete r,
      HttpServletRequest request) {
    origin(request);
    return workspace.complete(auth.requireOwner(token), id, r);
  }

  @PostMapping("/fabrics/import")
  public Object importFabrics(
      @CookieValue(value = BusinessPortalController.COOKIE, required = false) String token,
      @Valid @RequestBody WorkspaceRequests.Import r,
      HttpServletRequest request) {
    origin(request);
    return workspace.importFabrics(auth.requireOwner(token), r);
  }

  @PostMapping("/procurement")
  public Object procurement(
      @CookieValue(value = BusinessPortalController.COOKIE, required = false) String token,
      @Valid @RequestBody WorkspaceRequests.Procurement r,
      HttpServletRequest request) {
    origin(request);
    return workspace.procurement(auth.requireOwner(token), r);
  }
}
