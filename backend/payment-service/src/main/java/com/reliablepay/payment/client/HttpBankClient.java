package com.reliablepay.payment.client;

import com.reliablepay.payment.config.BankProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Component
public class HttpBankClient implements BankClient {

    private static final Logger log = LoggerFactory.getLogger(HttpBankClient.class);

    private final RestClient restClient;
    private final SimpleClientHttpRequestFactory requestFactory;
    private final BankProperties bankProperties;

    public HttpBankClient(@Value("${app.mock-bank-url:http://localhost:8081}") String mockBankUrl,
                          @Value("${app.admin-token:}") String adminToken,
                          BankProperties bankProperties) {
        this.bankProperties = bankProperties;
        this.requestFactory = new SimpleClientHttpRequestFactory();
        this.requestFactory.setConnectTimeout(Duration.ofMillis(bankProperties.getConnectTimeoutMs()));
        this.requestFactory.setReadTimeout(Duration.ofMillis(bankProperties.getReadTimeoutMs()));

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(mockBankUrl)
                .requestFactory(this.requestFactory);

        if (adminToken != null && !adminToken.isBlank()) {
            builder.defaultHeader("X-Admin-Token", adminToken.trim());
        }

        this.restClient = builder.build();
    }

    @Override
    public void updateReadTimeout(int readTimeoutMs) {
        this.requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        this.bankProperties.setReadTimeoutMs(readTimeoutMs);
        log.info("Bank client read timeout dynamically updated to {}ms", readTimeoutMs);
    }

    @Override
    public boolean isHealthy() {
        try {
            ResponseEntity<String> response = restClient.get()
                    .uri("/actuator/health")
                    .retrieve()
                    .toEntity(String.class);
            return response.getStatusCode().is2xxSuccessful()
                    && response.getBody() != null
                    && response.getBody().contains("UP");
        } catch (Exception ex) {
            log.warn("Mock bank health check unreachable: {}", ex.getMessage());
            return false;
        }
    }

    @Override
    public BankCallResult charge(String paymentRef, String orderRef, BigDecimal amount) {
        long start = System.currentTimeMillis();
        Map<String, Object> payload = new HashMap<>();
        payload.put("paymentRef", paymentRef);
        payload.put("orderRef", orderRef);
        payload.put("amount", amount);

        try {
            return restClient.post()
                    .uri("/bank/charge")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .exchange((request, response) -> {
                        int latency = (int) (System.currentTimeMillis() - start);
                        int status = response.getStatusCode().value();
                        String responseBody = new String(response.getBody().readAllBytes(), StandardCharsets.UTF_8);

                        if (status >= 200 && status < 300) {
                            log.info("Bank charge succeeded for ref: {} (latency: {}ms)", paymentRef, latency);
                            return new BankCallResult(BankOutcome.SUCCESS, latency, null, responseBody);
                        } else if (status == 503 || responseBody.contains("CHANNEL_FAILURE")) {
                            log.warn("Bank charge CHANNEL_FAILURE (503) for ref: {} (latency: {}ms)", paymentRef, latency);
                            return new BankCallResult(BankOutcome.CHANNEL_FAILURE, latency, "CHANNEL_FAILURE", responseBody);
                        } else if (status >= 500) {
                            log.warn("Bank charge server error ({}) for ref: {} (latency: {}ms)", status, paymentRef, latency);
                            return new BankCallResult(BankOutcome.ERROR, latency, "BANK_ERROR_" + status, responseBody);
                        } else {
                            log.warn("Bank charge client error ({}) for ref: {} (latency: {}ms)", status, paymentRef, latency);
                            return new BankCallResult(BankOutcome.ERROR, latency, "HTTP_" + status, responseBody);
                        }
                    });
        } catch (ResourceAccessException ex) {
            int latency = (int) (System.currentTimeMillis() - start);
            Throwable cause = ex.getCause();
            if (cause instanceof SocketTimeoutException || (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("timed out"))) {
                log.warn("Bank charge read timeout for ref: {} after {}ms", paymentRef, latency);
                return new BankCallResult(BankOutcome.TIMEOUT, latency, "TIMEOUT", ex.getMessage());
            }
            log.warn("Bank charge connection/I/O error for ref: {}: {}", paymentRef, ex.getMessage());
            return new BankCallResult(BankOutcome.ERROR, latency, "CONNECTION_ERROR", ex.getMessage());
        } catch (Exception ex) {
            int latency = (int) (System.currentTimeMillis() - start);
            log.error("Unexpected error during bank charge for ref: {}", paymentRef, ex);
            return new BankCallResult(BankOutcome.ERROR, latency, "CLIENT_ERROR", ex.getMessage());
        }
    }

    @Override
    public BankStatusResponse getStatus(String paymentRef) {
        return restClient.get()
                .uri("/bank/status/{paymentRef}", paymentRef)
                .retrieve()
                .body(BankStatusResponse.class);
    }

    @Override
    public BankStatsResponse getStats() {
        return restClient.get()
                .uri("/bank/admin/stats")
                .retrieve()
                .body(BankStatsResponse.class);
    }

    @Override
    public ChaosConfigResponse getChaosConfig() {
        return restClient.get()
                .uri("/bank/admin/chaos")
                .retrieve()
                .body(ChaosConfigResponse.class);
    }

    @Override
    public ChaosConfigResponse updateChaosConfig(ChaosConfigRequest request) {
        return restClient.put()
                .uri("/bank/admin/chaos")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(ChaosConfigResponse.class);
    }

    @Override
    public void reset() {
        restClient.post()
                .uri("/bank/admin/reset")
                .retrieve()
                .toBodilessEntity();
    }
}
