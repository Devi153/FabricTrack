package com.voxelfashion.fabrictrack.admin.team;
import java.util.Locale;
import java.util.Map;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class AdminInvitationService {
    private final AdminDirectory directory;
    public AdminInvitationService(AdminDirectory directory) { this.directory = directory; }

    public void invite(Jwt actor, String email) {
        Object metadata = actor.getClaims().get("app_metadata");
        if (!(metadata instanceof Map<?, ?> values)
                || !"PLATFORM_ADMIN".equals(values.get("role"))
                || !Boolean.TRUE.equals(values.get("can_manage_admins"))) {
            throw new AccessDeniedException("Admin invitations require account-management permission.");
        }
        directory.inviteStaff(email.trim().toLowerCase(Locale.ROOT));
    }
}
