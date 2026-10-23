package com.reliablepay.payment.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AdminTokenInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AdminTokenInterceptor.class);

    private final String adminToken;

    public AdminTokenInterceptor(@Value("${app.admin-token:}") String adminToken) {
        this.adminToken = adminToken != null ? adminToken.trim() : "";
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Preflight OPTIONS requests always pass through for CORS
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // Local default: if ADMIN_TOKEN is not configured or blank, no token is required
        if (adminToken.isEmpty()) {
            return true;
        }

        String path = request.getRequestURI();
        String method = request.getMethod();

        // Protected administrative mutations
        boolean isProtected = (path.startsWith("/api/admin/reset") && "POST".equalsIgnoreCase(method))
                || (path.startsWith("/api/admin/config") && "PUT".equalsIgnoreCase(method))
                || (path.startsWith("/api/chaos") && "PUT".equalsIgnoreCase(method))
                || (path.startsWith("/api/experiments/run") && "POST".equalsIgnoreCase(method));

        if (isProtected) {
            String token = request.getHeader("X-Admin-Token");
            if (token == null || !adminToken.equals(token.trim())) {
                log.warn("Unauthorized attempt on {} {} (missing or invalid X-Admin-Token)", method, path);
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Invalid or missing X-Admin-Token header\"}");
                return false;
            }
        }

        return true;
    }
}
