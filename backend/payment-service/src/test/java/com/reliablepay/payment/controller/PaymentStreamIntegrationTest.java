package com.reliablepay.payment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reliablepay.payment.dto.CreatePaymentRequest;
import com.reliablepay.payment.dto.PaymentEventPayload;
import com.reliablepay.payment.dto.PaymentResponse;
import com.reliablepay.payment.event.PaymentEventHub;
import com.reliablepay.payment.model.PaymentMode;
import com.reliablepay.payment.model.PaymentStatus;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PaymentStreamIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PaymentEventHub paymentEventHub;

    @Value("${app.admin-token:demo-secret-token}")
    private String adminToken;

    @Test
    @DisplayName("GET /api/payments/{id}/stream establishes SSE stream with required headers")
    void customerStreamEstablishesWithRequiredHeaders() throws Exception {
        // 1. Create a payment
        String key = "test-stream-" + UUID.randomUUID();
        CreatePaymentRequest request = new CreatePaymentRequest("MERCH-STREAM", new BigDecimal("120.00"), "USD", PaymentMode.PROTECTED);

        MvcResult createResult = mockMvc.perform(post("/api/payments")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        PaymentResponse created = objectMapper.readValue(createResult.getResponse().getContentAsString(), PaymentResponse.class);

        // 2. Open SSE stream
        MvcResult streamResult = mockMvc.perform(get("/api/payments/{id}/stream", created.getId()))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-cache"))
                .andExpect(header().string("X-Accel-Buffering", "no"))
                .andReturn();

        assertThat(streamResult.getResponse().getContentType()).contains("text/event-stream");
    }

    @Test
    @DisplayName("GET /api/admin/stream establishes admin SSE stream with valid token and required headers")
    void adminStreamEstablishesWithRequiredHeaders() throws Exception {
        MvcResult streamResult = mockMvc.perform(get("/api/admin/stream")
                        .header("X-Admin-Token", adminToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-cache"))
                .andExpect(header().string("X-Accel-Buffering", "no"))
                .andReturn();

        assertThat(streamResult.getResponse().getContentType()).contains("text/event-stream");
    }

    @Test
    @DisplayName("GET /api/admin/stream rejects unauthenticated request with 401")
    void adminStreamRejectsUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/admin/stream"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Customer stream subscriber receives transition event published via event hub")
    void subscriberReceivesTransitionEvent() {
        UUID paymentId = UUID.randomUUID();
        var emitter = paymentEventHub.subscribePayment(paymentId);
        assertThat(paymentEventHub.getPaymentSubscriberCount(paymentId)).isEqualTo(1);

        PaymentEventPayload payload = new PaymentEventPayload(
                1L,
                paymentId,
                "ORDER-123",
                new BigDecimal("99.99"),
                "USD",
                "PROTECTED",
                PaymentStatus.INITIATED.name(),
                PaymentStatus.PROCESSING.name(),
                "Bank charge dispatched",
                1,
                Instant.now()
        );

        // Publish transition
        paymentEventHub.publish(payload);

        // Clean up
        emitter.complete();
    }
}
