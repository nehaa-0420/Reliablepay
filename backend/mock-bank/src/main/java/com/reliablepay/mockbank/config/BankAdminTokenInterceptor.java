package com.reliablepay.mockbank.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class BankAdminTokenInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(BankAdminTokenInterceptor.class);

    private final String adminToken;

    public BankAdminTokenInterceptor(@Value("${app.admin-token:}") String adminToken) {
        this.adminToken = adminToken != null ? adminToken.trim() : "";
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Allow OPTIONS preflight
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // Local default: if ADMIN_TOKEN is not configured or blank, allow access
        if (adminToken.isEmpty()) {
            return true;
        }

        String path = request.getRequestURI();
        if (path.startsWith("/bank/admin")) {
            String token = request.getHeader("X-Admin-Token");
            if (token == null || !adminToken.equals(token.trim())) {
                log.warn("Unauthorized attempt on mock-bank admin endpoint: {} {} (missing or invalid X-Admin-Token)",
                        request.getMethod(), path);
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Invalid or missing X-Admin-Token header\"}");
                return false;
            }
        }

        return true;
    }
}
