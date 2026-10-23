package com.reliablepay.payment.client;

public record ChaosConfigRequest(
        Double timeoutRate,
        Double errorRate,
        Double channelFailureRate,
        Double chargeOnTimeoutProbability,
        Integer latencyMs
) {}
