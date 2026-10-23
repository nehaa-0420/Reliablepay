package com.reliablepay.mockbank.dto;

public class ChaosConfigRequest {

    private Double timeoutRate;
    private Double errorRate;
    private Double channelFailureRate;
    private Double chargeOnTimeoutProbability;
    private Integer latencyMs;

    public ChaosConfigRequest() {
    }

    public ChaosConfigRequest(Double timeoutRate, Double errorRate, Double channelFailureRate, Double chargeOnTimeoutProbability, Integer latencyMs) {
        this.timeoutRate = timeoutRate;
        this.errorRate = errorRate;
        this.channelFailureRate = channelFailureRate;
        this.chargeOnTimeoutProbability = chargeOnTimeoutProbability;
        this.latencyMs = latencyMs;
    }

    public Double getTimeoutRate() {
        return timeoutRate;
    }

    public void setTimeoutRate(Double timeoutRate) {
        this.timeoutRate = timeoutRate;
    }

    public Double getErrorRate() {
        return errorRate;
    }

    public void setErrorRate(Double errorRate) {
        this.errorRate = errorRate;
    }

    public Double getChannelFailureRate() {
        return channelFailureRate;
    }

    public void setChannelFailureRate(Double channelFailureRate) {
        this.channelFailureRate = channelFailureRate;
    }

    public Double getChargeOnTimeoutProbability() {
        return chargeOnTimeoutProbability;
    }

    public void setChargeOnTimeoutProbability(Double chargeOnTimeoutProbability) {
        this.chargeOnTimeoutProbability = chargeOnTimeoutProbability;
    }

    public Integer getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(Integer latencyMs) {
        this.latencyMs = latencyMs;
    }
}
