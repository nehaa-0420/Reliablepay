package com.reliablepay.payment.client;

import java.math.BigDecimal;

public interface BankClient {
    BankCallResult charge(String paymentRef, String orderRef, BigDecimal amount);
    BankStatusResponse getStatus(String paymentRef);
    BankStatsResponse getStats();
    ChaosConfigResponse getChaosConfig();
    ChaosConfigResponse updateChaosConfig(ChaosConfigRequest request);
    void reset();

    default boolean isHealthy() {
        return true;
    }

    default void updateReadTimeout(int readTimeoutMs) {
    }
}
