package com.reliablepay.payment.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class AdminSecurityTest {

    @Test
    @DisplayName("When admin token is configured, request with missing header returns 401")
    void missingTokenReturns401() throws Exception {
        AdminTokenInterceptor interceptor = new AdminTokenInterceptor("secure-admin-token-123");

        String[] protectedEndpoints = {
                "/api/admin/reset",
                "/api/admin/config",
                "/api/chaos",
                "/api/experiments/run"
        };
        String[] methods = { "POST", "PUT", "PUT", "POST" };

        for (int i = 0; i < protectedEndpoints.length; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest(methods[i], protectedEndpoints[i]);
            MockHttpServletResponse response = new MockHttpServletResponse();

            boolean allowed = interceptor.preHandle(request, response, new Object());

            assertThat(allowed).isFalse();
            assertThat(response.getStatus()).isEqualTo(401);
            assertThat(response.getContentAsString()).contains("Invalid or missing X-Admin-Token header");
        }
    }

    @Test
    @DisplayName("When admin token is configured, request with invalid header returns 401")
    void invalidTokenReturns401() throws Exception {
        AdminTokenInterceptor interceptor = new AdminTokenInterceptor("secure-admin-token-123");

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/admin/reset");
        request.addHeader("X-Admin-Token", "wrong-token-value");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertThat(allowed).isFalse();
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("Invalid or missing X-Admin-Token header");
    }

    @Test
    @DisplayName("When admin token is configured, request with valid header succeeds")
    void validTokenSucceeds() throws Exception {
        AdminTokenInterceptor interceptor = new AdminTokenInterceptor("secure-admin-token-123");

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/admin/reset");
        request.addHeader("X-Admin-Token", "secure-admin-token-123");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertThat(allowed).isTrue();
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("When ADMIN_TOKEN is unset or blank locally, no token is required")
    void unsetTokenAllowsAccessLocally() throws Exception {
        AdminTokenInterceptor interceptor = new AdminTokenInterceptor("");

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/admin/reset");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertThat(allowed).isTrue();
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("CORS preflight OPTIONS requests bypass admin token requirement")
    void preflightOptionsAllowed() throws Exception {
        AdminTokenInterceptor interceptor = new AdminTokenInterceptor("secure-admin-token-123");

        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/admin/reset");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertThat(allowed).isTrue();
    }

    @Test
    @DisplayName("Public payment APIs bypass admin token check")
    void publicApisAllowed() throws Exception {
        AdminTokenInterceptor interceptor = new AdminTokenInterceptor("secure-admin-token-123");

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/payments");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertThat(allowed).isTrue();
    }
}
