<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

session_start();
$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $product_id = $_POST['id'] ?? '';
    $name = $_POST['name'] ?? '';
    $product_type = $_POST['productType'] ?? 'physical';
    $uom_type = $_POST['uomType'] ?? 'unit';
    $company = !empty($_POST['company']) ? $_POST['company'] : null;
    $default_unit = !empty($_POST['defaultUnit']) ? $_POST['defaultUnit'] : null;
    $category = !empty($_POST['category']) ? $_POST['category'] : null;
    $subcategory = !empty($_POST['subcategory']) ? $_POST['subcategory'] : null;
    $inventory_account = !empty($_POST['inventoryAccount']) ? $_POST['inventoryAccount'] : null;
    $vendor_id = !empty($_POST['vendor']) ? $_POST['vendor'] : null;
    $parent_product_id = !empty($_POST['parentProduct']) ? $_POST['parentProduct'] : null;

    $description = $_POST['description'] ?? null;
    $qr_code = !empty($_POST['qrCode']) ? $_POST['qrCode'] : null;
    $barcode = !empty($_POST['barcode']) ? $_POST['barcode'] : null;
    $purchase_price = !empty($_POST['purchasePrice']) ? $_POST['purchasePrice'] : 0;
    $trade_price = !empty($_POST['tradePrice']) ? $_POST['tradePrice'] : 0;
    $wholesale_price = !empty($_POST['wholesalePrice']) ? $_POST['wholesalePrice'] : 0;
    $mrp = !empty($_POST['mrp']) ? $_POST['mrp'] : 0;
    $default_discount = !empty($_POST['defaultDiscount']) ? $_POST['defaultDiscount'] : 0;
    $trade_offer_discount = !empty($_POST['tradeOfferDiscount']) ? $_POST['tradeOfferDiscount'] : 0;
    $default_foc = !empty($_POST['defaultFoc']) ? $_POST['defaultFoc'] : 0;
    $carton_conversion = !empty($_POST['cartonConversion']) ? $_POST['cartonConversion'] : 0;
    $sales_tax_type = $_POST['salesTaxType'] ?? null;
    $sales_tax = !empty($_POST['salesTax']) ? $_POST['salesTax'] : 0;
    $further_tax = !empty($_POST['furtherTax']) ? $_POST['furtherTax'] : 0;
    $min_stock = !empty($_POST['minStock']) ? $_POST['minStock'] : 0;
    $max_stock = !empty($_POST['maxStock']) ? $_POST['maxStock'] : 0;
    $manufacturing_date = !empty($_POST['manufacturingDate']) ? $_POST['manufacturingDate'] : null;
    $expiry_date = !empty($_POST['expiryDate']) ? $_POST['expiryDate'] : null;
    $is_active = isset($_POST['active']) ? 1 : 0;
    $stock_affects = isset($_POST['stockAffects']) ? 1 : 0;
    $invoice_affects = isset($_POST['invoiceAffects']) ? 1 : 0;
    $product_conversion_factor = !empty($_POST['productConversionFactor']) ? $_POST['productConversionFactor'] : null;
    $uom_group_id = !empty($_POST['uomGroup']) ? $_POST['uomGroup'] : null;
    $group_conversion_factors = isset($_POST['groupConversionFactor']) ? $_POST['groupConversionFactor'] : [];
    
    // Handle photo upload
    $photo_filename = null;
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $photo_result = handlePhotoUpload($_FILES['photo']);
        if ($photo_result['success']) {
            $photo_filename = $photo_result['filename'];
        } else {
            echo json_encode(['success' => false, 'message' => $photo_result['message']]);
            exit;
        }
    }
    
    // Validate required fields
    if (empty($product_id) || empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Product ID and name are required']);
        exit;
    }
    
    // Verify product belongs to tenant
    $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ? AND tenant_id = ?");
    $stmt->execute([$product_id, $tenant_id]);
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Product not found']);
        exit;
    }
    
    // Update product
    if ($photo_filename) {
        $stmt = $pdo->prepare("
            UPDATE products SET 
                company_id = ?, name = ?, product_type = ?, uom_type = ?, default_unit_id = ?, uom_group_id = ?, product_conversion_factor = ?, category_id = ?, subcategory_id = ?,
                inventory_account_id = ?, vendor_id = ?, parent_product_id = ?, description = ?, qr_code = ?, barcode = ?, purchase_price = ?, 
                trade_price = ?, wholesale_price = ?, mrp = ?, default_discount = ?, trade_offer_discount = ?, default_foc = ?, 
                carton_conversion = ?, sales_tax_type = ?, sales_tax = ?, further_tax = ?, min_stock_level = ?, max_stock_level = ?, 
                manufacturing_date = ?, expiry_date = ?, photo = ?, is_active = ?, stock_affects = ?, invoice_affects = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND tenant_id = ?
        ");
        
        $stmt->execute([
            $company, $name, $product_type, $uom_type, $default_unit, $uom_group_id, $product_conversion_factor, $category, $subcategory,
            $inventory_account, $vendor_id, $parent_product_id, $description, $qr_code, $barcode, $purchase_price,
            $trade_price, $wholesale_price, $mrp, $default_discount, $trade_offer_discount, $default_foc,
            $carton_conversion, $sales_tax_type, $sales_tax, $further_tax, $min_stock, $max_stock,
            $manufacturing_date, $expiry_date, $photo_filename, $is_active, $stock_affects, $invoice_affects, $product_id, $tenant_id
        ]);
    } else {
        $stmt = $pdo->prepare("
            UPDATE products SET 
                company_id = ?, name = ?, product_type = ?, uom_type = ?, default_unit_id = ?, uom_group_id = ?, product_conversion_factor = ?, category_id = ?, subcategory_id = ?,
                inventory_account_id = ?, vendor_id = ?, parent_product_id = ?, description = ?, qr_code = ?, barcode = ?, purchase_price = ?, 
                trade_price = ?, wholesale_price = ?, mrp = ?, default_discount = ?, trade_offer_discount = ?, default_foc = ?, 
                carton_conversion = ?, sales_tax_type = ?, sales_tax = ?, further_tax = ?, min_stock_level = ?, max_stock_level = ?, 
                manufacturing_date = ?, expiry_date = ?, is_active = ?, stock_affects = ?, invoice_affects = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND tenant_id = ?
        ");
        
        $stmt->execute([
            $company, $name, $product_type, $uom_type, $default_unit, $uom_group_id, $product_conversion_factor, $category, $subcategory,
            $inventory_account, $vendor_id, $parent_product_id, $description, $qr_code, $barcode, $purchase_price,
            $trade_price, $wholesale_price, $mrp, $default_discount, $trade_offer_discount, $default_foc,
            $carton_conversion, $sales_tax_type, $sales_tax, $further_tax, $min_stock, $max_stock,
            $manufacturing_date, $expiry_date, $is_active, $stock_affects, $invoice_affects, $product_id, $tenant_id
        ]);
    }
    
    // Update group conversion factors BEFORE processing stock
    $pdo->prepare("DELETE FROM product_uom_conversions WHERE product_id = ?")->execute([$product_id]);
    
    if ($uom_type === 'group' && !empty($group_conversion_factors)) {
        $conversionStmt = $pdo->prepare("
            INSERT INTO product_uom_conversions (product_id, uom_id, conversion_factor)
            VALUES (?, ?, ?)
        ");
        
        foreach ($group_conversion_factors as $uom_id => $factor) {
            if (!empty($factor)) {
                $conversionStmt->execute([$product_id, $uom_id, $factor]);
                error_log("Saved conversion: UOM=$uom_id, Factor=$factor");
            }
        }
    }
    
    // Update stock opening entries if provided
    $debugInfo = [];
    $debugInfo['branch_isset'] = isset($_POST['branch']);
    $debugInfo['branch_is_array'] = isset($_POST['branch']) && is_array($_POST['branch']);
    $debugInfo['branch_count'] = isset($_POST['branch']) ? count($_POST['branch']) : 0;
    $debugInfo['uom_type'] = $uom_type;
    $debugInfo['uom_group_id'] = $uom_group_id;
    $debugInfo['default_unit'] = $default_unit;
    
    // Check for openingQty data
    foreach ($_POST as $key => $value) {
        if (strpos($key, 'openingQty') === 0) {
            $debugInfo['qty_keys'][] = $key . ' => ' . (is_array($value) ? 'array[' . count($value) . ']' : $value);
        }
    }
    
    if (isset($_POST['branch']) && is_array($_POST['branch'])) {
        $debugInfo['stock_processing'] = 'YES';
        error_log("CONDITION MET: Proceeding with stock update");
        error_log("Branch array: " . print_r($_POST['branch'], true));
        
        // Log openingQty structure
        if (isset($_POST['openingQty'])) {
            error_log("openingQty structure: " . print_r($_POST['openingQty'], true));
        }
        
        // Log openingPrice structure  
        if (isset($_POST['openingPrice'])) {
            error_log("openingPrice structure: " . print_r($_POST['openingPrice'], true));
        }
        
        // Delete existing stock opening and ledger entries
        $pdo->prepare("DELETE FROM stock_opening WHERE product_id = ? AND tenant_id = ?")->execute([$product_id, $tenant_id]);
        $pdo->prepare("DELETE FROM stock_ledger WHERE product_id = ? AND tenant_id = ? AND transaction_type = 'Opening Stock'")->execute([$product_id, $tenant_id]);
        
        // Insert new stock opening entries
        $stockOpeningStmt = $pdo->prepare("
            INSERT INTO stock_opening (product_id, tenant_id, branch_id, opening_qty, opening_price)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $stockLedgerStmt = $pdo->prepare("
            INSERT INTO stock_ledger (tenant_id, account_id, branch_id, product_id, reference_table, reference_id, qty_in, unit_cost, unit_id, transaction_type, transaction_date)
            VALUES (?, ?, ?, ?, 'products', ?, ?, ?, ?, 'Opening Stock', CURDATE())
        ");
        
        for ($i = 0; $i < count($_POST['branch']); $i++) {
            if (!empty($_POST['branch'][$i])) {
                $branchId = $_POST['branch'][$i];
                $openingPrice = $_POST['openingPrice'][$i] ?? 0;
                
                // Calculate total quantity in base units for stock_opening
                $totalQtyInBaseUnits = 0;
                $unitIdForLedger = null;
                
                if ($uom_type === 'group' && $uom_group_id) {
                    // Get base unit
                    $baseUnitStmt = $pdo->prepare("
                        SELECT u.id
                        FROM uom u
                        INNER JOIN uom_group_units ugu ON u.id = ugu.uom_id
                        WHERE ugu.uom_group_id = ? AND u.is_base_unit = 1
                        LIMIT 1
                    ");
                    $baseUnitStmt->execute([$uom_group_id]);
                    $baseUnitRow = $baseUnitStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($baseUnitRow) {
                        $unitIdForLedger = $baseUnitRow['id'];
                    } else {
                        $nonBaseStmt = $pdo->prepare("
                            SELECT u.base_unit_id
                            FROM uom u
                            INNER JOIN uom_group_units ugu ON u.id = ugu.uom_id
                            WHERE ugu.uom_group_id = ? AND u.is_base_unit = 0 AND u.base_unit_id IS NOT NULL
                            LIMIT 1
                        ");
                        $nonBaseStmt->execute([$uom_group_id]);
                        $nonBaseRow = $nonBaseStmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($nonBaseRow && $nonBaseRow['base_unit_id']) {
                            $unitIdForLedger = $nonBaseRow['base_unit_id'];
                        }
                    }
                    
                    // Check if we have group format data (openingQty[unit_id][]) or single format (openingQty[])
                    if (isset($_POST['openingQty']) && is_array($_POST['openingQty']) && !isset($_POST['openingQty'][$i])) {
                        // Group format - insert separate entries for each unit
                        error_log("Using GROUP format for row $i");
                        $totalQtyInBaseUnits = convertGroupUnitsToBaseUnits($_POST, $i, $product_id, $pdo);
                    } else {
                        // Single format (read-only existing stock) - already in base units
                        error_log("Using SINGLE format for row $i");
                        if (!empty($_POST['openingQty'][$i])) {
                            $totalQtyInBaseUnits = floatval($_POST['openingQty'][$i]);
                            error_log("Single format qty: $totalQtyInBaseUnits");
                        }
                    }
                } else {
                    // Default Unit mode - single quantity
                    if (!empty($_POST['openingQty'][$i])) {
                        $qty = $_POST['openingQty'][$i];
                        $totalQtyInBaseUnits = convertSingleUnitToBaseUnits($qty, $default_unit, $product_conversion_factor, $pdo);
                    }
                    $unitIdForLedger = $default_unit;
                }
                
                if ($totalQtyInBaseUnits > 0) {
                    error_log("INSERTING: Branch=$branchId, Qty=$totalQtyInBaseUnits, Price=$openingPrice");
                    // Insert into stock_opening
                    $stockOpeningStmt->execute([
                        $product_id,
                        $tenant_id,
                        $branchId,
                        $totalQtyInBaseUnits,
                        $openingPrice
                    ]);
                    
                    $stockOpeningId = $pdo->lastInsertId();
                    error_log("Stock Opening ID: $stockOpeningId");
                    
                    // Insert into stock_ledger - separate entries for each unit
                    if ($uom_type === 'group' && $uom_group_id && isset($_POST['openingQty']) && is_array($_POST['openingQty']) && !isset($_POST['openingQty'][$i])) {
                        // Group format - insert separate ledger entries for each unit
                        insertGroupStockLedgerEntries($_POST, $i, $product_id, $stockOpeningId, $branchId, $inventory_account, $tenant_id, $openingPrice, $pdo);
                    } else {
                        // Single entry for default unit or read-only mode
                        $stockLedgerStmt->execute([
                            $tenant_id,
                            $inventory_account,
                            $branchId,
                            $product_id,
                            $stockOpeningId,
                            $totalQtyInBaseUnits,
                            $openingPrice,
                            $unitIdForLedger
                        ]);
                        error_log("Stock Ledger inserted successfully");
                    }
                } else {
                    error_log("SKIPPED: Branch=$branchId, Qty=$totalQtyInBaseUnits (qty is 0 or negative)");
                }
            }
        }
    } else {
        error_log("CONDITION NOT MET: Stock update skipped - branch data not provided or not array");
    }
    
    echo json_encode(['success' => true, 'message' => 'Product updated successfully', 'debug' => $debugInfo]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

function handlePhotoUpload($file) {
    $allowed_types = ['png', 'jpg', 'jpeg', 'gif', 'pdf', 'webp', 'avif'];
    $max_size = 5 * 1024 * 1024; // 5MB
    
    if ($file['size'] > $max_size) {
        return ['success' => false, 'message' => 'File size exceeds 5MB limit'];
    }
    
    $file_ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($file_ext, $allowed_types)) {
        return ['success' => false, 'message' => 'Invalid file type'];
    }
    
    $upload_dir = '../../../../client/assets/uploads/products/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }
    
    $filename = uniqid() . '_' . time();
    
    if ($file_ext !== 'webp' && $file_ext !== 'pdf') {
        $webp_filename = $filename . '.webp';
        $webp_path = $upload_dir . $webp_filename;
        
        if (convertToWebP($file['tmp_name'], $webp_path, $file_ext)) {
            return ['success' => true, 'filename' => $webp_filename];
        } else {
            return ['success' => false, 'message' => 'Failed to process image'];
        }
    } else {
        $final_filename = $filename . '.' . $file_ext;
        $final_path = $upload_dir . $final_filename;
        
        if (move_uploaded_file($file['tmp_name'], $final_path)) {
            return ['success' => true, 'filename' => $final_filename];
        } else {
            return ['success' => false, 'message' => 'Failed to upload file'];
        }
    }
}

function convertToWebP($source_path, $destination_path, $source_ext) {
    $image = null;
    
    switch ($source_ext) {
        case 'jpg':
        case 'jpeg':
            $image = imagecreatefromjpeg($source_path);
            break;
        case 'png':
            $image = imagecreatefrompng($source_path);
            break;
        case 'gif':
            $image = imagecreatefromgif($source_path);
            break;
        case 'avif':
            if (function_exists('imagecreatefromavif')) {
                $image = imagecreatefromavif($source_path);
            }
            break;
    }
    
    if ($image) {
        $result = imagewebp($image, $destination_path, 80);
        imagedestroy($image);
        return $result;
    }
    
    return false;
}

function convertSingleUnitToBaseUnits($qty, $unit_id, $product_conversion_factor, $pdo) {
    if (empty($unit_id)) return $qty;
    
    // Get unit info
    $stmt = $pdo->prepare("SELECT unit_scope, is_base_unit, base_unit_id, conversion_factor FROM uom WHERE id = ?");
    $stmt->execute([$unit_id]);
    $unit = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$unit) return $qty;
    
    // If already base unit, return as is
    if ($unit['is_base_unit'] == 1) {
        return $qty;
    }
    
    // Convert based on unit_scope
    if ($unit['unit_scope'] === 'per_product' && !empty($product_conversion_factor)) {
        // Use product-specific conversion factor
        return $qty * $product_conversion_factor;
    } elseif ($unit['unit_scope'] === 'universal' && !empty($unit['conversion_factor'])) {
        // Use universal conversion factor
        return $qty * $unit['conversion_factor'];
    }
    
    return $qty;
}

function convertGroupUnitsToBaseUnits($postData, $rowIndex, $product_id, $pdo) {
    $totalQty = 0;
    error_log("Converting group units for row $rowIndex, product $product_id");
    
    if (!isset($postData['openingQty']) || !is_array($postData['openingQty'])) {
        error_log("openingQty not found or not an array");
        return 0;
    }
    
    error_log("openingQty structure: " . print_r($postData['openingQty'], true));
    
    foreach ($postData['openingQty'] as $unit_id => $quantities) {
        error_log("Processing unit_id: $unit_id, quantities: " . print_r($quantities, true));
        
        if (is_array($quantities) && isset($quantities[$rowIndex]) && !empty($quantities[$rowIndex])) {
            $qty = floatval($quantities[$rowIndex]);
            error_log("Found qty for unit $unit_id: $qty");
            
            $stmt = $pdo->prepare("SELECT unit_scope, is_base_unit, base_unit_id, conversion_factor FROM uom WHERE id = ?");
            $stmt->execute([$unit_id]);
            $unit = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($unit) {
                if ($unit['is_base_unit'] == 1) {
                    error_log("Unit $unit_id is base unit, adding $qty directly");
                    $totalQty += $qty;
                } elseif ($unit['unit_scope'] === 'per_product') {
                    $convStmt = $pdo->prepare("SELECT conversion_factor FROM product_uom_conversions WHERE product_id = ? AND uom_id = ?");
                    $convStmt->execute([$product_id, $unit_id]);
                    $conv = $convStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($conv && !empty($conv['conversion_factor'])) {
                        $converted = $qty * $conv['conversion_factor'];
                        error_log("Unit $unit_id per_product: $qty * {$conv['conversion_factor']} = $converted");
                        $totalQty += $converted;
                    } else {
                        error_log("Unit $unit_id per_product but no conversion found");
                        $totalQty += $qty;
                    }
                } elseif ($unit['unit_scope'] === 'universal' && !empty($unit['conversion_factor'])) {
                    $converted = $qty * $unit['conversion_factor'];
                    error_log("Unit $unit_id universal: $qty * {$unit['conversion_factor']} = $converted");
                    $totalQty += $converted;
                } else {
                    $totalQty += $qty;
                }
            }
        }
    }
    
    error_log("Total qty in base units: $totalQty");
    return $totalQty;
}

function insertGroupStockLedgerEntries($postData, $rowIndex, $product_id, $stockOpeningId, $branchId, $inventory_account, $tenant_id, $pricePerBaseUnit, $pdo) {
    error_log("Inserting separate stock ledger entries for row $rowIndex");
    
    $stockLedgerStmt = $pdo->prepare("
        INSERT INTO stock_ledger (tenant_id, account_id, branch_id, product_id, reference_table, reference_id, qty_in, unit_cost, unit_id, transaction_type, transaction_date)
        VALUES (?, ?, ?, ?, 'products', ?, ?, ?, ?, 'Opening Stock', CURDATE())
    ");
    
    foreach ($postData['openingQty'] as $unit_id => $quantities) {
        if (is_array($quantities) && isset($quantities[$rowIndex]) && !empty($quantities[$rowIndex])) {
            $qty = floatval($quantities[$rowIndex]);
            
            // Get conversion factor
            $conversionFactor = getConversionFactor($unit_id, $product_id, $pdo);
            
            // Calculate value: qty * conversion_factor * price_per_base_unit
            $qtyInBaseUnits = $qty * $conversionFactor;
            $value = $qtyInBaseUnits * $pricePerBaseUnit;
            
            error_log("Inserting ledger: Unit=$unit_id, Qty=$qty, ConvFactor=$conversionFactor, BaseQty=$qtyInBaseUnits, Price=$pricePerBaseUnit, Value=$value");
            
            $stockLedgerStmt->execute([
                $tenant_id,
                $inventory_account,
                $branchId,
                $product_id,
                $stockOpeningId,
                $qty,  // Store original quantity
                $pricePerBaseUnit,  // Store price per base unit
                $unit_id  // Store the actual unit used
            ]);
        }
    }
    
    error_log("All stock ledger entries inserted successfully");
}

function getConversionFactor($unit_id, $product_id, $pdo) {
    // Get unit info
    $stmt = $pdo->prepare("SELECT unit_scope, is_base_unit, conversion_factor FROM uom WHERE id = ?");
    $stmt->execute([$unit_id]);
    $unit = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$unit) return 1;
    
    // Base unit has conversion factor of 1
    if ($unit['is_base_unit'] == 1) {
        return 1;
    }
    
    // Per-product unit: get from product_uom_conversions
    if ($unit['unit_scope'] === 'per_product') {
        $convStmt = $pdo->prepare("SELECT conversion_factor FROM product_uom_conversions WHERE product_id = ? AND uom_id = ?");
        $convStmt->execute([$product_id, $unit_id]);
        $conv = $convStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($conv && !empty($conv['conversion_factor'])) {
            return floatval($conv['conversion_factor']);
        }
    }
    
    // Universal unit: use conversion_factor from uom table
    if ($unit['unit_scope'] === 'universal' && !empty($unit['conversion_factor'])) {
        return floatval($unit['conversion_factor']);
    }
    
    return 1;
}