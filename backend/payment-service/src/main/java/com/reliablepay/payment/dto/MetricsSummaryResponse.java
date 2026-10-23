package com.reliablepay.payment.dto;

import java.math.BigDecimal;
import java.util.Map;

public record MetricsSummaryResponse(
        Map<String, Long> statusCounts,
        long stuckUnknownCount,
        double retrySuccessRate,
        double avgRecoveryMs,
        double avgLatencyMs,
        double p95LatencyMs,
        long totalCharges,
        long duplicateCharges,
        long duplicateRefsCount,
        long duplicateOrdersCount,
        BigDecimal overchargedAmount
) {}
