package com.reliablepay.mockbank;

import com.reliablepay.mockbank.dto.ChargeRequest;
import com.reliablepay.mockbank.dto.ChargeResponse;
import com.reliablepay.mockbank.exception.BankErrorException;
import com.reliablepay.mockbank.exception.ChannelFailureException;
import com.reliablepay.mockbank.model.BankCharge;
import com.reliablepay.mockbank.model.ChaosConfig;
import com.reliablepay.mockbank.repository.BankChargeRepository;
import com.reliablepay.mockbank.repository.ChaosConfigRepository;
import com.reliablepay.mockbank.service.BankService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BankServiceTest {

    private BankChargeRepository chargeRepository;
    private ChaosConfigRepository chaosRepository;
    private BankService bankService;

    @BeforeEach
    void setUp() {
        chargeRepository = mock(BankChargeRepository.class);
        chaosRepository = mock(ChaosConfigRepository.class);
        bankService = new BankService(chargeRepository, chaosRepository);
    }

    @Test
    @DisplayName("Normal charge without chaos persists charge and returns 200")
    void normalChargeSuccess() {
        ChaosConfig zeroChaos = new ChaosConfig(0.0, 0.0, 0.0, 0.5, 0);
        when(chaosRepository.findById(1)).thenReturn(Optional.of(zeroChaos));

        BankCharge saved = new BankCharge("REF-123", new BigDecimal("100.00"));
        saved.setId(1L);
        when(chargeRepository.save(any(BankCharge.class))).thenReturn(saved);

        ChargeResponse response = bankService.processCharge(new ChargeRequest("REF-123", new BigDecimal("100.00")));

        assertThat(response.isCharged()).isTrue();
        assertThat(response.getPaymentRef()).isEqualTo("REF-123");
        verify(chargeRepository).save(any(BankCharge.class));
    }

    @Test
    @DisplayName("Chaos error_rate=1.0 throws BankErrorException (500) and does NOT charge")
    void errorRateInjects500WithoutCharge() {
        ChaosConfig errorChaos = new ChaosConfig(0.0, 1.0, 0.0, 0.5, 0);
        when(chaosRepository.findById(1)).thenReturn(Optional.of(errorChaos));

        assertThatThrownBy(() -> bankService.processCharge(new ChargeRequest("REF-ERR", new BigDecimal("50.00"))))
                .isInstanceOf(BankErrorException.class);

        verify(chargeRepository, never()).save(any(BankCharge.class));
    }

    @Test
    @DisplayName("Chaos channel_failure_rate=1.0 throws ChannelFailureException (503) and does NOT charge")
    void channelFailureRateInjects503WithoutCharge() {
        ChaosConfig channelChaos = new ChaosConfig(0.0, 0.0, 1.0, 0.5, 0);
        when(chaosRepository.findById(1)).thenReturn(Optional.of(channelChaos));

        assertThatThrownBy(() -> bankService.processCharge(new ChargeRequest("REF-CHAN", new BigDecimal("50.00"))))
                .isInstanceOf(ChannelFailureException.class);

        verify(chargeRepository, never()).save(any(BankCharge.class));
    }

    @Test
    @DisplayName("getStats returns total, duplicate refs, duplicate orders and overcharged amount")
    void getStatsWithDuplicateOrders() {
        when(chargeRepository.count()).thenReturn(5L);
        when(chargeRepository.countDistinctPaymentRefs()).thenReturn(4L);
        when(chargeRepository.findDuplicateCharges()).thenReturn(List.<Object[]>of(new Object[]{"REF-1", 2L}));
        when(chargeRepository.findDuplicateOrders()).thenReturn(List.<Object[]>of(new Object[]{"ORD-1", 2L}));
        when(chargeRepository.calculateOverchargedAmount()).thenReturn(new BigDecimal("100.00"));

        com.reliablepay.mockbank.dto.BankStatsResponse stats = bankService.getStats();

        assertThat(stats.getTotalCharges()).isEqualTo(5L);
        assertThat(stats.getDuplicateCharges()).isEqualTo(1L);
        assertThat(stats.getDuplicateRefsCount()).isEqualTo(1L);
        assertThat(stats.getDuplicateOrdersCount()).isEqualTo(1L);
        assertThat(stats.getOverchargedAmount()).isEqualByComparingTo("100.00");
    }
}
