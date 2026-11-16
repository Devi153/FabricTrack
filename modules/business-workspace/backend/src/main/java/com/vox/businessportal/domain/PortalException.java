package com.vox.businessportal.domain;

public class PortalException extends RuntimeException {
  private final int status;
  private final int retryAfter;

  public PortalException(int status, String message) {
    this(status, message, 0);
  }

  public PortalException(int status, String message, int retryAfter) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }

  public int status() {
    return status;
  }

  public int retryAfter() {
    return retryAfter;
  }

  public static PortalException unauthorized() {
    return new PortalException(
        401, "Your session has expired. Please verify your phone number again.");
  }

  public static PortalException invalidCode() {
    return new PortalException(
        400, "The code is invalid, expired or already used. Request a new code.");
  }
}
