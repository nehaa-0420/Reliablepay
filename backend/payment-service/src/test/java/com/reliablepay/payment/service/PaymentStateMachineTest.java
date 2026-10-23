package com.reliablepay.payment.service;

import com.reliablepay.payment.exception.InvalidStateTransitionException;
import com.reliablepay.payment.model.Payment;
import com.reliablepay.payment.model.PaymentEvent;
import com.reliablepay.payment.model.PaymentMode;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.repository.PaymentEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class PaymentStateMachineTest {

    private PaymentEventRepository eventRepository;
    private PaymentStateMachine stateMachine;

    @BeforeEach
    void setUp() {
        eventRepository = mock(PaymentEventRepository.class);
        stateMachine = new PaymentStateMachine(eventRepository);
    }

    private Payment createTestPayment(PaymentStatus initialStatus) {
        Payment payment = new Payment(
                UUID.randomUUID(),
                "ORD-999",
                new BigDecimal("500.00"),
                "INR",
                PaymentMode.PROTECTED,
                "key-test-1",
                "hash-123"
        );
        payment.setStatus(initialStatus);
        return payment;
    }

    @Test
    @DisplayName("null -> INITIATED is a valid initial transition")
    void validInitialTransition() {
        Payment payment = createTestPayment(null);

        stateMachine.transition(payment, PaymentStatus.INITIATED, "Initial creation");

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.INITIATED);

        ArgumentCaptor<PaymentEvent> captor = ArgumentCaptor.forClass(PaymentEvent.class);
        verify(eventRepository).save(captor.capture());
        PaymentEvent savedEvent = captor.getValue();
        assertThat(savedEvent.getFromStatus()).isNull();
        assertThat(savedEvent.getToStatus()).isEqualTo("INITIATED");
        assertThat(savedEvent.getDetail()).isEqualTo("Initial creation");
    }

    @Test
    @DisplayName("INITIATED -> PROCESSING is valid")
    void initiatedToProcessingIsValid() {
        Payment payment = createTestPayment(PaymentStatus.INITIATED);

        stateMachine.transition(payment, PaymentStatus.PROCESSING, "Dispatching to gateway");

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.PROCESSING);
        verify(eventRepository).save(any(PaymentEvent.class));
    }

    @Test
    @DisplayName("PROCESSING -> SUCCESS is valid")
    void processingToSuccessIsValid() {
        Payment payment = createTestPayment(PaymentStatus.PROCESSING);

        stateMachine.transition(payment, PaymentStatus.SUCCESS, "Bank confirmed");

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
    }

    @Test
    @DisplayName("PROCESSING -> UNKNOWN is valid for timeouts")
    void processingToUnknownIsValid() {
        Payment payment = createTestPayment(PaymentStatus.PROCESSING);

        stateMachine.transition(payment, PaymentStatus.UNKNOWN, "Gateway timed out");

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.UNKNOWN);
    }

    @Test
    @DisplayName("UNKNOWN -> SUCCESS is valid upon reconciliation")
    void unknownToSuccessIsValid() {
        Payment payment = createTestPayment(PaymentStatus.UNKNOWN);

        stateMachine.transition(payment, PaymentStatus.SUCCESS, "Reconciled with bank");

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
    }

    @Test
    @DisplayName("INITIATED -> SUCCESS without PROCESSING is rejected")
    void directInitiatedToSuccessIsRejected() {
        Payment payment = createTestPayment(PaymentStatus.INITIATED);

        assertThatThrownBy(() -> stateMachine.transition(payment, PaymentStatus.SUCCESS, "Illegal jump"))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("Invalid state transition from INITIATED to SUCCESS");

        verifyNoInteractions(eventRepository);
    }

    @Test
    @DisplayName("Terminal SUCCESS cannot transition to anything else")
    void terminalSuccessCannotTransition() {
        Payment payment = createTestPayment(PaymentStatus.SUCCESS);

        assertThatThrownBy(() -> stateMachine.transition(payment, PaymentStatus.PROCESSING, "Retry after success"))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("Invalid state transition from SUCCESS to PROCESSING");

        verifyNoInteractions(eventRepository);
    }
}
