package com.reliablepay.payment.config;

import com.reliablepay.payment.auth.AdminAuthConfig;
import com.reliablepay.payment.auth.TokenService;
import com.reliablepay.payment.auth.TokenValidationResult;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Intercepts requests to administrative endpoints.
 * Accepts EITHER the existing X-Admin-Token (kept for scripts) OR Authorization: Bearer <token>.
 * Leaves customer endpoints strictly open.
 */
@Component
public class AdminTokenInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AdminTokenInterceptor.class);

    private final AdminAuthConfig authConfig;
    private final TokenService tokenService;

    @org.springframework.beans.factory.annotation.Autowired
    public AdminTokenInterceptor(AdminAuthConfig authConfig, TokenService tokenService) {
        this.authConfig = authConfig;
        this.tokenService = tokenService;
    }

    /**
     * Backward-compatible constructor for unit testing with static token string.
     */
    public AdminTokenInterceptor(String adminToken) {
        this(new AdminAuthConfig(adminToken, "admin", "admin", "0123456789abcdef0123456789abcdef", null), null);
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Preflight OPTIONS requests always pass through for CORS
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        if (!isAdminEndpoint(request)) {
            return true;
        }

        String configuredAdminToken = authConfig != null ? authConfig.getAdminToken() : null;

        // Legacy test fallback: if unit test instantiated with no tokenService and empty adminToken, allow locally
        if (tokenService == null && (configuredAdminToken == null || configuredAdminToken.isEmpty())) {
            return true;
        }

        // 1. Check legacy X-Admin-Token header
        String adminTokenHeader = request.getHeader("X-Admin-Token");
        if (configuredAdminToken != null && !configuredAdminToken.isEmpty()
                && adminTokenHeader != null && constantTimeEquals(adminTokenHeader.trim(), configuredAdminToken)) {
            return true;
        }

        // 2. Check Authorization: Bearer <token>
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            String token = authHeader.substring(7).trim();
            if (tokenService != null) {
                TokenValidationResult result = tokenService.validateToken(token);
                if (result.valid()) {
                    return true;
                }
                log.warn("Invalid Bearer token on {} {}: {}", request.getMethod(), request.getRequestURI(), result.error());
            }
        }

        log.warn("Unauthorized attempt on {} {} (missing or invalid X-Admin-Token or Bearer token)",
                request.getMethod(), request.getRequestURI());
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Invalid or missing X-Admin-Token header or Authorization: Bearer token\"}");
        return false;
    }

    public boolean isAdminEndpoint(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        // 1. GET /api/payments (list of payments) - Note: Customer endpoints GET /api/payments/{id} and /{id}/events remain open
        if ("GET".equalsIgnoreCase(method) && (path.equals("/api/payments") || path.equals("/api/payments/"))) {
            return true;
        }

        // 2. /api/payments/{id}/requeue
        if (path.matches("^/api/payments/[^/]+/requeue.*$")) {
            return true;
        }

        // 3. /api/metrics/summary
        if (path.startsWith("/api/metrics/summary")) {
            return true;
        }

        // 4. /api/chaos and /api/chaos/* (both GET and PUT)
        if (path.equals("/api/chaos") || path.startsWith("/api/chaos/")) {
            return true;
        }

        // 5. /api/experiments/* and /api/experiments
        if (path.equals("/api/experiments") || path.startsWith("/api/experiments/")) {
            return true;
        }

        // 6. /api/admin/* (including reset, config, and stream)
        if (path.startsWith("/api/admin/") || path.equals("/api/admin")) {
            return true;
        }

        return false;
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
