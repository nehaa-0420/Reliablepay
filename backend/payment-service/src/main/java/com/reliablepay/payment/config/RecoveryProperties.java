package com.reliablepay.payment.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for the stale PROCESSING payment recovery worker.
 */
@Component
@ConfigurationProperties(prefix = "app.recovery")
public class RecoveryProperties {

    private boolean enabled = true;
    private long staleProcessingMs = 60000;
    private long pollIntervalMs = 2000;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public long getStaleProcessingMs() {
        return staleProcessingMs;
    }

    public void setStaleProcessingMs(long staleProcessingMs) {
        this.staleProcessingMs = staleProcessingMs;
    }

    public long getPollIntervalMs() {
        return pollIntervalMs;
    }

    public void setPollIntervalMs(long pollIntervalMs) {
        this.pollIntervalMs = pollIntervalMs;
    }
}
