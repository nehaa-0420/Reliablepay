package com.reliablepay.payment.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    public static final String IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";
    public static final String ADMIN_TOKEN_HEADER = "X-Admin-Token";

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .components(new Components()
                        .addSecuritySchemes("AdminTokenAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name(ADMIN_TOKEN_HEADER)
                                .description("Admin authentication token required in production for reset, chaos injection, and experiments. Optional when ADMIN_TOKEN env is unset.")
                        )
                        .addSecuritySchemes("IdempotencyKey", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name(IDEMPOTENCY_KEY_HEADER)
                                .description("Unique client-generated idempotency key (UUID or string). Repeating the key with identical payload returns the cached payment (HTTP 200).")
                        )
                )
                .info(new Info()
                        .title("ReliablePay — Payment Reliability Engine API")
                        .version("0.1.0")
                        .description("Fault-tolerant payment processing system featuring strict idempotency, 7-state payment state machine, exponential backoff retries with jitter, and automated bank reconciliation.")
                        .contact(new Contact().name("ReliablePay Team").url("https://github.com/nehaa-0420/Reliablepay"))
                );
    }
}
