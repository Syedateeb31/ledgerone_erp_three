-- Superseded: the "Linked Supplier/Customer" feature (customer-add/edit,
-- supplier-add/edit) now uses the same customers.linked_supplier_id /
-- suppliers.linked_customer_id / is_both columns as the ported
-- "Customer + Supplier (Both)" feature, instead of this separate junction
-- table, so both features recognize the same links.
-- Only run this AFTER add_customer_supplier_links.sql has been applied
-- (i.e. only on environments where that migration was run).
DROP TABLE IF EXISTS `customer_supplier_links`;
