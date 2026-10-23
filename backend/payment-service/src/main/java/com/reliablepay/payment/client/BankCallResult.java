package com.reliablepay.payment.client;

public record BankCallResult(
        BankOutcome outcome,
        int latencyMs,
        String errorCode,
        String responseBody
) {}
