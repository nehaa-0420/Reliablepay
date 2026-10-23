package com.reliablepay.payment.client;

public record BankStatusResponse(
        String paymentRef,
        boolean charged,
        long count
) {}
