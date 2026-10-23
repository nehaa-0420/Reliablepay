package com.reliablepay.mockbank.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "bank_charges", schema = "bank", indexes = {
        @Index(name = "idx_bank_charges_payment_ref", columnList = "payment_ref"),
        @Index(name = "idx_bank_charges_created_at", columnList = "created_at")
})
public class BankCharge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_ref", nullable = false)
    private String paymentRef;

    @Column(name = "order_ref")
    private String orderRef;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public BankCharge() {
    }

    public BankCharge(String paymentRef, BigDecimal amount) {
        this(paymentRef, null, amount);
    }

    public BankCharge(String paymentRef, String orderRef, BigDecimal amount) {
        this.paymentRef = paymentRef;
        this.orderRef = orderRef;
        this.amount = amount;
        this.createdAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPaymentRef() {
        return paymentRef;
    }

    public void setPaymentRef(String paymentRef) {
        this.paymentRef = paymentRef;
    }

    public String getOrderRef() {
        return orderRef;
    }

    public void setOrderRef(String orderRef) {
        this.orderRef = orderRef;
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
