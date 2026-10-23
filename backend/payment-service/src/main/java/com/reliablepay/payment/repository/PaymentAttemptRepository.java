package com.reliablepay.payment.repository;

import com.reliablepay.payment.model.PaymentAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentAttemptRepository extends JpaRepository<PaymentAttempt, Long> {
    List<PaymentAttempt> findByPaymentIdOrderByAttemptNoAsc(UUID paymentId);

    @Query(value = "SELECT COALESCE(AVG(latency_ms)::float8, 0.0) FROM payment_attempts WHERE latency_ms IS NOT NULL", nativeQuery = true)
    Double calculateAvgLatencyMs();

    @Query(value = "SELECT COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::float8, 0.0) FROM payment_attempts WHERE latency_ms IS NOT NULL", nativeQuery = true)
    Double calculateP95LatencyMs();

    @Query(value = "SELECT COALESCE(AVG(a.latency_ms)::float8, 0.0) FROM payment_attempts a JOIN payments p ON a.payment_id = p.id WHERE p.merchant_ref LIKE CONCAT(:prefix, '%') AND a.latency_ms IS NOT NULL", nativeQuery = true)
    Double calculateAvgLatencyMsByPrefix(@Param("prefix") String prefix);

    @Query(value = "SELECT COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY a.latency_ms)::float8, 0.0) FROM payment_attempts a JOIN payments p ON a.payment_id = p.id WHERE p.merchant_ref LIKE CONCAT(:prefix, '%') AND a.latency_ms IS NOT NULL", nativeQuery = true)
    Double calculateP95LatencyMsByPrefix(@Param("prefix") String prefix);
}
