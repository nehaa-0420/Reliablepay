package com.reliablepay.mockbank.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class ChargeRequest {

    @NotBlank(message = "paymentRef is required")
    private String paymentRef;

    private String orderRef;

    @NotNull(message = "amount is required")
    @DecimalMin(value = "0.01", message = "amount must be greater than zero")
    private BigDecimal amount;

    public ChargeRequest() {
    }

    public ChargeRequest(String paymentRef, BigDecimal amount) {
        this(paymentRef, null, amount);
    }

    public ChargeRequest(String paymentRef, String orderRef, BigDecimal amount) {
        this.paymentRef = paymentRef;
        this.orderRef = orderRef;
        this.amount = amount;
    }

    public String getOrderRef() {
        return orderRef;
    }

    public void setOrderRef(String orderRef) {
        this.orderRef = orderRef;
    }

    public String getPaymentRef() {
        return paymentRef;
    }

    public void setPaymentRef(String paymentRef) {
        this.paymentRef = paymentRef;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}
