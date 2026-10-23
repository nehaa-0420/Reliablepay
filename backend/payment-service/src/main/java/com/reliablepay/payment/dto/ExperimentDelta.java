package com.reliablepay.payment.dto;

import java.math.BigDecimal;

public record ExperimentDelta(
        int paymentsCreatedDelta,
        long duplicateOrdersDelta,
        BigDecimal overchargedAmountDelta,
        long ordersSucceededDelta,
        long deadLetteredDelta,
        long stuckUnknownDelta
) {}
