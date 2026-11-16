package com.voxelfashion.fabrictrack.business;
import com.voxelfashion.fabrictrack.business.repository.BusinessStore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
/** Full component scan catches duplicate routes and bean names, without operator secrets or a live DB. */
@SpringBootTest(properties={"business.enabled=true", "business.otp-pepper=test-only-pepper-at-least-32-characters", "business.sms-mode=console"})
@ActiveProfiles("business-local")
class BusinessApplicationContextTests {
    @MockitoBean BusinessStore store;
    @Autowired WebApplicationContext context;
    @Test void publicConfigIsMappedUnderTheRealSecurityChains() throws Exception {
        MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build()
            .perform(get("/api/business/auth/config"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.development").value(true));
    }
    @Test void dashboardStillRequiresAuthentication() throws Exception {
        MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build()
            .perform(get("/api/business/dashboard")).andExpect(status().isUnauthorized());
    }
}
