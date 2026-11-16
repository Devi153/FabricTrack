package com.voxelfashion.fabrictrack.admin.team;

import com.voxelfashion.fabrictrack.auth.config.SecurityConfig;
import com.voxelfashion.fabrictrack.common.exception.ApiErrorWriter;
import com.voxelfashion.fabrictrack.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitWebConfig(AdminInvitationHttpTests.TestConfig.class)
class AdminInvitationHttpTests {
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({SecurityConfig.class, AdminInvitationController.class, AdminInvitationService.class,
        ApiErrorWriter.class, GlobalExceptionHandler.class})
    static class TestConfig {
        @Bean JwtDecoder decoder() { return mock(JwtDecoder.class); }
        @Bean AdminDirectory directory() { return mock(AdminDirectory.class); }
        @Bean ObjectMapper mapper() { return new ObjectMapper(); }
    }
    @Autowired WebApplicationContext context;
    @Autowired JwtDecoder decoder;
    @Autowired AdminDirectory directory;
    MockMvc mvc;

    @BeforeEach void setup() {
        reset(decoder, directory);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    void authenticate(boolean owner) {
        when(decoder.decode("token")).thenReturn(Jwt.withTokenValue("token").header("alg", "ES256")
            .subject("admin-1").claim("app_metadata", Map.of("role", "PLATFORM_ADMIN", "can_manage_admins", owner)).build());
    }
    @Test void anonymousCannotInvite() throws Exception {
        mvc.perform(post("/api/admin/team/invitations").contentType("application/json")
            .content("{\"email\":\"staff@example.test\"}")).andExpect(status().isUnauthorized());
        verifyNoInteractions(directory);
    }
    @Test void ordinaryAdminCannotInvite() throws Exception {
        authenticate(false);
        mvc.perform(post("/api/admin/team/invitations").header("Authorization", "Bearer token")
            .contentType("application/json").content("{\"email\":\"staff@example.test\"}"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        verifyNoInteractions(directory);
    }
    @Test void invalidEmailIsRejected() throws Exception {
        authenticate(true);
        mvc.perform(post("/api/admin/team/invitations").header("Authorization", "Bearer token")
            .contentType("application/json").content("{\"email\":\"not-an-email\"}"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(directory);
    }
    @Test void ownerCanSendInvitation() throws Exception {
        authenticate(true);
        mvc.perform(post("/api/admin/team/invitations").header("Authorization", "Bearer token")
            .contentType("application/json").content("{\"email\":\"staff@example.test\"}"))
            .andExpect(status().isAccepted());
        verify(directory).inviteStaff("staff@example.test");
    }
}
