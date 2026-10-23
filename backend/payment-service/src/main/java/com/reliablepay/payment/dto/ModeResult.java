package com.reliablepay.payment.dto;

import java.math.BigDecimal;

public record ModeResult(
        int orders,
        int paymentsCreated,
        long success,
        long deadLettered,
        long stuckUnknown,
        long duplicateOrdersCount,
        BigDecimal overchargedAmount,
        double retrySuccessRate,
        double avgRecoveryMs,
        double avgLatencyMs,
        double p95LatencyMs,
        long ordersSucceeded,
        long ordersFailed
) {}
