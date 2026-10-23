-- V1__init_bank_tables.sql
-- Mock Bank schema (bank schema)

CREATE TABLE bank_charges (
    id BIGSERIAL PRIMARY KEY,
    payment_ref VARCHAR(255) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_charges_payment_ref ON bank_charges (payment_ref);
CREATE INDEX idx_bank_charges_created_at ON bank_charges (created_at);

CREATE TABLE chaos_config (
    id INT PRIMARY KEY,
    timeout_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    error_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    channel_failure_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    charge_on_timeout_probability DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    latency_ms INT NOT NULL DEFAULT 0
);

INSERT INTO chaos_config (id, timeout_rate, error_rate, channel_failure_rate, charge_on_timeout_probability, latency_ms)
VALUES (1, 0.0, 0.0, 0.0, 0.5, 0);
