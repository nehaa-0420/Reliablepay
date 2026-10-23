package com.reliablepay.mockbank.repository;

import com.reliablepay.mockbank.model.BankCharge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface BankChargeRepository extends JpaRepository<BankCharge, Long> {
    List<BankCharge> findByPaymentRefOrderByCreatedAtAsc(String paymentRef);
    long countByPaymentRef(String paymentRef);

    @Query("SELECT COUNT(DISTINCT c.paymentRef) FROM BankCharge c")
    long countDistinctPaymentRefs();

    @Query("SELECT c.paymentRef, COUNT(c) FROM BankCharge c GROUP BY c.paymentRef HAVING COUNT(c) > 1")
    List<Object[]> findDuplicateCharges();

    @Query("SELECT c.orderRef, COUNT(c) FROM BankCharge c WHERE c.orderRef IS NOT NULL GROUP BY c.orderRef HAVING COUNT(c) > 1")
    List<Object[]> findDuplicateOrders();

    @Query(value = """
        WITH ranked AS (
            SELECT order_ref, amount, ROW_NUMBER() OVER (PARTITION BY order_ref ORDER BY created_at ASC, id ASC) as rn
            FROM bank.bank_charges
            WHERE order_ref IS NOT NULL
        )
        SELECT COALESCE(SUM(amount), 0.0) FROM ranked WHERE rn > 1
    """, nativeQuery = true)
    BigDecimal calculateOverchargedAmount();
}
