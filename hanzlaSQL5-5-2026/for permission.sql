INSERT INTO role_permissions 
(tenant_id, role_id, category, form_name, sub_permission, allowed, created_at, updated_at)
VALUES
-- Lead (Customer category)
(1, 1, 'Customer', 'Create Lead', 'Add', 1, NOW(), NOW()),
(1, 1, 'Customer', 'Create Lead', 'View', 1, NOW(), NOW()),
(1, 1, 'Customer', 'Create Lead', 'Edit', 1, NOW(), NOW()),
(1, 1, 'Customer', 'Create Lead', 'Delete', 1, NOW(), NOW()),

-- Quotation (Sale category)
(1, 1, 'Sale', 'Create Quotation', 'View', 1, NOW(), NOW()),
(1, 1, 'Sale', 'Create Quotation', 'Add', 1, NOW(), NOW()),
(1, 1, 'Sale', 'Create Quotation', 'Edit', 1, NOW(), NOW()),
(1, 1, 'Sale', 'Create Quotation', 'Delete', 1, NOW(), NOW());