<?php
/**
 * Stock Management Helper Functions
 * Handles stock ledger entries based on invoice type
 */

/**
 * Determine if stock should be affected based on invoice type
 * 
 * @param string $invoiceType The invoice type (Cash, Credit, Booking)
 * @return bool True if stock should be deducted, false otherwise
 */
function shouldAffectStock($invoiceType)
{
    // Only deduct stock for Cash and Credit invoices
    // Booking invoices do NOT affect stock
    $stockAffectingTypes = ['Cash', 'Credit'];
    return in_array($invoiceType, $stockAffectingTypes);
}

/**
 * Insert stock ledger entry for sale invoice item
 * 
 * @param PDO $pdo Database connection
 * @param int $tenant_id Tenant ID
 * @param int $invoice_id Invoice ID
 * @param int $product_id Product ID
 * @param float $quantity Quantity sold
 * @param int $uom_id Unit of Measurement ID
 * @param int $branch_id Branch ID
 * @param string $sale_date Sale date
 * @param string $invoiceType Invoice type (Cash, Credit, Booking)
 * @return bool True if entry was created, false if skipped
 */
function insertStockLedgerEntry($pdo, $tenant_id, $invoice_id, $product_id, $quantity, $uom_id, $branch_id, $sale_date, $invoiceType)
{
    // Skip stock ledger if invoice type doesn't affect stock
    if (!shouldAffectStock($invoiceType)) {
        return false;
    }

    // Get product's inventory account
    $productStmt = $pdo->prepare("SELECT inventory_account_id FROM products WHERE id = ?");
    $productStmt->execute([$product_id]);
    $inventoryAccountId = $productStmt->fetchColumn() ?: 0;
    
    $costPrice = getCostPrice($pdo, $tenant_id, $product_id, $branch_id);
    
    // Insert stock ledger for quantity sold
    $stock_stmt = $pdo->prepare("
        INSERT INTO stock_ledger (
            tenant_id, account_id, branch_id, product_id, reference_table, reference_id,
            qty_out, unit_cost, unit_id, transaction_type, transaction_date
        ) VALUES (?, ?, ?, ?, 'sale_invoice', ?, ?, ?, ?, 'Sale Invoice', ?)
    ");
    $stock_stmt->execute([
        $tenant_id,
        $inventoryAccountId,
        $branch_id,
        $product_id,
        $invoice_id,
        $quantity,
        $costPrice,
        $uom_id,
        $sale_date
    ]);
    
    return true;
}

/**
 * Insert FOC (Free on Cost) stock ledger entry
 * 
 * @param PDO $pdo Database connection
 * @param int $tenant_id Tenant ID
 * @param int $invoice_id Invoice ID
 * @param int $product_id Product ID
 * @param float $focQty FOC quantity
 * @param int $uom_id Unit of Measurement ID
 * @param int $branch_id Branch ID
 * @param string $sale_date Sale date
 * @param string $invoiceType Invoice type (Cash, Credit, Booking)
 * @return bool True if entry was created, false if skipped
 */
function insertFOCStockLedgerEntry($pdo, $tenant_id, $invoice_id, $product_id, $focQty, $uom_id, $branch_id, $sale_date, $invoiceType)
{
    // Skip stock ledger if invoice type doesn't affect stock
    if (!shouldAffectStock($invoiceType)) {
        return false;
    }

    // Get product's inventory account
    $productStmt = $pdo->prepare("SELECT inventory_account_id FROM products WHERE id = ?");
    $productStmt->execute([$product_id]);
    $inventoryAccountId = $productStmt->fetchColumn() ?: 0;
    
    // Determine FOC unit ID
    $focUnitId = $uom_id;
    $unitStmt = $pdo->prepare("SELECT is_base_unit, base_unit_id FROM uom WHERE id = ?");
    $unitStmt->execute([$uom_id]);
    $unitData = $unitStmt->fetch();
    
    if ($unitData) {
        $focUnitId = $unitData['is_base_unit'] == 1 ? $uom_id : ($unitData['base_unit_id'] ?? $uom_id);
    }
    
    // Insert stock ledger for FOC quantity
    $foc_stmt = $pdo->prepare("
        INSERT INTO stock_ledger (
            tenant_id, account_id, branch_id, product_id, reference_table, reference_id,
            qty_out, unit_cost, unit_id, transaction_type, transaction_date
        ) VALUES (?, ?, ?, ?, 'sale_invoice', ?, ?, ?, ?, 'Sale Invoice - FOC', ?)
    ");
    $foc_stmt->execute([
        $tenant_id,
        $inventoryAccountId,
        $branch_id,
        $product_id,
        $invoice_id,
        $focQty,
        0,
        $focUnitId,
        $sale_date
    ]);
    
    return true;
}

/**
 * Delete stock ledger entries for an invoice
 * Used when editing or deleting invoices
 * 
 * @param PDO $pdo Database connection
 * @param int $tenant_id Tenant ID
 * @param int $invoice_id Invoice ID
 * @return void
 */
function deleteInvoiceStockLedger($pdo, $tenant_id, $invoice_id)
{
    $pdo->prepare("DELETE FROM stock_ledger WHERE reference_table = 'sale_invoice' AND reference_id = ? AND tenant_id = ?")
        ->execute([$invoice_id, $tenant_id]);
}

/**
 * Get cost price based on inventory valuation method
 * 
 * @param PDO $pdo Database connection
 * @param int $tenant_id Tenant ID
 * @param int $product_id Product ID
 * @param int $branch_id Branch ID
 * @return float Cost price
 */
function getCostPrice($pdo, $tenant_id, $product_id, $branch_id)
{
    // Get inventory valuation method
    $methodStmt = $pdo->prepare("SELECT inventory_valuation_method FROM companies WHERE tenant_id = ? LIMIT 1");
    $methodStmt->execute([$tenant_id]);
    $method = $methodStmt->fetchColumn() ?: 'FIFO';
    
    $costPrice = 0;
    
    if ($method === 'FIFO') {
        // Get oldest purchase price
        $stmt = $pdo->prepare("
            SELECT unit_cost 
            FROM stock_ledger 
            WHERE tenant_id = ? AND product_id = ? AND branch_id = ? AND qty_in > 0 AND unit_cost > 0
            ORDER BY transaction_date ASC, id ASC 
            LIMIT 1
        ");
        $stmt->execute([$tenant_id, $product_id, $branch_id]);
        $costPrice = $stmt->fetchColumn() ?: 0;
    } elseif ($method === 'LIFO') {
        // Get latest purchase price
        $stmt = $pdo->prepare("
            SELECT unit_cost 
            FROM stock_ledger 
            WHERE tenant_id = ? AND product_id = ? AND branch_id = ? AND qty_in > 0 AND unit_cost > 0
            ORDER BY transaction_date DESC, id DESC 
            LIMIT 1
        ");
        $stmt->execute([$tenant_id, $product_id, $branch_id]);
        $costPrice = $stmt->fetchColumn() ?: 0;
    } elseif ($method === 'AVCO') {
        // Calculate weighted average cost
        $stmt = $pdo->prepare("
            SELECT 
                SUM(qty_in * unit_cost) / NULLIF(SUM(qty_in), 0) as avg_cost
            FROM stock_ledger 
            WHERE tenant_id = ? AND product_id = ? AND branch_id = ? AND qty_in > 0 AND unit_cost > 0
        ");
        $stmt->execute([$tenant_id, $product_id, $branch_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $costPrice = $result['avg_cost'] ?: 0;
    }
    
    // If no cost found from stock ledger, use purchase_price from products table
    if ($costPrice == 0) {
        $stmt = $pdo->prepare("SELECT purchase_price FROM products WHERE id = ?");
        $stmt->execute([$product_id]);
        $costPrice = $stmt->fetchColumn() ?: 0;
    }
    
    return $costPrice;
}
