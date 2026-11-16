package com.voxelfashion.fabrictrack.auth.security;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

/** Only signed, operator-controlled app_metadata can grant platform privileges. */
public final class AdminAuthoritiesConverter implements Converter<Jwt, Collection<GrantedAuthority>> {
    public static final String ADMIN_ROLE = "PLATFORM_ADMIN";

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Object metadata = jwt.getClaims().get("app_metadata");
        if (metadata instanceof Map<?, ?> values && ADMIN_ROLE.equals(values.get("role"))) {
            return List.of(new SimpleGrantedAuthority("ROLE_" + ADMIN_ROLE));
        }
        return List.of();
    }
}
