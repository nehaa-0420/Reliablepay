package com.reliablepay.payment.dto;

import com.reliablepay.payment.model.PaymentEvent;

import java.time.Instant;
import java.util.UUID;

public class PaymentEventResponse {

    private Long id;
    private UUID paymentId;
    private String fromStatus;
    private String toStatus;
    private String detail;
    private Instant createdAt;

    public PaymentEventResponse() {
    }

    public static PaymentEventResponse from(PaymentEvent event) {
        PaymentEventResponse response = new PaymentEventResponse();
        response.setId(event.getId());
        response.setPaymentId(event.getPaymentId());
        response.setFromStatus(event.getFromStatus());
        response.setToStatus(event.getToStatus());
        response.setDetail(event.getDetail());
        response.setCreatedAt(event.getCreatedAt());
        return response;
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UUID getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(UUID paymentId) {
        this.paymentId = paymentId;
    }

    public String getFromStatus() {
        return fromStatus;
    }

    public void setFromStatus(String fromStatus) {
        this.fromStatus = fromStatus;
    }

    public String getToStatus() {
        return toStatus;
    }

    public void setToStatus(String toStatus) {
        this.toStatus = toStatus;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
