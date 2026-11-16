package com.voxelfashion.fabrictrack.auth.security;

import com.voxelfashion.fabrictrack.auth.config.SecurityConfig;
import com.voxelfashion.fabrictrack.auth.controller.AdminController;
import com.voxelfashion.fabrictrack.common.exception.ApiErrorWriter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitWebConfig(AdminSecurityTests.TestConfig.class)
class AdminSecurityTests {
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({SecurityConfig.class, AdminController.class, ApiErrorWriter.class})
    static class TestConfig {
        @Bean JwtDecoder decoder() { return mock(JwtDecoder.class); }
        @Bean ObjectMapper mapper() { return new ObjectMapper(); }
    }
    @Autowired WebApplicationContext context;
    @Autowired JwtDecoder decoder;
    MockMvc mvc;
    @BeforeEach void setup() {
        reset(decoder);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    Jwt token(Map<String, Object> claims) {
        return Jwt.withTokenValue("test").header("alg", "ES256").subject("admin-1")
            .claim("email", "admin@example.test").claims(c -> c.putAll(claims)).build();
    }
    @Test void anonymousIsUnauthorized() throws Exception {
        mvc.perform(get("/api/admin/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }
    @Test void invalidTokenIsUnauthorized() throws Exception {
        when(decoder.decode("invalid")).thenThrow(new BadJwtException("invalid"));
        mvc.perform(get("/api/admin/me").header("Authorization", "Bearer invalid")).andExpect(status().isUnauthorized());
    }
    @Test void businessUserIsForbidden() throws Exception {
        when(decoder.decode("business")).thenReturn(token(Map.of("app_metadata", Map.of("role", "BUSINESS_OWNER"))));
        mvc.perform(get("/api/admin/me").header("Authorization", "Bearer business")).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }
    @Test void spoofedMetadataIsForbidden() throws Exception {
        when(decoder.decode("spoofed")).thenReturn(token(Map.of("user_metadata", Map.of("role", "PLATFORM_ADMIN"))));
        mvc.perform(get("/api/admin/me").header("Authorization", "Bearer spoofed")).andExpect(status().isForbidden());
    }
    @Test void adminReceivesProfile() throws Exception {
        when(decoder.decode("admin")).thenReturn(token(Map.of("app_metadata", Map.of("role", "PLATFORM_ADMIN"))));
        mvc.perform(get("/api/admin/me").header("Authorization", "Bearer admin")).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("PLATFORM_ADMIN"));
    }
}
