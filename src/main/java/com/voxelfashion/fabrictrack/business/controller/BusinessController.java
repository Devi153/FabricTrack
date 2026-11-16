package com.voxelfashion.fabrictrack.business.controller;
import com.voxelfashion.fabrictrack.business.service.BusinessService;
import com.voxelfashion.fabrictrack.business.exception.BusinessProblem;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/business")
@ConditionalOnProperty(
        name = "business.enabled",
        havingValue = "true"
)
public class BusinessController {

    private static final Logger log =
            LoggerFactory.getLogger(BusinessController.class);

    private final BusinessService service;

    public BusinessController(BusinessService service) {
        this.service = service;
    }

    public record Start(
            String phone,
            String name,
            String purpose
    ) {}

    public record Verify(
            String challengeId,
            String code
    ) {}

    @GetMapping("/auth/config")
    public Map<String, Boolean> config() {
        return Map.of("development", service.development());
    }

    @PostMapping("/auth/start")
    public BusinessService.Challenge start(
            @RequestBody Start body,
            HttpServletRequest request
    ) throws SQLException {
        return service.start(
                body.phone(),
                body.name(),
                body.purpose(),
                request.getRemoteAddr()
        );
    }

    @PostMapping("/auth/verify")
    public BusinessService.Login verify(
            @RequestBody Verify body
    ) throws SQLException {
        return service.verify(body.challengeId(), body.code());
    }

    @GetMapping("/me")
    public BusinessService.Account me(
            @AuthenticationPrincipal BusinessService.Account account
    ) {
        return account;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(
            @AuthenticationPrincipal BusinessService.Account account
    ) {
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("account", account);

        // Operational modules are not implemented yet.
        result.put("inventoryMeters", null);
        result.put("lowStockItems", null);
        result.put("activeGroups", null);
        result.put("pendingOrders", null);
        result.put("activity", List.of());
        result.put("operationalModulesReady", false);

        return result;
    }

    @PostMapping("/auth/logout")
    public Map<String, Boolean> logout(
            @RequestHeader("Authorization") String authorization
    ) throws SQLException {
        if (!authorization.startsWith("Bearer ")
                || authorization.length() <= 7) {
            throw new BusinessProblem(
                    401,
                    "A valid business session is required."
            );
        }

        service.logout(authorization.substring(7));
        return Map.of("signedOut", true);
    }

    @ExceptionHandler(BusinessProblem.class)
    public ResponseEntity<Map<String, Object>> problem(
            BusinessProblem exception
    ) {
        return ResponseEntity.status(exception.status).body(
                Map.of(
                        "status", exception.status,
                        "code", "BUSINESS_REQUEST",
                        "message", exception.getMessage()
                )
        );
    }

    @ExceptionHandler(SQLException.class)
    public ResponseEntity<Map<String, Object>> unavailable(
            SQLException exception
    ) {
        log.error("Business database operation failed", exception);

        return ResponseEntity.status(503).body(
                Map.of(
                        "status", 503,
                        "code", "BUSINESS_UNAVAILABLE",
                        "message",
                        "Business service is temporarily unavailable."
                )
        );
    }
}