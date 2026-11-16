package com.vox.businessportal.api;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.vox.businessportal.application.*;
import com.vox.businessportal.config.PortalProperties;
import com.vox.businessportal.domain.PortalException;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class BusinessPortalControllerTest {
  MockMvc mvc;
  BusinessAuthService auth;

  @BeforeEach
  void setup() {
    auth = mock(BusinessAuthService.class);
    var workspace = mock(OwnerWorkspaceService.class);
    var props =
        new PortalProperties("test-secret-not-used-here", "https://portal.example", true, "", "");
    mvc =
        MockMvcBuilders.standaloneSetup(new BusinessPortalController(auth, workspace, props))
            .setControllerAdvice(new BusinessPortalExceptionHandler(), new BusinessPortalHeaders())
            .build();
  }

  @Test
  void missingOriginRejectsMutation() throws Exception {
    mvc.perform(
            post("/api/business/v1/auth/otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"+919876543210\"}"))
        .andExpect(status().isForbidden());
    verifyNoInteractions(auth);
  }

  @Test
  void validOriginReturnsChallengeWithoutCode() throws Exception {
    when(auth.requestOtp(eq("+919876543210"), anyString()))
        .thenReturn(new BusinessAuthService.OtpRequested(UUID.randomUUID(), 300, 60));
    mvc.perform(
            post("/api/business/v1/auth/otp")
                .header("Origin", "https://portal.example")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"+919876543210\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.expiresInSeconds").value(300))
        .andExpect(jsonPath("$.code").doesNotExist())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  void anonymousInventoryCannotBeRead() throws Exception {
    when(auth.requireOwner(null)).thenThrow(PortalException.unauthorized());
    mvc.perform(get("/api/business/v1/fabrics")).andExpect(status().isUnauthorized());
  }

  @Test
  void invalidPayloadStopsBeforeService() throws Exception {
    mvc.perform(
            post("/api/business/v1/auth/verify")
                .header("Origin", "https://portal.example")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"challengeId\":\"invalid\",\"code\":\"12\"}"))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(auth);
  }
}
