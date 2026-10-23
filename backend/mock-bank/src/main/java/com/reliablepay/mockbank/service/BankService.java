package com.reliablepay.mockbank.service;

import com.reliablepay.mockbank.dto.*;
import com.reliablepay.mockbank.exception.BankErrorException;
import com.reliablepay.mockbank.exception.ChannelFailureException;
import com.reliablepay.mockbank.model.BankCharge;
import com.reliablepay.mockbank.model.ChaosConfig;
import com.reliablepay.mockbank.repository.BankChargeRepository;
import com.reliablepay.mockbank.repository.ChaosConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BankService {

    private static final Logger log = LoggerFactory.getLogger(BankService.class);

    private final BankChargeRepository chargeRepository;
    private final ChaosConfigRepository chaosRepository;

    public BankService(BankChargeRepository chargeRepository, ChaosConfigRepository chaosRepository) {
        this.chargeRepository = chargeRepository;
        this.chaosRepository = chaosRepository;
    }

    public ChaosConfig getChaosConfig() {
        return chaosRepository.findById(1).orElseGet(() -> chaosRepository.save(new ChaosConfig()));
    }

    @Transactional
    public ChaosConfig updateChaosConfig(ChaosConfigRequest req) {
        ChaosConfig config = getChaosConfig();
        if (req.getTimeoutRate() != null) config.setTimeoutRate(req.getTimeoutRate());
        if (req.getErrorRate() != null) config.setErrorRate(req.getErrorRate());
        if (req.getChannelFailureRate() != null) config.setChannelFailureRate(req.getChannelFailureRate());
        if (req.getChargeOnTimeoutProbability() != null) config.setChargeOnTimeoutProbability(req.getChargeOnTimeoutProbability());
        if (req.getLatencyMs() != null) config.setLatencyMs(req.getLatencyMs());
        return chaosRepository.save(config);
    }

    public ChargeResponse processCharge(ChargeRequest request) {
        ChaosConfig chaos = getChaosConfig();

        // 1. Injected base latency if configured
        if (chaos.getLatencyMs() > 0) {
            try {
                Thread.sleep(chaos.getLatencyMs());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        // 2. Failure injection decision
        double roll = Math.random();

        if (roll < chaos.getErrorRate()) {
            log.info("Chaos triggered: ERROR 500 for paymentRef: {}", request.getPaymentRef());
            throw new BankErrorException("Simulated bank internal processing error");
        }

        if (roll < (chaos.getErrorRate() + chaos.getChannelFailureRate())) {
            log.info("Chaos triggered: CHANNEL_FAILURE 503 for paymentRef: {}", request.getPaymentRef());
            throw new ChannelFailureException("Channel negotiation failed: secure channel handshake unsynchronized");
        }

        if (roll < (chaos.getErrorRate() + chaos.getChannelFailureRate() + chaos.getTimeoutRate())) {
            log.info("Chaos triggered: TIMEOUT for paymentRef: {}, orderRef: {}", request.getPaymentRef(), request.getOrderRef());
            // Check if charge should be recorded before hanging
            if (Math.random() < chaos.getChargeOnTimeoutProbability()) {
                log.info("Chaos: recording ground-truth charge BEFORE timeout for ref: {}, orderRef: {}", request.getPaymentRef(), request.getOrderRef());
                chargeRepository.save(new BankCharge(request.getPaymentRef(), request.getOrderRef(), request.getAmount()));
            }
            // Sleep longer than the client's 2000ms read timeout so the caller times out
            try {
                Thread.sleep(3500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return new ChargeResponse(request.getPaymentRef(), true, null, request.getAmount(), null);
        }

        // 3. Normal successful charge
        BankCharge charge = chargeRepository.save(new BankCharge(request.getPaymentRef(), request.getOrderRef(), request.getAmount()));
        log.info("Bank charge recorded: id={}, ref={}, orderRef={}, amount={}", charge.getId(), charge.getPaymentRef(), charge.getOrderRef(), charge.getAmount());
        return new ChargeResponse(charge.getPaymentRef(), true, charge.getId(), charge.getAmount(), charge.getCreatedAt());
    }

    public BankStatusResponse getStatus(String paymentRef) {
        long count = chargeRepository.countByPaymentRef(paymentRef);
        return new BankStatusResponse(paymentRef, count > 0, count);
    }

    public List<BankCharge> getCharges(String paymentRef) {
        if (paymentRef != null && !paymentRef.trim().isEmpty()) {
            return chargeRepository.findByPaymentRefOrderByCreatedAtAsc(paymentRef.trim());
        }
        return chargeRepository.findAll();
    }

    public BankStatsResponse getStats() {
        long total = chargeRepository.count();
        long distinct = chargeRepository.countDistinctPaymentRefs();
        long duplicateCharges = Math.max(0, total - distinct);
        long duplicateRefs = chargeRepository.findDuplicateCharges().size();
        long duplicateOrders = chargeRepository.findDuplicateOrders().size();
        java.math.BigDecimal overcharged = chargeRepository.calculateOverchargedAmount();
        if (overcharged == null) {
            overcharged = java.math.BigDecimal.ZERO;
        }
        return new BankStatsResponse(total, duplicateCharges, duplicateRefs, duplicateOrders, overcharged);
    }

    @Transactional
    public void reset() {
        chargeRepository.deleteAllInBatch();
        ChaosConfig config = getChaosConfig();
        config.setTimeoutRate(0.0);
        config.setErrorRate(0.0);
        config.setChannelFailureRate(0.0);
        config.setChargeOnTimeoutProbability(0.5);
        config.setLatencyMs(0);
        chaosRepository.save(config);
        log.info("Mock bank reset to default clean state");
    }
}
