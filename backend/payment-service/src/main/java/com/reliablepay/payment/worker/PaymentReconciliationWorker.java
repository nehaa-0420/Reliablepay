package com.reliablepay.payment.worker;

import com.reliablepay.payment.client.BankClient;
import com.reliablepay.payment.client.BankStatusResponse;
import com.reliablepay.payment.config.ReconcileProperties;
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

@Component
public class PaymentReconciliationWorker {

    private static final Logger log = LoggerFactory.getLogger(PaymentReconciliationWorker.class);

    private final PaymentRepository paymentRepository;
    private final PaymentStateMachine stateMachine;
    private final BankClient bankClient;
    private final ReconcileProperties reconcileProperties;
    private final TransactionTemplate transactionTemplate;

    public PaymentReconciliationWorker(PaymentRepository paymentRepository,
                                       PaymentStateMachine stateMachine,
                                       BankClient bankClient,
                                       ReconcileProperties reconcileProperties,
                                       PlatformTransactionManager transactionManager) {
        this.paymentRepository = paymentRepository;
        this.stateMachine = stateMachine;
        this.bankClient = bankClient;
        this.reconcileProperties = reconcileProperties;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * Polls for UNKNOWN payments whose last attempt is older than app.reconcile.grace-ms.
     * Reconciles status with the bank:
     * - If charged at bank -> transitions to SUCCESS
     * - If NOT charged at bank -> transitions to RETRYING with next_retry_at = now
     */
    @Scheduled(fixedDelayString = "${app.reconcile.poll-interval-ms:2000}")
    public void reconcileUnknownPayments() {
        if (!reconcileProperties.isEnabled()) {
            return;
        }

        try {
            Instant threshold = Instant.now().minusMillis(reconcileProperties.getGraceMs());

            // Step 1: Claim due UNKNOWN payments in short transaction with FOR UPDATE SKIP LOCKED
            List<UUID> claimedIds = transactionTemplate.execute(status -> {
                List<Payment> dueUnknowns = paymentRepository.findDueUnknownPaymentsForUpdate(threshold, 10);
                if (dueUnknowns.isEmpty()) {
                    return List.of();
                }

                log.info("Claimed {} due UNKNOWN payments for reconciliation", dueUnknowns.size());
                List<UUID> ids = new ArrayList<>(dueUnknowns.size());
                for (Payment p : dueUnknowns) {
                    // Extend lease forward so other scheduler ticks won't pick it up while reconciling
                    p.setUpdatedAt(Instant.now().plusSeconds(60));
                    paymentRepository.saveAndFlush(p);
                    ids.add(p.getId());
                }
                return ids;
            });

            if (claimedIds == null || claimedIds.isEmpty()) {
                return;
            }

            // Step 2 & 3: Reconcile each payment individually without holding DB transactions during HTTP
            for (UUID paymentId : claimedIds) {
                reconcileSinglePayment(paymentId);
            }

        } catch (ObjectOptimisticLockingFailureException | OptimisticLockException ex) {
            log.warn("Optimistic lock conflict during reconciliation, skipping cycle: {}", ex.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error in reconciliation worker", ex);
        }
    }

    public void reconcileSinglePayment(UUID paymentId) {
        try {
            // Step 2: HTTP call to bank status (NO DB TRANSACTION HELD)
            log.info("Querying bank status for UNKNOWN payment {}", paymentId);
            BankStatusResponse bankStatus = bankClient.getStatus(paymentId.toString());
            if (bankStatus == null) {
                log.warn("Null bank status response for payment {}, skipping cycle", paymentId);
                return;
            }
            log.info("Bank status for {}: charged={}, count={}", paymentId, bankStatus.charged(), bankStatus.count());

            // Step 3: Transition payment state in short transaction
            transactionTemplate.executeWithoutResult(status -> {
                Payment payment = paymentRepository.findById(paymentId).orElse(null);
                if (payment == null) {
                    return;
                }

                if (bankStatus != null && bankStatus.charged()) {
                    // Ground truth: bank already debited funds! Mark SUCCESS without second charge
                    payment.setLastError(null);
                    payment.setNextRetryAt(null);
                    stateMachine.transition(payment, PaymentStatus.SUCCESS,
                            "Reconciled with bank: charge confirmed (count=" + bankStatus.count() + ")");
                    paymentRepository.saveAndFlush(payment);
                    log.info("Reconciliation RESOLVED payment {} to SUCCESS", paymentId);
                } else {
                    // Ground truth: bank was never charged! Safe to retry immediately
                    payment.setLastError("Reconciled with bank: charge not found; scheduled immediate retry");
                    payment.setNextRetryAt(Instant.now());
                    stateMachine.transition(payment, PaymentStatus.RETRYING,
                            "Reconciled with bank: charge not found; marked RETRYING for immediate retry");
                    paymentRepository.saveAndFlush(payment);
                    log.info("Reconciliation MOVED payment {} to RETRYING (immediate retry)", paymentId);
                }
            });

        } catch (ObjectOptimisticLockingFailureException | OptimisticLockException ex) {
            log.warn("Optimistic lock conflict on reconciling payment {}, skipping: {}", paymentId, ex.getMessage());
        } catch (Exception ex) {
            log.error("Failed to reconcile payment {}", paymentId, ex);
        }
    }
}
