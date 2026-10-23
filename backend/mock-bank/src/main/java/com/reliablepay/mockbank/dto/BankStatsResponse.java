package com.reliablepay.mockbank.dto;

import java.math.BigDecimal;

public class BankStatsResponse {

    private long totalCharges;
    private long duplicateCharges;
    private long duplicateRefsCount;
    private long duplicateOrdersCount;
    private BigDecimal overchargedAmount;

    public BankStatsResponse() {
    }

    public BankStatsResponse(long totalCharges, long duplicateCharges, long duplicateRefsCount, long duplicateOrdersCount, BigDecimal overchargedAmount) {
        this.totalCharges = totalCharges;
        this.duplicateCharges = duplicateCharges;
        this.duplicateRefsCount = duplicateRefsCount;
        this.duplicateOrdersCount = duplicateOrdersCount;
        this.overchargedAmount = overchargedAmount != null ? overchargedAmount : BigDecimal.ZERO;
    }

    public long getTotalCharges() {
        return totalCharges;
    }

    public void setTotalCharges(long totalCharges) {
        this.totalCharges = totalCharges;
    }

    public long getDuplicateCharges() {
        return duplicateCharges;
    }

    public void setDuplicateCharges(long duplicateCharges) {
        this.duplicateCharges = duplicateCharges;
    }

    public long getDuplicateRefsCount() {
        return duplicateRefsCount;
    }

    public void setDuplicateRefsCount(long duplicateRefsCount) {
        this.duplicateRefsCount = duplicateRefsCount;
    }

    public long getDuplicateOrdersCount() {
        return duplicateOrdersCount;
    }

    public void setDuplicateOrdersCount(long duplicateOrdersCount) {
        this.duplicateOrdersCount = duplicateOrdersCount;
    }

    public BigDecimal getOverchargedAmount() {
        return overchargedAmount;
    }

    public void setOverchargedAmount(BigDecimal overchargedAmount) {
        this.overchargedAmount = overchargedAmount;
    }
}
