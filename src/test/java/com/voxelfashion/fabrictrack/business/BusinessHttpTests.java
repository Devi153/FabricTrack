package com.voxelfashion.fabrictrack.business;
import com.voxelfashion.fabrictrack.business.controller.BusinessController;
import com.voxelfashion.fabrictrack.business.service.BusinessService;
import com.voxelfashion.fabrictrack.business.exception.BusinessProblem;
import com.voxelfashion.fabrictrack.business.config.BusinessSecurity;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.voxelfashion.fabrictrack.common.exception.ApiErrorWriter;
import tools.jackson.databind.ObjectMapper;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringJUnitWebConfig(BusinessHttpTests.Config.class)
@TestPropertySource(properties="business.enabled=true")
class BusinessHttpTests {
 @Configuration @EnableWebMvc @EnableWebSecurity
 @Import({BusinessSecurity.class,BusinessController.class,ApiErrorWriter.class})
 static class Config {
  @Bean BusinessService service(){return mock(BusinessService.class);}
  @Bean ObjectMapper mapper(){return new ObjectMapper();}
 }
 @Autowired WebApplicationContext context;
 @Autowired BusinessService service;
 MockMvc mvc;
 @BeforeEach void setup() throws Exception {
  reset(service); mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
  when(service.authenticate(null)).thenThrow(new BusinessProblem(401,"Sign in required"));
  when(service.authenticate("admin.jwt.token")).thenThrow(new BusinessProblem(401,"Invalid business session"));
 }
 @Test void dashboardRequiresSession() throws Exception { mvc.perform(get("/api/business/dashboard")).andExpect(status().isUnauthorized()); }
 @Test void adminJwtIsNotBusinessSession() throws Exception {
  mvc.perform(get("/api/business/me").header("Authorization","Bearer admin.jwt.token")).andExpect(status().isUnauthorized());
 }
 @Test void verifiedAccountLoadsDashboardWithoutFakeStatistics() throws Exception {
  when(service.authenticate("session")).thenReturn(new BusinessService.Account("id","Devi","+919876543210","FREE"));
  mvc.perform(get("/api/business/dashboard").header("Authorization","Bearer session"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.account.name").value("Devi"))
   .andExpect(jsonPath("$.account.plan").value("FREE")).andExpect(jsonPath("$.operationalModulesReady").value(false));
 }
 @Test void startDoesNotRequireExistingSession() throws Exception {
  when(service.start(any(),any(),any(),any())).thenReturn(new BusinessService.Challenge("id",300,60,true));
  mvc.perform(post("/api/business/auth/start").contentType("application/json")
   .content("{\"phone\":\"+919876543210\",\"name\":\"Devi\",\"purpose\":\"register\"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.challengeId").value("id")).andExpect(jsonPath("$.code").doesNotExist());
 }
 @Test void rejectedOtpReturnsUsefulError() throws Exception {
  when(service.verify("id","1111")).thenThrow(new BusinessProblem(400,"Incorrect code"));
  mvc.perform(post("/api/business/auth/verify").contentType("application/json").content("{\"challengeId\":\"id\",\"code\":\"1111\"}"))
   .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Incorrect code"));
 }
 @Test void logoutRevokesSession() throws Exception {
  when(service.authenticate("session")).thenReturn(new BusinessService.Account("id","Devi","+919876543210","FREE"));
  mvc.perform(post("/api/business/auth/logout").header("Authorization","Bearer session")).andExpect(status().isOk());
  verify(service).logout("session");
 }
}
