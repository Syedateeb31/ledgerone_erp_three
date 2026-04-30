-- Add invoice-level tax rates for Standard GST Regime (ID: 1)
-- For registered companies with is_filer=1
INSERT INTO tax_rates (tax_regime_id, rate_percentage, transaction_type, party_type, is_filer, is_active, effective_from, effective_to, created_at)
VALUES (1, 18.00, 'purchase', 'registered_company', 1, 1, NOW(), NULL, NOW())
ON DUPLICATE KEY UPDATE rate_percentage = 18.00;

-- For registered companies with is_filer=0
INSERT INTO tax_rates (tax_regime_id, rate_percentage, transaction_type, party_type, is_filer, is_active, effective_from, effective_to, created_at)
VALUES (1, 18.00, 'purchase', 'registered_company', 0, 1, NOW(), NULL, NOW())
ON DUPLICATE KEY UPDATE rate_percentage = 18.00;

-- For unregistered suppliers
INSERT INTO tax_rates (tax_regime_id, rate_percentage, transaction_type, party_type, is_filer, is_active, effective_from, effective_to, created_at)
VALUES (1, 18.00, 'purchase', 'unregistered', 0, 1, NOW(), NULL, NOW())
ON DUPLICATE KEY UPDATE rate_percentage = 18.00;

-- Add invoice-level tax rates for Third Schedule MRP Regime (ID: 2)
-- For registered companies with is_filer=1
INSERT INTO tax_rates (tax_regime_id, rate_percentage, transaction_type, party_type, is_filer, is_active, effective_from, effective_to, created_at)
VALUES (2, 17.00, 'purchase', 'registered_company', 1, 1, NOW(), NULL, NOW())
ON DUPLICATE KEY UPDATE rate_percentage = 17.00;

-- For registered companies with is_filer=0
INSERT INTO tax_rates (tax_regime_id, rate_percentage, transaction_type, party_type, is_filer, is_active, effective_from, effective_to, created_at)
VALUES (2, 17.00, 'purchase', 'registered_company', 0, 1, NOW(), NULL, NOW())
ON DUPLICATE KEY UPDATE rate_percentage = 17.00;

-- For unregistered suppliers
INSERT INTO tax_rates (tax_regime_id, rate_percentage, transaction_type, party_type, is_filer, is_active, effective_from, effective_to, created_at)
VALUES (2, 17.00, 'purchase', 'unregistered', 0, 1, NOW(), NULL, NOW())
ON DUPLICATE KEY UPDATE rate_percentage = 17.00;
