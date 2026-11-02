package com.reliablepay.payment.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Payload published over real-time SSE streams upon committed payment transitions.
 */
public record PaymentEventPayload(
        Long eventId,
        UUID paymentId,
        String merchantRef,
        BigDecimal amount,
        String currency,
        String mode,
        String fromStatus,
        String toStatus,
        String detail,
        int attemptCount,
        Instant occurredAt
) {}
