package com.reliablepay.mockbank.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class BankAdminSecurityTest {

    @Test
    @DisplayName("When mock-bank admin token is configured, missing header returns 401 on /bank/admin/**")
    void missingTokenReturns401OnAdminEndpoints() throws Exception {
        BankAdminTokenInterceptor interceptor = new BankAdminTokenInterceptor("bank-admin-token-xyz");

        String[] endpoints = {
                "/bank/admin/stats",
                "/bank/admin/chaos",
                "/bank/admin/reset"
        };

        for (String endpoint : endpoints) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", endpoint);
            MockHttpServletResponse response = new MockHttpServletResponse();

            boolean allowed = interceptor.preHandle(request, response, new Object());

            assertThat(allowed).isFalse();
            assertThat(response.getStatus()).isEqualTo(401);
            assertThat(response.getContentAsString()).contains("Invalid or missing X-Admin-Token header");
        }
    }

    @Test
    @DisplayName("When mock-bank admin token is configured, invalid header returns 401")
    void invalidTokenReturns401() throws Exception {
        BankAdminTokenInterceptor interceptor = new BankAdminTokenInterceptor("bank-admin-token-xyz");

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/bank/admin/reset");
        request.addHeader("X-Admin-Token", "invalid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertThat(allowed).isFalse();
        assertThat(response.getStatus()).isEqualTo(401);
    }

    @Test
    @DisplayName("When mock-bank admin token is configured, valid header succeeds")
    void validTokenSucceeds() throws Exception {
        BankAdminTokenInterceptor interceptor = new BankAdminTokenInterceptor("bank-admin-token-xyz");

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/bank/admin/reset");
        request.addHeader("X-Admin-Token", "bank-admin-token-xyz");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertThat(allowed).isTrue();
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("When ADMIN_TOKEN is unset or blank locally, mock-bank admin endpoints allow access")
    void unsetTokenAllowsAccessLocally() throws Exception {
        BankAdminTokenInterceptor interceptor = new BankAdminTokenInterceptor("");

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/bank/admin/stats");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertThat(allowed).isTrue();
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("Public charge and status endpoints bypass bank admin check")
    void publicEndpointsBypassCheck() throws Exception {
        BankAdminTokenInterceptor interceptor = new BankAdminTokenInterceptor("bank-admin-token-xyz");

        MockHttpServletRequest chargeRequest = new MockHttpServletRequest("POST", "/bank/charge");
        MockHttpServletResponse chargeResponse = new MockHttpServletResponse();
        assertThat(interceptor.preHandle(chargeRequest, chargeResponse, new Object())).isTrue();

        MockHttpServletRequest statusRequest = new MockHttpServletRequest("GET", "/bank/status/some-id");
        MockHttpServletResponse statusResponse = new MockHttpServletResponse();
        assertThat(interceptor.preHandle(statusRequest, statusResponse, new Object())).isTrue();
    }
}
