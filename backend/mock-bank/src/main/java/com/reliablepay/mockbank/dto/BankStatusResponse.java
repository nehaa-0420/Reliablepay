package com.reliablepay.mockbank.dto;

public class BankStatusResponse {

    private String paymentRef;
    private boolean charged;
    private long chargeCount;

    public BankStatusResponse() {
    }

    public BankStatusResponse(String paymentRef, boolean charged, long chargeCount) {
        this.paymentRef = paymentRef;
        this.charged = charged;
        this.chargeCount = chargeCount;
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

    public long getChargeCount() {
        return chargeCount;
    }

    public void setChargeCount(long chargeCount) {
        this.chargeCount = chargeCount;
    }
}
