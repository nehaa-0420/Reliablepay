package com.reliablepay.payment.dto;

import com.reliablepay.payment.client.ChaosConfigRequest;

public class ExperimentRunRequest {

    private int count = 100;
    private int concurrency = 10;
    private double duplicateSubmitRate = 0.2;
    private ChaosConfigRequest chaos;

    public ExperimentRunRequest() {
    }

    public ExperimentRunRequest(int count, int concurrency, double duplicateSubmitRate, ChaosConfigRequest chaos) {
        this.count = Math.min(Math.max(count, 1), 300);
        this.concurrency = Math.min(Math.max(concurrency, 1), 50);
        this.duplicateSubmitRate = Math.min(Math.max(duplicateSubmitRate, 0.0), 1.0);
        this.chaos = chaos;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = Math.min(Math.max(count, 1), 300);
    }

    public int getConcurrency() {
        return concurrency;
    }

    public void setConcurrency(int concurrency) {
        this.concurrency = Math.min(Math.max(concurrency, 1), 50);
    }

    public double getDuplicateSubmitRate() {
        return duplicateSubmitRate;
    }

    public void setDuplicateSubmitRate(double duplicateSubmitRate) {
        this.duplicateSubmitRate = Math.min(Math.max(duplicateSubmitRate, 0.0), 1.0);
    }

    public ChaosConfigRequest getChaos() {
        return chaos;
    }

    public void setChaos(ChaosConfigRequest chaos) {
        this.chaos = chaos;
    }
}
