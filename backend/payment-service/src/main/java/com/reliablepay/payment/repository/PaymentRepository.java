package com.reliablepay.payment.repository;

import com.reliablepay.payment.model.Payment;
import com.reliablepay.payment.model.PaymentMode;
import com.reliablepay.payment.model.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByIdempotencyKey(String idempotencyKey);
    Page<Payment> findByStatus(PaymentStatus status, Pageable pageable);
    Page<Payment> findByMode(PaymentMode mode, Pageable pageable);
    Page<Payment> findByStatusAndMode(PaymentStatus status, PaymentMode mode, Pageable pageable);

    @Query(value = "SELECT * FROM payments WHERE status = 'RETRYING' AND next_retry_at <= :now ORDER BY next_retry_at ASC LIMIT :limit FOR UPDATE SKIP LOCKED", nativeQuery = true)
    List<Payment> findDueRetryingPaymentsForUpdate(@Param("now") Instant now, @Param("limit") int limit);

    @Query(value = "SELECT * FROM payments WHERE status = 'UNKNOWN' AND updated_at <= :threshold ORDER BY updated_at ASC LIMIT :limit FOR UPDATE SKIP LOCKED", nativeQuery = true)
    List<Payment> findDueUnknownPaymentsForUpdate(@Param("threshold") Instant threshold, @Param("limit") int limit);

    @Query("SELECT p.status, COUNT(p) FROM Payment p GROUP BY p.status")
    List<Object[]> countByStatusGrouped();

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.status = com.reliablepay.payment.model.PaymentStatus.SUCCESS AND p.attemptCount > 1")
    long countRetriedSuccess();

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.attemptCount > 1")
    long countAllRetried();

    @Query(value = "SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000), 0.0) FROM payments WHERE status = 'SUCCESS' AND attempt_count > 1", nativeQuery = true)
    Double calculateAvgRecoveryMs();

    // Experiment queries by merchant_ref prefix
    @Query("SELECT COUNT(p) FROM Payment p WHERE p.merchantRef LIKE CONCAT(:prefix, '%')")
    long countByMerchantRefPrefix(@Param("prefix") String prefix);

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.merchantRef LIKE CONCAT(:prefix, '%') AND p.status = :status")
    long countByMerchantRefPrefixAndStatus(@Param("prefix") String prefix, @Param("status") PaymentStatus status);

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.merchantRef LIKE CONCAT(:prefix, '%') AND p.status = com.reliablepay.payment.model.PaymentStatus.SUCCESS AND p.attemptCount > 1")
    long countRetriedSuccessByPrefix(@Param("prefix") String prefix);

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.merchantRef LIKE CONCAT(:prefix, '%') AND p.attemptCount > 1")
    long countAllRetriedByPrefix(@Param("prefix") String prefix);

    @Query("SELECT COUNT(DISTINCT p.merchantRef) FROM Payment p WHERE p.merchantRef LIKE CONCAT(:prefix, '%') AND p.status = com.reliablepay.payment.model.PaymentStatus.SUCCESS")
    long countOrdersSucceededByPrefix(@Param("prefix") String prefix);

    @Query(value = "SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000), 0.0) FROM payments WHERE merchant_ref LIKE CONCAT(:prefix, '%') AND status = 'SUCCESS' AND attempt_count > 1", nativeQuery = true)
    Double calculateAvgRecoveryMsByPrefix(@Param("prefix") String prefix);
}
