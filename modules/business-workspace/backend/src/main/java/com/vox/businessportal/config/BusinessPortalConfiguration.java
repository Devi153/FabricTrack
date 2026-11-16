package com.vox.businessportal.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;

@Configuration
@PropertySource("classpath:business-portal.properties")
@EnableConfigurationProperties(PortalProperties.class)
@ComponentScan(
    basePackages = {
      "com.vox.businessportal.api",
      "com.vox.businessportal.application",
      "com.vox.businessportal.infrastructure"
    })
public class BusinessPortalConfiguration {}
