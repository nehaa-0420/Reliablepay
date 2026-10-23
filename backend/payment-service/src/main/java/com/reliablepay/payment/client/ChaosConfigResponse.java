package com.reliablepay.payment.client;

public record ChaosConfigResponse(
        Integer id,
        Double timeoutRate,
        Double errorRate,
        Double channelFailureRate,
        Double chargeOnTimeoutProbability,
        Integer latencyMs
) {}
