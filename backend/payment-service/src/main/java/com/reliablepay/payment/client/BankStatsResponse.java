package com.reliablepay.payment.client;

import java.math.BigDecimal;

public record BankStatsResponse(
        long totalCharges,
        long duplicateCharges,
        long duplicateRefsCount,
        long duplicateOrdersCount,
        BigDecimal overchargedAmount
) {}
