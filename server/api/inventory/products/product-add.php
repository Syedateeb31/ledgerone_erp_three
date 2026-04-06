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
    echo json_encode(['success' => false, 'message' => 'Unauthorized - Please login again']);
    exit;
}

try {
    // Generate sequential product code
    $stmt = $pdo->prepare("SELECT code FROM products WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$tenant_id]);
    $lastProduct = $stmt->fetch();
    
    if ($lastProduct) {
        // Extract number from last code (e.g., PROD-000001 -> 1)
        $lastNumber = (int) substr($lastProduct['code'], -6);
        $newNumber = $lastNumber + 1;
    } else {
        $newNumber = 1;
    }
    
    $code = 'PROD-' . str_pad($newNumber, 6, '0', STR_PAD_LEFT);
    
    // Get form data
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
    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Product name is required']);
        exit;
    }
    
    // Insert product
    $stmt = $pdo->prepare("
        INSERT INTO products (
            tenant_id, company_id, code, name, product_type, uom_type, default_unit_id, uom_group_id, product_conversion_factor, category_id, subcategory_id,
            inventory_account_id, vendor_id, parent_product_id, description, qr_code, barcode, purchase_price, trade_price, wholesale_price, mrp,
            default_discount, trade_offer_discount, default_foc, carton_conversion, sales_tax_type, sales_tax, further_tax,
            min_stock_level, max_stock_level, manufacturing_date, expiry_date, photo, is_active, stock_affects, invoice_affects, created_by
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    ");
    
    $product_conversion_factor = !empty($_POST['productConversionFactor']) ? $_POST['productConversionFactor'] : null;
    $uom_group_id = !empty($_POST['uomGroup']) ? $_POST['uomGroup'] : null;
    $group_conversion_factors = isset($_POST['groupConversionFactor']) ? $_POST['groupConversionFactor'] : [];
    
    $stmt->execute([
        $tenant_id, $company, $code, $name, $product_type, $uom_type, $default_unit, $uom_group_id, $product_conversion_factor, $category, $subcategory,
        $inventory_account, $vendor_id, $parent_product_id, $description, $qr_code, $barcode, $purchase_price, $trade_price, $wholesale_price, $mrp,
        $default_discount, $trade_offer_discount, $default_foc, $carton_conversion, $sales_tax_type, $sales_tax, $further_tax,
        $min_stock, $max_stock, $manufacturing_date, $expiry_date, $photo_filename, $is_active, $stock_affects, $invoice_affects, $user_id
    ]);
    
    $product_id = $pdo->lastInsertId();
    
    // Insert group conversion factors if UOM type is group
    if ($uom_type === 'group' && !empty($group_conversion_factors)) {
        $conversionStmt = $pdo->prepare("
            INSERT INTO product_uom_conversions (product_id, uom_id, conversion_factor)
            VALUES (?, ?, ?)
        ");
        
        foreach ($group_conversion_factors as $uom_id => $factor) {
            if (!empty($factor)) {
                $conversionStmt->execute([$product_id, $uom_id, $factor]);
            }
        }
    }
    
    // Insert stock opening entries
    if (isset($_POST['branch']) && is_array($_POST['branch'])) {
        $stockOpeningStmt = $pdo->prepare("
            INSERT INTO stock_opening (product_id, tenant_id, branch_id, opening_qty, opening_price, unit_id)
            VALUES (?, ?, ?, ?, ?, ?)
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
                $originalQty = 0;
                $unitIdForStock = null;
                
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
                        $unitIdForStock = $baseUnitRow['id'];
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
                            $unitIdForStock = $nonBaseRow['base_unit_id'];
                        }
                    }
                    
                    // UOM Group mode - insert separate entries for each unit
                    $totalQtyInBaseUnits = convertGroupUnitsToBaseUnits($_POST, $i, $product_id, $pdo);
                    $originalQty = $totalQtyInBaseUnits; // For groups, store converted total
                } else {
                    // Default Unit mode - single quantity
                    if (!empty($_POST['openingQty'][$i])) {
                        $originalQty = floatval($_POST['openingQty'][$i]); // Store ORIGINAL qty
                        $totalQtyInBaseUnits = convertSingleUnitToBaseUnits($originalQty, $default_unit, $product_conversion_factor, $pdo);
                    }
                    $unitIdForStock = $default_unit;
                }
                
                if ($totalQtyInBaseUnits > 0) {
                    // Insert into stock_opening with ORIGINAL quantity
                    $stockOpeningStmt->execute([
                        $product_id,
                        $tenant_id,
                        $branchId,
                        $originalQty,  // Store ORIGINAL quantity (e.g., 150 for Grams)
                        $openingPrice,
                        $unitIdForStock  // Store the unit used
                    ]);
                    
                    $stockOpeningId = $pdo->lastInsertId();
                    
                    // Insert into stock_ledger - separate entries for each unit
                    if ($uom_type === 'group' && $uom_group_id) {
                        // Group format - insert separate ledger entries for each unit
                        insertGroupStockLedgerEntries($_POST, $i, $product_id, $stockOpeningId, $branchId, $inventory_account, $tenant_id, $openingPrice, $pdo);
                    } else {
                        // Single entry for default unit - store ORIGINAL qty, not converted
                        $originalQty = !empty($_POST['openingQty'][$i]) ? floatval($_POST['openingQty'][$i]) : 0;
                        $stockLedgerStmt->execute([
                            $tenant_id,
                            $inventory_account,
                            $branchId,
                            $product_id,
                            $stockOpeningId,
                            $originalQty,  // Store original quantity (e.g., 150 Grams)
                            $openingPrice,
                            $default_unit  // Store the actual unit used (e.g., Gram)
                        ]);
                    }
                }
            }
        }
    }
    
    echo json_encode(['success' => true, 'message' => 'Product added successfully', 'product_id' => $product_id]);
    
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
    
    if (!isset($postData['openingQty']) || !is_array($postData['openingQty'])) {
        return 0;
    }
    
    foreach ($postData['openingQty'] as $unit_id => $quantities) {
        if (is_array($quantities) && isset($quantities[$rowIndex]) && !empty($quantities[$rowIndex])) {
            $qty = floatval($quantities[$rowIndex]);
            
            $stmt = $pdo->prepare("SELECT unit_scope, is_base_unit, base_unit_id, conversion_factor FROM uom WHERE id = ?");
            $stmt->execute([$unit_id]);
            $unit = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($unit) {
                if ($unit['is_base_unit'] == 1) {
                    $totalQty += $qty;
                } elseif ($unit['unit_scope'] === 'per_product') {
                    $convStmt = $pdo->prepare("SELECT conversion_factor FROM product_uom_conversions WHERE product_id = ? AND uom_id = ?");
                    $convStmt->execute([$product_id, $unit_id]);
                    $conv = $convStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($conv && !empty($conv['conversion_factor'])) {
                        $totalQty += $qty * $conv['conversion_factor'];
                    } else {
                        $totalQty += $qty;
                    }
                } elseif ($unit['unit_scope'] === 'universal' && !empty($unit['conversion_factor'])) {
                    $totalQty += $qty * $unit['conversion_factor'];
                } else {
                    $totalQty += $qty;
                }
            }
        }
    }
    
    return $totalQty;
}

function insertGroupStockLedgerEntries($postData, $rowIndex, $product_id, $stockOpeningId, $branchId, $inventory_account, $tenant_id, $pricePerBaseUnit, $pdo) {
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