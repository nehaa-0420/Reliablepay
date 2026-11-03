package com.reliablepay.payment.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reliablepay.payment.dto.CreatePaymentRequest;
import com.reliablepay.payment.dto.PaymentResponse;
import com.reliablepay.payment.model.PaymentMode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AdminAuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private LoginRateLimiter loginRateLimiter;

    @Value("${app.admin-token:demo-secret-token}")
    private String adminToken;

    @Test
    @DisplayName("POST /api/auth/admin/login with correct credentials returns 200 with Bearer token")
    void loginSuccess() throws Exception {
        var request = java.util.Map.of("username", "admin", "password", "adminpassword");

        MvcResult result = mockMvc.perform(post("/api/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(28800))
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        String token = response.get("token").asText();
        assertThat(token).isNotEmpty();

        // Validate token structure: header.payload.signature
        assertThat(token.split("\\.")).hasSize(3);

        TokenValidationResult validation = tokenService.validateToken(token);
        assertThat(validation.valid()).isTrue();
        assertThat(validation.username()).isEqualTo("admin");
    }

    @Test
    @DisplayName("POST /api/auth/admin/login with wrong credentials returns 401")
    void loginFailureWrongCredentials() throws Exception {
        var request = java.util.Map.of("username", "admin", "password", "wrong-password");

        mockMvc.perform(post("/api/auth/admin/login")
                        .with(req -> {
                            req.setRemoteAddr("10.0.0.1");
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("Login rate limiting enforces 5 failed attempts per minute per IP, rejecting 6th with 429")
    void loginRateLimitingPerIp() throws Exception {
        String testIp = "192.168.100.42";
        loginRateLimiter.reset();

        var badRequest = java.util.Map.of("username", "admin", "password", "bad-pass");

        // 5 consecutive failed attempts
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/admin/login")
                            .with(req -> {
                                req.setRemoteAddr(testIp);
                                return req;
                            })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isUnauthorized());
        }

        // 6th attempt from the same IP must be rejected with 429 Too Many Requests
        mockMvc.perform(post("/api/auth/admin/login")
                        .with(req -> {
                            req.setRemoteAddr(testIp);
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badRequest)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Too many failed login attempts")));
    }

    @Test
    @DisplayName("Behind a proxy, X-Forwarded-For isolates rate limiting so one attacker cannot lock out other clients")
    void proxyXForwardedForIsolatesRateLimiting() throws Exception {
        loginRateLimiter.reset();

        String proxyIp = "10.0.0.1";
        String attackerClientIp = "203.0.113.195";
        String adminClientIp = "198.51.100.22";

        var badRequest = java.util.Map.of("username", "admin", "password", "bad-pass");
        var goodRequest = java.util.Map.of("username", "admin", "password", "adminpassword");

        // Attacker fails 5 times via proxy with multi-hop X-Forwarded-For
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/admin/login")
                            .header("X-Forwarded-For", attackerClientIp + ", " + proxyIp)
                            .with(req -> {
                                req.setRemoteAddr(proxyIp);
                                return req;
                            })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isUnauthorized());
        }

        // Attacker's 6th attempt from 203.0.113.195 is blocked with 429
        mockMvc.perform(post("/api/auth/admin/login")
                        .header("X-Forwarded-For", attackerClientIp + ", " + proxyIp)
                        .with(req -> {
                            req.setRemoteAddr(proxyIp);
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badRequest)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));

        // Real admin arrives through the exact same proxy (10.0.0.1) with X-Forwarded-For: 198.51.100.22
        // Must NOT be locked out, and succeeds with 200 OK + Bearer token
        mockMvc.perform(post("/api/auth/admin/login")
                        .header("X-Forwarded-For", adminClientIp + ", " + proxyIp)
                        .with(req -> {
                            req.setRemoteAddr(proxyIp);
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(goodRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }

    @Test
    @DisplayName("Admin can log in again after the 60-second rate limiting window passes")
    void adminCanLoginAfterRateLimitingWindowPasses() throws Exception {
        loginRateLimiter.reset();

        String clientIp = "198.51.100.88";
        long oldTimestamp = System.currentTimeMillis() - 65_000L; // 65 seconds ago (past the 60s window)

        // Seed 5 failures in the past window
        for (int i = 0; i < 5; i++) {
            loginRateLimiter.recordFailureAt(clientIp, oldTimestamp + i);
        }

        // Verify that rate limiter recognizes the window has expired and client is NOT blocked
        assertThat(loginRateLimiter.isBlocked(clientIp)).isFalse();

        // Real admin logs in with correct credentials and succeeds
        var goodRequest = java.util.Map.of("username", "admin", "password", "adminpassword");
        mockMvc.perform(post("/api/auth/admin/login")
                        .header("X-Forwarded-For", clientIp)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(goodRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString());
    }

    @Test
    @DisplayName("GET /api/auth/admin/me returns token info for valid Bearer token")
    void adminMeValidToken() throws Exception {
        String token = tokenService.generateToken("admin");

        mockMvc.perform(get("/api/auth/admin/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.expiresAt").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/auth/admin/me returns 401 for expired or invalid token")
    void adminMeExpiredOrTamperedToken() throws Exception {
        // Tampered token
        mockMvc.perform(get("/api/auth/admin/me")
                        .header("Authorization", "Bearer forged.token.value"))
                .andExpect(status().isUnauthorized());

        // Expired token (created with past expiry)
        String expiredToken = tokenService.createTokenWithExpiryForTest("admin", Instant.now().minusSeconds(60));
        mockMvc.perform(get("/api/auth/admin/me")
                        .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Token has expired")));
    }

    @Test
    @DisplayName("Admin endpoints accept EITHER X-Admin-Token OR Authorization: Bearer token")
    void bothAuthMethodsAcceptedOnAdminEndpoints() throws Exception {
        String bearerToken = tokenService.generateToken("admin");

        // 1. Using X-Admin-Token
        mockMvc.perform(get("/api/admin/config")
                        .header("X-Admin-Token", adminToken))
                .andExpect(status().isOk());

        // 2. Using Authorization: Bearer
        mockMvc.perform(get("/api/admin/config")
                        .header("Authorization", "Bearer " + bearerToken))
                .andExpect(status().isOk());

        // 3. GET /api/payments with Bearer token
        mockMvc.perform(get("/api/payments")
                        .header("Authorization", "Bearer " + bearerToken))
                .andExpect(status().isOk());

        // 4. GET /api/payments with X-Admin-Token
        mockMvc.perform(get("/api/payments")
                        .header("X-Admin-Token", adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("All admin-only endpoints return 401 without auth")
    void adminOnlyEndpointsReturn401WithoutAuth() throws Exception {
        UUID randomId = UUID.randomUUID();

        // GET /api/payments (list)
        mockMvc.perform(get("/api/payments"))
                .andExpect(status().isUnauthorized());

        // GET /api/metrics/summary
        mockMvc.perform(get("/api/metrics/summary"))
                .andExpect(status().isUnauthorized());

        // GET /api/chaos
        mockMvc.perform(get("/api/chaos"))
                .andExpect(status().isUnauthorized());

        // PUT /api/chaos
        mockMvc.perform(put("/api/chaos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"timeoutPercentage\": 0}"))
                .andExpect(status().isUnauthorized());

        // POST /api/experiments/run
        mockMvc.perform(post("/api/experiments/run")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mode\":\"PROTECTED\",\"requests\":10,\"concurrency\":2}"))
                .andExpect(status().isUnauthorized());

        // GET /api/admin/config
        mockMvc.perform(get("/api/admin/config"))
                .andExpect(status().isUnauthorized());

        // POST /api/payments/{id}/requeue
        mockMvc.perform(post("/api/payments/{id}/requeue", randomId))
                .andExpect(status().isUnauthorized());

        // GET /api/admin/stream
        mockMvc.perform(get("/api/admin/stream"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Customer endpoints remain open without auth headers")
    void customerEndpointsStayOpen() throws Exception {
        String key = "test-open-" + UUID.randomUUID();
        CreatePaymentRequest request = new CreatePaymentRequest("MERCH-OPEN", new BigDecimal("50.00"), "USD", PaymentMode.PROTECTED);

        // 1. POST /api/payments (customer create)
        MvcResult createResult = mockMvc.perform(post("/api/payments")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        PaymentResponse created = objectMapper.readValue(createResult.getResponse().getContentAsString(), PaymentResponse.class);

        // 2. GET /api/payments/{id} (customer fetch)
        mockMvc.perform(get("/api/payments/{id}", created.getId()))
                .andExpect(status().isOk());

        // 3. GET /api/payments/{id}/events (customer audit)
        mockMvc.perform(get("/api/payments/{id}/events", created.getId()))
                .andExpect(status().isOk());

        // 4. GET /api/payments/{id}/stream (customer SSE)
        mockMvc.perform(get("/api/payments/{id}/stream", created.getId()))
                .andExpect(status().isOk());
    }
}
