package com.reliablepay.payment.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class BankStatusResponse {

    private String paymentRef;
    private Boolean charged;
    @JsonAlias({"chargeCount", "count"})
    private Long count;

    public BankStatusResponse() {
    }

    public BankStatusResponse(String paymentRef, Boolean charged, Long count) {
        this.paymentRef = paymentRef;
        this.charged = charged;
        this.count = count;
    }

    public String paymentRef() {
        return paymentRef;
    }

    public Boolean charged() {
        return charged;
    }

    public Long count() {
        return count;
    }

    public String getPaymentRef() {
        return paymentRef;
    }

    public void setPaymentRef(String paymentRef) {
        this.paymentRef = paymentRef;
    }

    public Boolean getCharged() {
        return charged;
    }

    public Boolean isCharged() {
        return charged;
    }

    public void setCharged(Boolean charged) {
        this.charged = charged;
    }

    public Long getCount() {
        return count;
    }

    public void setCount(Long count) {
        this.count = count;
    }

    public void setChargeCount(Long chargeCount) {
        this.count = chargeCount;
    }

    public boolean hasConfirmedCharge() {
        return Boolean.TRUE.equals(charged) && count != null && count > 0;
    }
}
