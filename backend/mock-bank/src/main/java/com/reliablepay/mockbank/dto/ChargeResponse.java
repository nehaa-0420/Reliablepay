package com.reliablepay.mockbank.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class ChargeResponse {

    private String paymentRef;
    private boolean charged;
    private Long chargeId;
    private BigDecimal amount;
    private Instant createdAt;

    public ChargeResponse() {
    }

    public ChargeResponse(String paymentRef, boolean charged, Long chargeId, BigDecimal amount, Instant createdAt) {
        this.paymentRef = paymentRef;
        this.charged = charged;
        this.chargeId = chargeId;
        this.amount = amount;
        this.createdAt = createdAt;
    }

    public String getPaymentRef() {
        return paymentRef;
    }

    public void setPaymentRef(String paymentRef) {
        this.paymentRef = paymentRef;
    }

    public boolean isCharged() {
        return charged;
    }

    public void setCharged(boolean charged) {
        this.charged = charged;
    }

    public Long getChargeId() {
        return chargeId;
    }

    public void setChargeId(Long chargeId) {
        this.chargeId = chargeId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
