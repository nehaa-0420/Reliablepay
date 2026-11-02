package com.reliablepay.payment.controller;

import com.reliablepay.payment.auth.AdminAuthConfig;
import com.reliablepay.payment.auth.LoginRateLimiter;
import com.reliablepay.payment.auth.TokenService;
import com.reliablepay.payment.auth.TokenValidationResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Map;

/**
 * Administrative Authentication Controller.
 * Handles HMAC-SHA256 token issuance with constant-time credential comparison and IP-based rate limiting.
 */
@Tag(name = "Authentication", description = "Administrative login and token validation endpoints")
@RestController
@RequestMapping("/api/auth/admin")
public class AdminAuthController {

    private final AdminAuthConfig authConfig;
    private final TokenService tokenService;
    private final LoginRateLimiter rateLimiter;

    public AdminAuthController(AdminAuthConfig authConfig, TokenService tokenService, LoginRateLimiter rateLimiter) {
        this.authConfig = authConfig;
        this.tokenService = tokenService;
        this.rateLimiter = rateLimiter;
    }

    public record LoginRequest(
            @NotBlank(message = "username is required") String username,
            @NotBlank(message = "password is required") String password
    ) {}

    @Operation(summary = "Admin login", description = "Authenticate using ADMIN_USERNAME and ADMIN_PASSWORD. Returns an HMAC-SHA256 token valid for 8 hours. Rate-limited to 5 failed attempts per minute per IP.")
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);

        if (rateLimiter.isBlocked(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "status", 429,
                    "error", "Too Many Requests",
                    "message", "Too many failed login attempts. Maximum 5 failures per minute allowed. Please try again later."
            ));
        }

        String expectedUser = authConfig.getAdminUsername();
        String expectedPass = authConfig.getAdminPassword();

        boolean userMatch = constantTimeEquals(request.username(), expectedUser);
        boolean passMatch = constantTimeEquals(request.password(), expectedPass);

        if (!userMatch || !passMatch) {
            rateLimiter.recordFailure(clientIp);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Invalid username or password"
            ));
        }

        rateLimiter.recordSuccess(clientIp);
        String token = tokenService.generateToken(request.username());

        return ResponseEntity.ok(Map.of(
                "token", token,
                "tokenType", "Bearer",
                "expiresIn", TokenService.EXPIRY_SECONDS,
                "expiresAt", Instant.now().plusSeconds(TokenService.EXPIRY_SECONDS).toString()
        ));
    }

    @Operation(summary = "Validate admin token", description = "Validates active token from Authorization: Bearer <token> or X-Admin-Token header.")
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentAdmin(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        String adminTokenHeader = request.getHeader("X-Admin-Token");

        // Check Bearer Token
        if (authHeader != null && authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            String token = authHeader.substring(7).trim();
            TokenValidationResult result = tokenService.validateToken(token);
            if (result.valid()) {
                return ResponseEntity.ok(Map.of(
                        "authenticated", true,
                        "username", result.username(),
                        "authMethod", "BEARER",
                        "expiresAt", result.expiresAt().toString()
                ));
            } else if (result.expired()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "status", 401,
                        "error", "Unauthorized",
                        "message", "Token has expired: " + result.error()
                ));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                        "status", 401,
                        "error", "Unauthorized",
                        "message", "Invalid token: " + result.error()
                ));
            }
        }

        // Check legacy X-Admin-Token header
        String configuredAdminToken = authConfig.getAdminToken();
        if (configuredAdminToken != null && !configuredAdminToken.isEmpty()
                && adminTokenHeader != null && constantTimeEquals(adminTokenHeader.trim(), configuredAdminToken)) {
            return ResponseEntity.ok(Map.of(
                    "authenticated", true,
                    "username", authConfig.getAdminUsername() != null && !authConfig.getAdminUsername().isEmpty()
                            ? authConfig.getAdminUsername()
                            : "admin",
                    "authMethod", "X_ADMIN_TOKEN"
            ));
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "status", 401,
                "error", "Unauthorized",
                "message", "Missing or invalid authentication token"
        ));
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}
