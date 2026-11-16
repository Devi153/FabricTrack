package com.voxelfashion.fabrictrack.auth.security;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;
class AdminAuthoritiesTests {
    private Jwt token(Map<String,Object> claims) {
        return Jwt.withTokenValue("test").header("alg", "ES256").subject("user-1").claims(c -> c.putAll(claims)).build();
    }
    @Test void trustedAppMetadataGrantsAdmin() {
        var auth = new AdminAuthoritiesConverter().convert(token(Map.of("app_metadata", Map.of("role", "PLATFORM_ADMIN"))));
        assertThat(auth).extracting("authority").containsExactly("ROLE_PLATFORM_ADMIN");
    }
    @Test void editableUserMetadataCannotGrantAdmin() {
        var auth = new AdminAuthoritiesConverter().convert(token(Map.of("user_metadata", Map.of("role", "PLATFORM_ADMIN"))));
        assertThat(auth).isEmpty();
    }
    @Test void businessAndMissingRolesHaveNoAdminAuthority() {
        assertThat(new AdminAuthoritiesConverter().convert(token(Map.of()))).isEmpty();
        assertThat(new AdminAuthoritiesConverter().convert(token(Map.of("app_metadata", Map.of("role", "BUSINESS_OWNER"))))).isEmpty();
    }
}
