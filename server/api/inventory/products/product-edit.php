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
    $tax_regime_id = !empty($_POST['taxRegime']) ? $_POST['taxRegime'] : null;
    $hs_code = $_POST['hsCode'] ?? null;
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
                company_id = ?, name = ?, product_type = ?, default_unit_id = ?, category_id = ?, subcategory_id = ?,
                inventory_account_id = ?, vendor_id = ?, parent_product_id = ?, description = ?, qr_code = ?, barcode = ?, purchase_price = ?, 
                trade_price = ?, wholesale_price = ?, mrp = ?, default_discount = ?, trade_offer_discount = ?, default_foc = ?, 
                carton_conversion = ?, tax_regime_id = ?, hs_code = ?, min_stock_level = ?, max_stock_level = ?, 
                manufacturing_date = ?, expiry_date = ?, photo = ?, is_active = ?, stock_affects = ?, invoice_affects = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND tenant_id = ?
        ");
        
        $stmt->execute([
            $company, $name, $product_type, $default_unit, $category, $subcategory,
            $inventory_account, $vendor_id, $parent_product_id, $description, $qr_code, $barcode, $purchase_price,
            $trade_price, $wholesale_price, $mrp, $default_discount, $trade_offer_discount, $default_foc,
            $carton_conversion, $tax_regime_id, $hs_code, $min_stock, $max_stock,
            $manufacturing_date, $expiry_date, $photo_filename, $is_active, $stock_affects, $invoice_affects, $product_id, $tenant_id
        ]);
    } else {
        $stmt = $pdo->prepare("
            UPDATE products SET 
                company_id = ?, name = ?, product_type = ?, default_unit_id = ?, category_id = ?, subcategory_id = ?,
                inventory_account_id = ?, vendor_id = ?, parent_product_id = ?, description = ?, qr_code = ?, barcode = ?, purchase_price = ?, 
                trade_price = ?, wholesale_price = ?, mrp = ?, default_discount = ?, trade_offer_discount = ?, default_foc = ?, 
                carton_conversion = ?, tax_regime_id = ?, hs_code = ?, min_stock_level = ?, max_stock_level = ?, 
                manufacturing_date = ?, expiry_date = ?, is_active = ?, stock_affects = ?, invoice_affects = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND tenant_id = ?
        ");
        
        $stmt->execute([
            $company, $name, $product_type, $default_unit, $category, $subcategory,
            $inventory_account, $vendor_id, $parent_product_id, $description, $qr_code, $barcode, $purchase_price,
            $trade_price, $wholesale_price, $mrp, $default_discount, $trade_offer_discount, $default_foc,
            $carton_conversion, $tax_regime_id, $hs_code, $min_stock, $max_stock,
            $manufacturing_date, $expiry_date, $is_active, $stock_affects, $invoice_affects, $product_id, $tenant_id
        ]);
    }
    
    // Update stock opening entries if provided
    if (isset($_POST['branch']) && is_array($_POST['branch'])) {
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
            if (!empty($_POST['branch'][$i]) && !empty($_POST['openingQty'][$i])) {
                $openingQty = $_POST['openingQty'][$i];
                $openingPrice = $_POST['openingPrice'][$i] ?? 0;
                $branchId = $_POST['branch'][$i];
                
                // Insert into stock_opening
                $stockOpeningStmt->execute([
                    $product_id,
                    $tenant_id,
                    $branchId,
                    $openingQty,
                    $openingPrice
                ]);
                
                $stockOpeningId = $pdo->lastInsertId();
                
                // Insert into stock_ledger
                $stockLedgerStmt->execute([
                    $tenant_id,
                    $inventory_account,
                    $branchId,
                    $product_id,
                    $stockOpeningId,
                    $openingQty,
                    $openingPrice,
                    $default_unit
                ]);
            }
        }
    }
    
    echo json_encode(['success' => true, 'message' => 'Product updated successfully']);
    
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