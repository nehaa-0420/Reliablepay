package com.reliablepay.mockbank.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "chaos_config", schema = "bank")
public class ChaosConfig {

    @Id
    private Integer id = 1;

    @Column(name = "timeout_rate", nullable = false)
    private double timeoutRate = 0.0;

    @Column(name = "error_rate", nullable = false)
    private double errorRate = 0.0;

    @Column(name = "channel_failure_rate", nullable = false)
    private double channelFailureRate = 0.0;

    @Column(name = "charge_on_timeout_probability", nullable = false)
    private double chargeOnTimeoutProbability = 0.5;

    @Column(name = "latency_ms", nullable = false)
    private int latencyMs = 0;

    public ChaosConfig() {
    }

    public ChaosConfig(double timeoutRate, double errorRate, double channelFailureRate, double chargeOnTimeoutProbability, int latencyMs) {
        this.id = 1;
        this.timeoutRate = timeoutRate;
        this.errorRate = errorRate;
        this.channelFailureRate = channelFailureRate;
        this.chargeOnTimeoutProbability = chargeOnTimeoutProbability;
        this.latencyMs = latencyMs;
    }

    // Getters and Setters

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public double getTimeoutRate() {
        return timeoutRate;
    }

    public void setTimeoutRate(double timeoutRate) {
        this.timeoutRate = timeoutRate;
    }

    public double getErrorRate() {
        return errorRate;
    }

    public void setErrorRate(double errorRate) {
        this.errorRate = errorRate;
    }

    public double getChannelFailureRate() {
        return channelFailureRate;
    }

    public void setChannelFailureRate(double channelFailureRate) {
        this.channelFailureRate = channelFailureRate;
    }

    public double getChargeOnTimeoutProbability() {
        return chargeOnTimeoutProbability;
    }

    public void setChargeOnTimeoutProbability(double chargeOnTimeoutProbability) {
        this.chargeOnTimeoutProbability = chargeOnTimeoutProbability;
    }

    public int getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(int latencyMs) {
        this.latencyMs = latencyMs;
    }
}
