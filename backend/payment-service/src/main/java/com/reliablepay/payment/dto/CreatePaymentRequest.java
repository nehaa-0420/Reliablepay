package com.reliablepay.payment.dto;

import com.reliablepay.payment.model.PaymentMode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

public class CreatePaymentRequest {

    @NotBlank(message = "merchantRef is required")
    private String merchantRef;

    @NotNull(message = "amount is required")
    @DecimalMin(value = "0.01", message = "amount must be greater than zero")
    private BigDecimal amount;

    @NotBlank(message = "currency is required")
    @Pattern(regexp = "^[A-Z]{3}$", message = "currency must be a 3-letter uppercase ISO code")
    private String currency;

    private PaymentMode mode = PaymentMode.PROTECTED;

    public CreatePaymentRequest() {
    }

    public CreatePaymentRequest(String merchantRef, BigDecimal amount, String currency, PaymentMode mode) {
        this.merchantRef = merchantRef;
        this.amount = amount;
        this.currency = currency;
        this.mode = mode != null ? mode : PaymentMode.PROTECTED;
    }

    public String getMerchantRef() {
        return merchantRef;
    }

    public void setMerchantRef(String merchantRef) {
        this.merchantRef = merchantRef;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public PaymentMode getMode() {
        return mode != null ? mode : PaymentMode.PROTECTED;
    }

    public void setMode(PaymentMode mode) {
        this.mode = mode != null ? mode : PaymentMode.PROTECTED;
    }
}
