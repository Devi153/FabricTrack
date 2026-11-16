package com.vox.businessportal.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "vox.business")
public record PortalProperties(
    String otpPepper,
    String allowedOrigin,
    @org.springframework.boot.context.properties.bind.DefaultValue("true") boolean secureCookie,
    String smsWebhookUrl,
    String smsApiToken) {}
