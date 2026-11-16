package com.voxelfashion.fabrictrack.auth.controller;

import com.voxelfashion.fabrictrack.auth.dto.AdminProfile;
import java.util.Map;
import com.voxelfashion.fabrictrack.auth.security.AdminAuthoritiesConverter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AdminController {
    @GetMapping("/api/admin/me")
    public AdminProfile me(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        Object metadata = jwt.getClaims().get("app_metadata");
        boolean canManage = metadata instanceof Map<?, ?> values
            && Boolean.TRUE.equals(values.get("can_manage_admins"));
        return new AdminProfile(jwt.getSubject(), email == null ? "" : email, AdminAuthoritiesConverter.ADMIN_ROLE, canManage);
    }
}
