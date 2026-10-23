package com.reliablepay.payment.dto;

public record AdminConfigResponse(
        int bankReadTimeoutMs,
        long reconcileGraceMs,
        long retryBaseDelayMs,
        int retryMaxAttempts
) {
}
