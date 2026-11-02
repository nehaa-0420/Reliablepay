package com.reliablepay.payment.worker;

import com.reliablepay.payment.config.ReconcileProperties;
import com.reliablepay.payment.config.RecoveryProperties;
import com.reliablepay.payment.model.Payment;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.repository.PaymentRepository;
import com.reliablepay.payment.service.PaymentStateMachine;
import jakarta.persistence.OptimisticLockException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * PaymentRecoveryWorker: Periodically checks for payments stuck in PROCESSING state
 * due to server restart, crash, or unhandled process interruption.
 *
 * Safety rules:
 * - Only PROTECTED mode payments are recovered. NAIVE mode stays unsafe.
 * - Payments whose updated_at is older than app.recovery.stale-processing-ms (default 60000ms)
 *   are transitioned to UNKNOWN through PaymentStateMachine with detail:
 *   "Recovered after interruption: outcome unknown".
 * - Uses SELECT ... FOR UPDATE SKIP LOCKED to prevent concurrent worker contention.
 * - Catches OptimisticLockException to handle concurrent updates gracefully.
 * - Publishes normal SSE stream events via PaymentStateMachine commit hooks.
 * - PaymentReconciliationWorker will subsequently query the mock-bank status and resolve
 *   the payment to SUCCESS (if debited) or RETRYING (if not debited).
 */
@Component
public class PaymentRecoveryWorker {

    private static final Logger log = LoggerFactory.getLogger(PaymentRecoveryWorker.class);

    private final PaymentRepository paymentRepository;
    private final PaymentStateMachine stateMachine;
    private final RecoveryProperties recoveryProperties;
    private final ReconcileProperties reconcileProperties;
    private final TransactionTemplate transactionTemplate;

    public PaymentRecoveryWorker(PaymentRepository paymentRepository,
                                 PaymentStateMachine stateMachine,
                                 RecoveryProperties recoveryProperties,
                                 ReconcileProperties reconcileProperties,
                                 PlatformTransactionManager transactionManager) {
        this.paymentRepository = paymentRepository;
        this.stateMachine = stateMachine;
        this.recoveryProperties = recoveryProperties;
        this.reconcileProperties = reconcileProperties;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Scheduled(fixedDelayString = "${app.recovery.poll-interval-ms:2000}")
    public void recoverStaleProcessingPayments() {
        if (!recoveryProperties.isEnabled()) {
            return;
        }

        try {
            Instant threshold = Instant.now().minusMillis(recoveryProperties.getStaleProcessingMs());

            List<UUID> recoveredIds = transactionTemplate.execute(status -> {
                List<Payment> stalePayments = paymentRepository.findStaleProcessingPaymentsForUpdate(threshold, 10);
                if (stalePayments.isEmpty()) {
                    return List.of();
                }

                log.info("Claimed {} stale PROCESSING payments for recovery", stalePayments.size());
                List<UUID> ids = new ArrayList<>(stalePayments.size());

                for (Payment payment : stalePayments) {
                    stateMachine.transition(payment, PaymentStatus.UNKNOWN, "Recovered after interruption: outcome unknown");
                    // Ensure updated_at allows reconciliation worker to pick it up without waiting another grace period
                    long graceMs = reconcileProperties != null ? reconcileProperties.getGraceMs() : 6000;
                    payment.setUpdatedAt(Instant.now().minusMillis(graceMs + 1000));
                    paymentRepository.saveAndFlush(payment);
                    ids.add(payment.getId());
                }

                return ids;
            });

            if (recoveredIds != null && !recoveredIds.isEmpty()) {
                log.info("Successfully recovered {} stuck PROCESSING payments to UNKNOWN", recoveredIds.size());
            }
        } catch (ObjectOptimisticLockingFailureException | OptimisticLockException ex) {
            log.warn("Optimistic lock conflict during stale payment recovery, skipping cycle: {}", ex.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error in payment recovery worker", ex);
        }
    }
}
