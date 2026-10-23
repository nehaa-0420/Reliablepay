package com.reliablepay.payment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reliablepay.payment.dto.CreatePaymentRequest;
import com.reliablepay.payment.dto.PaymentResponse;
import com.reliablepay.payment.model.PaymentMode;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.repository.PaymentEventRepository;
import com.reliablepay.payment.repository.PaymentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.reliablepay.payment.client.BankClient;
import org.springframework.boot.test.mock.mockito.MockBean;

@SpringBootTest
@AutoConfigureMockMvc
class PaymentControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentEventRepository paymentEventRepository;

    @MockBean
    private BankClient bankClient;

    @Test
    @DisplayName("POST /api/payments creates payment with initial status INITIATED")
    void createPaymentSuccess() throws Exception {
        String key = "test-create-" + UUID.randomUUID();
        CreatePaymentRequest request = new CreatePaymentRequest("MERCH-001", new BigDecimal("150.00"), "USD", PaymentMode.PROTECTED);

        MvcResult result = mockMvc.perform(post("/api/payments")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.status").value("INITIATED"))
                .andExpect(jsonPath("$.amount").value(150.00))
                .andExpect(jsonPath("$.currency").value("USD"))
                .andExpect(jsonPath("$.idempotencyKey").value(key))
                .andReturn();

        PaymentResponse response = objectMapper.readValue(result.getResponse().getContentAsString(), PaymentResponse.class);
        assertThat(paymentRepository.findById(response.getId())).isPresent();
    }

    @Test
    @DisplayName("POST /api/payments rejects invalid amount and currency with 400")
    void createPaymentValidationErrors() throws Exception {
        String key = "test-val-" + UUID.randomUUID();
        CreatePaymentRequest invalidReq = new CreatePaymentRequest("", new BigDecimal("-10.00"), "us", PaymentMode.PROTECTED);

        mockMvc.perform(post("/api/payments")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/payments rejects missing Idempotency-Key in PROTECTED mode with 400")
    void createPaymentMissingKeyRejected() throws Exception {
        CreatePaymentRequest request = new CreatePaymentRequest("MERCH-002", new BigDecimal("250.00"), "EUR", PaymentMode.PROTECTED);

        mockMvc.perform(post("/api/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Idempotency-Key header is required in PROTECTED mode"));
    }

    @Test
    @DisplayName("GET /api/payments/{id} retrieves payment and 404 for unknown ID")
    void getPaymentRetrieval() throws Exception {
        String key = "test-get-" + UUID.randomUUID();
        CreatePaymentRequest request = new CreatePaymentRequest("MERCH-003", new BigDecimal("80.00"), "GBP", PaymentMode.PROTECTED);

        MvcResult createResult = mockMvc.perform(post("/api/payments")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        PaymentResponse created = objectMapper.readValue(createResult.getResponse().getContentAsString(), PaymentResponse.class);

        mockMvc.perform(get("/api/payments/{id}", created.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(created.getId().toString()))
                .andExpect(jsonPath("$.merchantRef").value("MERCH-003"));

        mockMvc.perform(get("/api/payments/{id}", UUID.randomUUID()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("POST /api/payments exact replay returns same payment with 200 OK without creating duplicate")
    void exactIdempotentReplay() throws Exception {
        String key = "test-replay-" + UUID.randomUUID();
        CreatePaymentRequest request = new CreatePaymentRequest("MERCH-REPLAY", new BigDecimal("300.00"), "INR", PaymentMode.PROTECTED);

        // First call -> 201 Created
        MvcResult firstResult = mockMvc.perform(post("/api/payments")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        PaymentResponse firstResponse = objectMapper.readValue(firstResult.getResponse().getContentAsString(), PaymentResponse.class);

        long countAfterFirst = paymentRepository.count();

        // Exact replay -> 200 OK with same ID
        MvcResult secondResult = mockMvc.perform(post("/api/payments")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        PaymentResponse secondResponse = objectMapper.readValue(secondResult.getResponse().getContentAsString(), PaymentResponse.class);

        assertThat(secondResponse.getId()).isEqualTo(firstResponse.getId());
        assertThat(secondResponse.getMerchantRef()).isEqualTo(firstResponse.getMerchantRef());
        assertThat(paymentRepository.count()).isEqualTo(countAfterFirst);
    }

    @Test
    @DisplayName("POST /api/payments conflicting payload with same key returns 422 Unprocessable Entity")
    void conflictingIdempotentKeyReused() throws Exception {
        String key = "test-conflict-" + UUID.randomUUID();
        CreatePaymentRequest req1 = new CreatePaymentRequest("MERCH-ORIG", new BigDecimal("100.00"), "INR", PaymentMode.PROTECTED);
        CreatePaymentRequest req2 = new CreatePaymentRequest("MERCH-ORIG", new BigDecimal("999.00"), "INR", PaymentMode.PROTECTED);

        mockMvc.perform(post("/api/payments")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/payments")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already used with a different request payload")));
    }

    @Test
    @DisplayName("GET /api/payments/{id}/events returns audit trail with INITIATED event")
    void getPaymentEventsAudit() throws Exception {
        String key = "test-events-" + UUID.randomUUID();
        CreatePaymentRequest request = new CreatePaymentRequest("MERCH-EVT", new BigDecimal("45.00"), "USD", PaymentMode.PROTECTED);

        MvcResult createResult = mockMvc.perform(post("/api/payments")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        PaymentResponse created = objectMapper.readValue(createResult.getResponse().getContentAsString(), PaymentResponse.class);

        mockMvc.perform(get("/api/payments/{id}/events", created.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].paymentId").value(created.getId().toString()))
                .andExpect(jsonPath("$[0].toStatus").value("INITIATED"));
    }

    @Test
    @DisplayName("Concurrent duplicate requests with same key produce exactly one payment record")
    void concurrentDuplicateRequestsProduceSinglePayment() throws Exception {
        String key = "test-race-" + UUID.randomUUID();
        CreatePaymentRequest request = new CreatePaymentRequest("MERCH-RACE", new BigDecimal("500.00"), "INR", PaymentMode.PROTECTED);
        String payload = objectMapper.writeValueAsString(request);

        int threads = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        List<Future<PaymentResponse>> futures = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            futures.add(executor.submit(() -> {
                startLatch.await();
                MvcResult mvcResult = mockMvc.perform(post("/api/payments")
                                .header("Idempotency-Key", key)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload))
                        .andReturn();

                int status = mvcResult.getResponse().getStatus();
                if (status != 200 && status != 201) {
                    throw new RuntimeException("Unexpected status: " + status + " body: " + mvcResult.getResponse().getContentAsString());
                }
                return objectMapper.readValue(mvcResult.getResponse().getContentAsString(), PaymentResponse.class);
            }));
        }

        startLatch.countDown();
        executor.shutdown();
        boolean finished = executor.awaitTermination(10, TimeUnit.SECONDS);
        assertThat(finished).isTrue();

        Set<UUID> returnedIds = new HashSet<>();
        for (Future<PaymentResponse> future : futures) {
            PaymentResponse resp = future.get();
            returnedIds.add(resp.getId());
        }

        // All threads must return the exact same payment ID
        assertThat(returnedIds).hasSize(1);

        // Database must contain exactly one payment record for this idempotency key
        assertThat(paymentRepository.findByIdempotencyKey(key)).isPresent();
    }

    @Test
    @DisplayName("GET /api/metrics/summary returns latency metrics fields")
    void getMetricsSummaryReturnsLatencyMetrics() throws Exception {
        mockMvc.perform(get("/api/metrics/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avgLatencyMs").isNumber())
                .andExpect(jsonPath("$.p95LatencyMs").isNumber());
    }
}
