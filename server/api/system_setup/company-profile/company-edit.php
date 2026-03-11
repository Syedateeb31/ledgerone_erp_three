<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

session_start();
$user_id = $_SESSION['user_id'] ?? null;
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$user_id || !$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

function convertToWebP($sourcePath, $targetPath) {
    $imageInfo = getimagesize($sourcePath);
    $mimeType = $imageInfo['mime'];
    
    switch ($mimeType) {
        case 'image/jpeg':
            $image = imagecreatefromjpeg($sourcePath);
            break;
        case 'image/png':
            $image = imagecreatefrompng($sourcePath);
            break;
        case 'image/gif':
            $image = imagecreatefromgif($sourcePath);
            break;
        default:
            return false;
    }
    
    if ($image) {
        $result = imagewebp($image, $targetPath, 80);
        imagedestroy($image);
        return $result;
    }
    return false;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get company by ID
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Company ID required']);
            exit;
        }
        
        $stmt = $pdo->prepare("SELECT * FROM companies WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        $company = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$company) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Company not found']);
            exit;
        }
        
        echo json_encode(['success' => true, 'company' => $company]);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'])) {
        // Update company with file upload support
        $id = $_POST['id'] ?? null;
        
        if (!$id || empty($_POST['company_name'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Company ID and name are required']);
            exit;
        }
        
        $logoFileName = null;
        
        // Handle logo upload if provided
        if (isset($_FILES['logo_file']) && $_FILES['logo_file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = '../../../../client/assets/uploads/company_logo/';
            
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            $file = $_FILES['logo_file'];
            $allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf', 'image/webp', 'image/avif'];
            $maxSize = 5 * 1024 * 1024; // 5MB
            
            if (!in_array($file['type'], $allowedTypes)) {
                throw new Exception('Invalid file type');
            }
            
            if ($file['size'] > $maxSize) {
                throw new Exception('File size exceeds 5MB limit');
            }
            
            // Get current logo to delete old file
            $currentStmt = $pdo->prepare("SELECT logo_url FROM companies WHERE id = ? AND tenant_id = ?");
            $currentStmt->execute([$id, $tenant_id]);
            $currentLogo = $currentStmt->fetch();
            
            $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $logoFileName = uniqid('logo_') . '.webp';
            $targetPath = $uploadDir . $logoFileName;
            
            if ($fileExtension === 'webp' || $fileExtension === 'avif' || $fileExtension === 'pdf') {
                $logoFileName = uniqid('logo_') . '.' . $fileExtension;
                $targetPath = $uploadDir . $logoFileName;
                move_uploaded_file($file['tmp_name'], $targetPath);
            } else {
                if (!convertToWebP($file['tmp_name'], $targetPath)) {
                    throw new Exception('Failed to process image');
                }
            }
            
            // Delete old logo file
            if ($currentLogo && $currentLogo['logo_url'] && file_exists($uploadDir . $currentLogo['logo_url'])) {
                unlink($uploadDir . $currentLogo['logo_url']);
            }
        }
        
        // Build SQL based on whether logo is being updated
        if ($logoFileName) {
            $sql = "UPDATE companies SET 
                    company_name = ?, legal_name = ?, email = ?, phone = ?, website = ?,
                    address = ?, country = ?, state = ?, city = ?, zipcode = ?,
                    industry_type = ?, registration_number = ?, tax_identification_number = ?,
                    sales_tax_number = ?, logo_url = ?, language_code = ?, timezone = ?,
                    currency_code = ?, inventory_valuation_method = ?, is_active = ?
                    WHERE id = ? AND tenant_id = ?";
            
            $params = [
                $_POST['company_name'],
                $_POST['legal_name'] ?? null,
                $_POST['email'] ?? null,
                $_POST['phone'] ?? null,
                $_POST['website'] ?? null,
                $_POST['address'] ?? null,
                $_POST['country'] ?? null,
                $_POST['state'] ?? null,
                $_POST['city'] ?? null,
                $_POST['zipcode'] ?? null,
                $_POST['industry_type'] ?? null,
                $_POST['registration_number'] ?? null,
                $_POST['tax_identification_number'] ?? null,
                $_POST['sales_tax_number'] ?? null,
                $logoFileName,
                $_POST['language_code'] ?? 'en',
                $_POST['timezone'] ?? 'UTC',
                $_POST['currency_code'] ?? 'USD',
                $_POST['inventory_valuation_method'] ?? 'FIFO',
                isset($_POST['is_active']) ? ($_POST['is_active'] === 'true' ? 1 : 0) : 1,
                $id,
                $tenant_id
            ];
        } else {
            $sql = "UPDATE companies SET 
                    company_name = ?, legal_name = ?, email = ?, phone = ?, website = ?,
                    address = ?, country = ?, state = ?, city = ?, zipcode = ?,
                    industry_type = ?, registration_number = ?, tax_identification_number = ?,
                    sales_tax_number = ?, language_code = ?, timezone = ?,
                    currency_code = ?, inventory_valuation_method = ?, is_active = ?
                    WHERE id = ? AND tenant_id = ?";
            
            $params = [
                $_POST['company_name'],
                $_POST['legal_name'] ?? null,
                $_POST['email'] ?? null,
                $_POST['phone'] ?? null,
                $_POST['website'] ?? null,
                $_POST['address'] ?? null,
                $_POST['country'] ?? null,
                $_POST['state'] ?? null,
                $_POST['city'] ?? null,
                $_POST['zipcode'] ?? null,
                $_POST['industry_type'] ?? null,
                $_POST['registration_number'] ?? null,
                $_POST['tax_identification_number'] ?? null,
                $_POST['sales_tax_number'] ?? null,
                $_POST['language_code'] ?? 'en',
                $_POST['timezone'] ?? 'UTC',
                $_POST['currency_code'] ?? 'USD',
                $_POST['inventory_valuation_method'] ?? 'FIFO',
                isset($_POST['is_active']) ? ($_POST['is_active'] === 'true' ? 1 : 0) : 1,
                $id,
                $tenant_id
            ];
        }
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($params);
        
        if ($result) {
            echo json_encode(['success' => true, 'message' => 'Company updated successfully']);
        } else {
            throw new Exception('Failed to update company');
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    // Clean up uploaded file if update fails
    if (isset($logoFileName) && $logoFileName && file_exists($uploadDir . $logoFileName)) {
        unlink($uploadDir . $logoFileName);
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>