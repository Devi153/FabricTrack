package com.voxelfashion.fabrictrack.admin.team;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/team/invitations")
public class AdminInvitationController {
    private final AdminInvitationService service;
    public AdminInvitationController(AdminInvitationService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public InvitationResult invite(@AuthenticationPrincipal Jwt actor, @Valid @RequestBody InviteRequest request) {
        service.invite(actor, request.email());
        return new InvitationResult("Invitation sent. Ask your colleague to check their email.");
    }
    public record InvitationResult(String message) {}
}
