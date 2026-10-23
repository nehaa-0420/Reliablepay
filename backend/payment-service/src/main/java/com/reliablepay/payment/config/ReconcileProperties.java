package com.reliablepay.payment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.reconcile")
public class ReconcileProperties {

    private boolean enabled = true;
    private long graceMs = 6000;
    private long pollIntervalMs = 2000;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public long getGraceMs() {
        return graceMs;
    }

    public void setGraceMs(long graceMs) {
        this.graceMs = graceMs;
    }

    public long getPollIntervalMs() {
        return pollIntervalMs;
    }

    public void setPollIntervalMs(long pollIntervalMs) {
        this.pollIntervalMs = pollIntervalMs;
    }
}
