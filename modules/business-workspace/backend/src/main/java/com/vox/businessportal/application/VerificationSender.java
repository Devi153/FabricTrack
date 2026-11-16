package com.vox.businessportal.application;

import com.vox.businessportal.domain.VerificationChannel;

/** Delivery strategy; email can be added with its own target validation and identity linking. */
public interface VerificationSender {
  VerificationChannel channel();

  void send(String target, String code);
}
