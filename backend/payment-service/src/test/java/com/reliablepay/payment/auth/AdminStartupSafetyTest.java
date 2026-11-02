package com.reliablepay.payment.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AdminStartupSafetyTest {

    @Test
    @DisplayName("Refuses startup outside local profile when all admin credentials are unset")
    void refusesStartupWhenAllAdminCredentialsUnsetInProduction() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");

        AdminAuthConfig config = new AdminAuthConfig("", "", "", "", env);

        assertThatThrownBy(config::validateOnStartup)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Missing mandatory admin security environment variables outside local profile")
                .hasMessageContaining("ADMIN_USERNAME")
                .hasMessageContaining("ADMIN_PASSWORD")
                .hasMessageContaining("AUTH_TOKEN_SECRET");
    }

    @Test
    @DisplayName("Refuses startup outside local profile when ADMIN_USERNAME is missing")
    void refusesStartupWhenUsernameMissing() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");

        AdminAuthConfig config = new AdminAuthConfig("token", "", "password123", "secret-key-32-chars-minimum-length!!", env);

        assertThatThrownBy(config::validateOnStartup)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ADMIN_USERNAME");
    }

    @Test
    @DisplayName("Refuses startup outside local profile when ADMIN_PASSWORD is missing")
    void refusesStartupWhenPasswordMissing() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");

        AdminAuthConfig config = new AdminAuthConfig("token", "admin", "", "secret-key-32-chars-minimum-length!!", env);

        assertThatThrownBy(config::validateOnStartup)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ADMIN_PASSWORD");
    }

    @Test
    @DisplayName("Refuses startup outside local profile when AUTH_TOKEN_SECRET is missing")
    void refusesStartupWhenTokenSecretMissing() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");

        AdminAuthConfig config = new AdminAuthConfig("token", "admin", "password123", "", env);

        assertThatThrownBy(config::validateOnStartup)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("AUTH_TOKEN_SECRET");
    }

    @Test
    @DisplayName("Starts successfully outside local profile when all mandatory variables are provided")
    void startsSuccessfullyWhenAllVariablesProvided() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("production");

        AdminAuthConfig config = new AdminAuthConfig(
                "token",
                "admin",
                "password123",
                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                env
        );

        assertThatCode(config::validateOnStartup).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Permits startup in local profile even when credentials are unset")
    void permitsStartupInLocalProfile() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("local");

        AdminAuthConfig config = new AdminAuthConfig("", "", "", "", env);

        assertThatCode(config::validateOnStartup).doesNotThrowAnyException();
    }
}
