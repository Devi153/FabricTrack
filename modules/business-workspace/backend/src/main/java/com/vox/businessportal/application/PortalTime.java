package com.vox.businessportal.application;

import java.time.Instant;
import org.springframework.stereotype.Component;

/** Injectable clock makes expiry boundaries deterministic in tests. */
@Component
public class PortalTime {
  public Instant now() {
    return Instant.now();
  }
}
