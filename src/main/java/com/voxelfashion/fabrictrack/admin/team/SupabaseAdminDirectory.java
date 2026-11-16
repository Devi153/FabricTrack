package com.voxelfashion.fabrictrack.admin.team;

import java.time.Duration;
import java.net.http.HttpClient;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/** Server-only adapter. Credentials come from the backend environment. */
@Component
public class SupabaseAdminDirectory implements AdminDirectory {
    private final RestClient client;
    private final String key;
    private final String redirect;

    public SupabaseAdminDirectory(
            @Value("${fabrictrack.supabase.url:http://127.0.0.1:54321}") String url,
            @Value("${fabrictrack.supabase.admin-key:}") String key,
            @Value("${fabrictrack.admin.url:http://127.0.0.1:5173}") String adminUrl) {
        this.key = key;
        this.redirect = adminUrl.replaceAll("/+$", "") + "/set-password";
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.client = RestClient.builder().baseUrl(url.replaceAll("/+$", "") + "/auth/v1")
                .requestFactory(factory).defaultHeader("apikey", key)
                .defaultHeader("Authorization", "Bearer " + key).build();
    }

    @Override
    public void inviteStaff(String email) {
        if (key.isBlank()) throw new InvitationException("Team invitations are unavailable. Contact website support.");
        InvitedUser user;
        try {
            user = client.post().uri(builder -> builder.path("/invite").queryParam("redirect_to", redirect).build())
                .contentType(MediaType.APPLICATION_JSON).body(Map.of("email", email))
                .retrieve().body(InvitedUser.class);
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 422) {
                throw new InvitationException("This email may already have an account. Contact website support to review access.");
            }
            throw new InvitationException("The invitation could not be confirmed. Check with website support before retrying.");
        } catch (RestClientException exception) {
            throw new InvitationException("The invitation could not be confirmed. Check with website support before retrying.");
        }
        if (user == null || user.id() == null) throw new InvitationException("The invitation response was incomplete. Contact website support.");
        // Supabase invite and metadata update are separate remote operations. A failed
        // role update must never report success or grant permission from user_metadata.
        try {
            client.put().uri("/admin/users/{id}", user.id())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("app_metadata", Map.of("role", "PLATFORM_ADMIN", "can_manage_admins", false)))
                .retrieve().toBodilessEntity();
        } catch (RestClientException exception) {
            throw new InvitationException("An invitation was sent, but admin access could not be activated. Contact website support before this person signs in.");
        }
    }
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    public record InvitedUser(UUID id) {}
}
