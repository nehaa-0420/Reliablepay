package com.reliablepay.payment.auth;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Administrative authentication credentials and secret configurations.
 * Enforces strictly NO defaults in code.
 * Outside the local or test profiles, startup fails if ADMIN_USERNAME, ADMIN_PASSWORD, or AUTH_TOKEN_SECRET are unset.
 */
@Component
public class AdminAuthConfig {

    private static final Logger log = LoggerFactory.getLogger(AdminAuthConfig.class);

    private final String adminToken;
    private final String adminUsername;
    private final String adminPassword;
    private final String tokenSecret;
    private final Environment environment;

    public AdminAuthConfig(
            @Value("${app.admin-token:${ADMIN_TOKEN:}}") String adminToken,
            @Value("${app.admin.username:${ADMIN_USERNAME:}}") String adminUsername,
            @Value("${app.admin.password:${ADMIN_PASSWORD:}}") String adminPassword,
            @Value("${app.auth.token-secret:${AUTH_TOKEN_SECRET:}}") String tokenSecret,
            Environment environment
    ) {
        this.adminToken = adminToken != null ? adminToken.trim() : "";
        this.adminUsername = adminUsername != null ? adminUsername.trim() : "";
        this.adminPassword = adminPassword != null ? adminPassword.trim() : "";
        this.tokenSecret = tokenSecret != null ? tokenSecret.trim() : "";
        this.environment = environment;
    }

    @PostConstruct
    public void validateOnStartup() {
        boolean isLocalOrTest = environment != null && environment.acceptsProfiles(Profiles.of("local", "test"));
        if (!isLocalOrTest) {
            if (!StringUtils.hasText(adminUsername) || !StringUtils.hasText(adminPassword) || !StringUtils.hasText(tokenSecret)) {
                String missing = (!StringUtils.hasText(adminUsername) ? "ADMIN_USERNAME " : "")
                        + (!StringUtils.hasText(adminPassword) ? "ADMIN_PASSWORD " : "")
                        + (!StringUtils.hasText(tokenSecret) ? "AUTH_TOKEN_SECRET " : "");
                throw new IllegalStateException("Missing mandatory admin security environment variables outside local profile: " + missing.trim());
            }
        } else {
            log.info("Running in local/test profile. Admin auth configured (username={}, tokenSecretConfigured={})",
                    StringUtils.hasText(adminUsername) ? adminUsername : "<unset>",
                    StringUtils.hasText(tokenSecret));
        }
    }

    public String getAdminToken() {
        return adminToken;
    }

    public String getAdminUsername() {
        return adminUsername;
    }

    public String getAdminPassword() {
        return adminPassword;
    }

    public String getTokenSecret() {
        return tokenSecret;
    }
}
