-- V2__add_order_ref_to_bank_charges.sql
-- Add order_ref column to track customer/merchant order level duplicate charges

ALTER TABLE bank_charges ADD COLUMN order_ref VARCHAR(255) NULL;
CREATE INDEX idx_bank_charges_order_ref ON bank_charges (order_ref);
