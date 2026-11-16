package com.voxelfashion.fabrictrack.admin.team;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class AdminInvitationServiceTests {
    private Jwt actor(Map<String, Object> claims) {
        return Jwt.withTokenValue("test").header("alg", "ES256").subject("owner").claims(values -> values.putAll(claims)).build();
    }

    @Test void ownerCanInviteStaffWithNormalizedEmail() {
        AdminDirectory directory = mock(AdminDirectory.class);
        new AdminInvitationService(directory).invite(actor(Map.of("app_metadata", Map.of("role", "PLATFORM_ADMIN", "can_manage_admins", true))), " Staff@Example.test ");
        verify(directory).inviteStaff("staff@example.test");
    }

    @Test void ordinaryAdminCannotInvite() {
        AdminDirectory directory = mock(AdminDirectory.class);
        assertThatThrownBy(() -> new AdminInvitationService(directory).invite(actor(Map.of("app_metadata", Map.of("role", "PLATFORM_ADMIN"))), "staff@example.test"))
            .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(directory);
    }

    @Test void editableMetadataCannotGrantInvitationPermission() {
        AdminDirectory directory = mock(AdminDirectory.class);
        var token = actor(Map.of("app_metadata", Map.of("role", "PLATFORM_ADMIN"), "user_metadata", Map.of("can_manage_admins", true)));
        assertThatThrownBy(() -> new AdminInvitationService(directory).invite(token, "staff@example.test")).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(directory);
    }

    @Test void permissionWithoutAdminRoleIsRejected() {
        AdminDirectory directory = mock(AdminDirectory.class);
        assertThatThrownBy(() -> new AdminInvitationService(directory).invite(actor(Map.of("app_metadata", Map.of("role", "BUSINESS_OWNER", "can_manage_admins", true))), "staff@example.test"))
            .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(directory);
    }

    @Test void providerFailureIsNotReportedAsSuccess() {
        AdminDirectory directory = mock(AdminDirectory.class);
        doThrow(new InvitationException("Provider unavailable")).when(directory).inviteStaff(anyString());
        assertThatThrownBy(() -> new AdminInvitationService(directory).invite(actor(Map.of("app_metadata", Map.of("role", "PLATFORM_ADMIN", "can_manage_admins", true))), "staff@example.test"))
            .isInstanceOf(InvitationException.class);
    }
}
