package com.voxelfashion.fabrictrack.auth.config;

import com.voxelfashion.fabrictrack.auth.security.AdminAuthoritiesConverter;
import com.voxelfashion.fabrictrack.common.exception.ApiErrorWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ApiErrorWriter errors) throws Exception {
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new AdminAuthoritiesConverter());
        // Bearer-only API: no authentication cookies or server-side sessions.
        http.csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/business/**").denyAll()
                .requestMatchers("/api/admin/**").hasRole(AdminAuthoritiesConverter.ADMIN_ROLE)
                .anyRequest().authenticated())
            .exceptionHandling(handler -> handler
                .authenticationEntryPoint((request, response, exception) -> errors.write(response, 401, "UNAUTHENTICATED", "A valid access token is required."))
                .accessDeniedHandler((request, response, exception) -> errors.write(response, 403, "FORBIDDEN", "Access denied. Verify your account and permissions.")))
            .oauth2ResourceServer(resource -> resource
                .jwt(jwt -> jwt.jwtAuthenticationConverter(converter))
                .authenticationEntryPoint((request, response, exception) -> errors.write(response, 401, "UNAUTHENTICATED", "A valid access token is required."))
                .accessDeniedHandler((request, response, exception) -> errors.write(response, 403, "FORBIDDEN", "Access denied. Verify your account and permissions.")));
        return http.build();
    }
}
