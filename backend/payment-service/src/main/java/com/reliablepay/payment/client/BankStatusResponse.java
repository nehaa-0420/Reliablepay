package com.reliablepay.payment.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class BankStatusResponse {

    private String paymentRef;
    private boolean charged;
    @JsonAlias({"chargeCount", "count"})
    private long count;

    public BankStatusResponse() {
    }

    public BankStatusResponse(String paymentRef, boolean charged, long count) {
        this.paymentRef = paymentRef;
        this.charged = charged;
        this.count = count;
    }

    public String paymentRef() {
        return paymentRef;
    }

    public boolean charged() {
        return charged;
    }

    public long count() {
        return count;
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

    public long getCount() {
        return count;
    }

    public void setCount(long count) {
        this.count = count;
    }

    public void setChargeCount(long chargeCount) {
        this.count = chargeCount;
    }

    public boolean hasConfirmedCharge() {
        return charged && count > 0;
    }
}
