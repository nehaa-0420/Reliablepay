package com.reliablepay.payment.worker;

import com.reliablepay.payment.model.Payment;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.repository.PaymentRepository;
import com.reliablepay.payment.service.PaymentProcessingService;
import com.reliablepay.payment.service.PaymentStateMachine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class PaymentRetryWorker {

    private static final Logger log = LoggerFactory.getLogger(PaymentRetryWorker.class);

    private final PaymentRepository paymentRepository;
    private final PaymentStateMachine stateMachine;
    private final PaymentProcessingService processingService;
    private final TransactionTemplate transactionTemplate;

    public PaymentRetryWorker(PaymentRepository paymentRepository,
                              PaymentStateMachine stateMachine,
                              PaymentProcessingService processingService,
                              PlatformTransactionManager transactionManager) {
        this.paymentRepository = paymentRepository;
        this.stateMachine = stateMachine;
        this.processingService = processingService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * Polls for due RETRYING payments using SELECT ... FOR UPDATE SKIP LOCKED.
     * Transitions them to PROCESSING in a short transaction, then dispatches execution
     * without holding a database transaction during the external HTTP call.
     */
    @Scheduled(fixedDelayString = "${app.retry.poll-interval-ms:1000}")
    public void processDueRetries() {
        try {
            List<UUID> claimedPaymentIds = transactionTemplate.execute(status -> {
                Instant now = Instant.now();
                List<Payment> duePayments = paymentRepository.findDueRetryingPaymentsForUpdate(now, 10);
                if (duePayments.isEmpty()) {
                    return List.of();
                }

                log.info("Claimed {} due RETRYING payments for retry", duePayments.size());
                List<UUID> claimed = new ArrayList<>(duePayments.size());

                for (Payment payment : duePayments) {
                    payment.setAttemptCount(payment.getAttemptCount() + 1);
                    stateMachine.transition(payment, PaymentStatus.PROCESSING,
                            "Retry attempt " + payment.getAttemptCount() + " picked up by retry worker");
                    paymentRepository.saveAndFlush(payment);
                    claimed.add(payment.getId());
                }

                return claimed;
            });

            if (claimedPaymentIds != null && !claimedPaymentIds.isEmpty()) {
                for (UUID paymentId : claimedPaymentIds) {
                    // Dispatch retry asynchronously on worker pool without holding any DB connection
                    processingService.processPaymentAsync(paymentId);
                }
            }
        } catch (org.springframework.orm.ObjectOptimisticLockingFailureException | jakarta.persistence.OptimisticLockException ex) {
            log.warn("Optimistic lock conflict in retry worker, skipping cycle: {}", ex.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error in retry worker", ex);
        }
    }
}
