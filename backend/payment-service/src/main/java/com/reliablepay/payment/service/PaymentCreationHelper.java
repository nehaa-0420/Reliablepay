package com.reliablepay.payment.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reliablepay.payment.dto.CreatePaymentRequest;
import com.reliablepay.payment.dto.PaymentResponse;
import com.reliablepay.payment.model.Payment;
import com.reliablepay.payment.model.PaymentMode;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.repository.PaymentRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Isolated transactional helper for creating payments.
 * Using REQUIRES_NEW ensures that if a database unique constraint is violated due to
 * concurrent requests with the same idempotency key, only this transaction rolls back,
 * allowing the caller to safely query and return the winning transaction's result.
 */
@Component
public class PaymentCreationHelper {

    private final PaymentRepository paymentRepository;
    private final PaymentStateMachine stateMachine;
    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    public PaymentCreationHelper(PaymentRepository paymentRepository,
                                 PaymentStateMachine stateMachine,
                                 IdempotencyService idempotencyService,
                                 ObjectMapper objectMapper) {
        this.paymentRepository = paymentRepository;
        this.stateMachine = stateMachine;
        this.idempotencyService = idempotencyService;
        this.objectMapper = objectMapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PaymentResponse createAndPersist(CreatePaymentRequest request, String cleanKey, String requestHash, PaymentMode mode)
            throws JsonProcessingException {
        Payment payment = new Payment(
                UUID.randomUUID(),
                request.getMerchantRef(),
                request.getAmount(),
                request.getCurrency(),
                mode,
                cleanKey,
                requestHash
        );
        payment = paymentRepository.saveAndFlush(payment);
        stateMachine.transition(payment, PaymentStatus.INITIATED, "Payment created in INITIATED state");

        PaymentResponse response = PaymentResponse.from(payment);
        String serialized = objectMapper.writeValueAsString(response);
        idempotencyService.store(cleanKey, requestHash, 201, serialized);

        return response;
    }
}
