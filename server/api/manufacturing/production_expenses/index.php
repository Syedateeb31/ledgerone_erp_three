<?php
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../../../../includes/connection.php';

$user_id = $_SESSION['user_id'] ?? 1;
$tenant_id = $_SESSION['tenant_id'] ?? 1;

// GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get_next_number':
            getNextExpenseNumber($pdo, $tenant_id);
            break;
        
        case 'get_expense_accounts':
            getExpenseAccounts($pdo, $tenant_id);
            break;
        
        case 'get_order_total_cost':
            getOrderTotalCost($pdo, $_GET['order_id'], $tenant_id);
            break;
        
        case 'list':
            listExpenses($pdo, $tenant_id);
            break;
        
        case 'view':
            viewExpense($pdo, $_GET['id'], $tenant_id);
            break;
        
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
exit;
}

// POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

try {
    switch ($action) {
        case 'create':
            createExpense($pdo, $data, $user_id, $tenant_id);
            break;
        
        case 'update':
            updateExpense($pdo, $data, $tenant_id);
            break;
        
        case 'delete':
            deleteExpense($pdo, $data['id'], $tenant_id);
            break;
        
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
exit;
}

function getNextExpenseNumber($pdo, $tenant_id) {
    $stmt = $pdo->prepare("SELECT expense_number FROM production_expenses WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$tenant_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        $last_number = intval(substr($result['expense_number'], 3));
        $new_number = $last_number + 1;
    } else {
        $new_number = 1;
    }
    $expense_number = 'PE-' . str_pad($new_number, 4, '0', STR_PAD_LEFT);
    
    echo json_encode(['success' => true, 'expense_number' => $expense_number]);
}

function getExpenseAccounts($pdo, $tenant_id) {
    $stmt = $pdo->prepare("
        SELECT a.id, a.name, s.name as sub_account_name 
        FROM accounts a
        LEFT JOIN sub_accounts s ON a.sub_account_id = s.id
        WHERE a.sub_account_id IN (114, 115, 116)
        ORDER BY a.name
    ");
    $stmt->execute();
    $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $accounts]);
}

function getOrderTotalCost($pdo, $order_id, $tenant_id) {
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(total_cost), 0) as total_cost
        FROM production_completions
        WHERE production_order_id = ? AND tenant_id = ?
    ");
    $stmt->execute([$order_id, $tenant_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'total_cost' => number_format($result['total_cost'], 2)]);
}

function createExpense($pdo, $data, $user_id, $tenant_id) {
    $pdo->beginTransaction();
    
    try {
        $production_order_id = $data['production_order_id'];
        $production_order_total_cost = floatval(str_replace(',', '', $data['production_order_total_cost'] ?? 0));
        $expense_type = $data['expense_type'] ?? 'Direct';
        $reference_table = !empty($data['reference_table']) ? $data['reference_table'] : null;
        $reference_id = !empty($data['reference_id']) ? $data['reference_id'] : null;
        $notes = !empty($data['notes']) ? $data['notes'] : null;
        $expense_items = $data['expense_items'];
        
        // Calculate total amount
        $total_amount = 0;
        foreach ($expense_items as $item) {
            $total_amount += $item['amount'];
        }
        
        // Generate expense number
        $stmt = $pdo->prepare("SELECT expense_number FROM production_expenses WHERE tenant_id = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$tenant_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            $last_number = intval(substr($result['expense_number'], 3));
            $new_number = $last_number + 1;
        } else {
            $new_number = 1;
        }
        $expense_number = 'PE-' . str_pad($new_number, 4, '0', STR_PAD_LEFT);
        
        // Insert production expense header
        $stmt = $pdo->prepare("
            INSERT INTO production_expenses 
            (tenant_id, expense_number, production_order_id, production_order_total_cost, expense_type, total_amount, reference_table, reference_id, notes, created_by, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $tenant_id,
            $expense_number, 
            $production_order_id,
            $production_order_total_cost,
            $expense_type,
            $total_amount, 
            $reference_table, 
            $reference_id, 
            $notes, 
            $user_id
        ]);
        
        $expense_id = $pdo->lastInsertId();
        
        // Insert expense account items
        foreach ($expense_items as $item) {
            $stmt = $pdo->prepare("
                INSERT INTO production_expense_accounts 
                (production_expense_id, expense_account_id, amount) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([
                $expense_id,
                $item['expense_account_id'], 
                $item['amount']
            ]);
        }
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Expense created successfully', 'id' => $expense_id]);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
}

function listExpenses($pdo, $tenant_id) {
    $stmt = $pdo->prepare("
        SELECT pe.*, 
        po.order_no, 
        p.name as product_name,
        GROUP_CONCAT(a.name SEPARATOR ', ') as expense_account_name
        FROM production_expenses pe
        JOIN production_orders po ON pe.production_order_id = po.id
        JOIN products p ON po.product_id = p.id
        JOIN production_expense_accounts pea ON pe.id = pea.production_expense_id
        JOIN accounts a ON pea.expense_account_id = a.id
        WHERE pe.tenant_id = ?
        GROUP BY pe.id
        ORDER BY pe.id DESC
    ");
    $stmt->execute([$tenant_id]);
    $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $expenses]);
}

function viewExpense($pdo, $id, $tenant_id) {
    // Get expense header
    $stmt = $pdo->prepare("
        SELECT pe.*, 
        po.order_no, 
        p.name as product_name
        FROM production_expenses pe
        JOIN production_orders po ON pe.production_order_id = po.id
        JOIN products p ON po.product_id = p.id
        WHERE pe.id = ? AND pe.tenant_id = ?
    ");
    $stmt->execute([$id, $tenant_id]);
    $expense = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($expense) {
        // Get expense accounts
        $stmt = $pdo->prepare("
            SELECT pea.*, a.name as expense_account_name
            FROM production_expense_accounts pea
            JOIN accounts a ON pea.expense_account_id = a.id
            WHERE pea.production_expense_id = ?
        ");
        $stmt->execute([$id]);
        $expense['accounts'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $expense]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Expense not found']);
    }
}

function updateExpense($pdo, $data, $tenant_id) {
    $pdo->beginTransaction();
    
    try {
        $id = $data['id'];
        $production_order_id = $data['production_order_id'];
        $production_order_total_cost = floatval(str_replace(',', '', $data['production_order_total_cost'] ?? 0));
        $expense_type = $data['expense_type'] ?? 'Direct';
        $reference_table = !empty($data['reference_table']) ? $data['reference_table'] : null;
        $reference_id = !empty($data['reference_id']) ? $data['reference_id'] : null;
        $notes = !empty($data['notes']) ? $data['notes'] : null;
        $expense_items = $data['expense_items'];
        
        // Calculate total amount
        $total_amount = 0;
        foreach ($expense_items as $item) {
            $total_amount += $item['amount'];
        }
        
        // Update production expense header
        $stmt = $pdo->prepare("
            UPDATE production_expenses 
            SET production_order_id = ?,
                production_order_total_cost = ?,
                expense_type = ?, 
                total_amount = ?,
                reference_table = ?, 
                reference_id = ?, 
                notes = ?
            WHERE id = ? AND tenant_id = ?
        ");
        $stmt->execute([
            $production_order_id,
            $production_order_total_cost,
            $expense_type,
            $total_amount,
            $reference_table,
            $reference_id,
            $notes,
            $id,
            $tenant_id
        ]);
        
        // Delete old expense accounts
        $stmt = $pdo->prepare("DELETE FROM production_expense_accounts WHERE production_expense_id = ?");
        $stmt->execute([$id]);
        
        // Insert new expense accounts
        foreach ($expense_items as $item) {
            $stmt = $pdo->prepare("
                INSERT INTO production_expense_accounts 
                (production_expense_id, expense_account_id, amount) 
                VALUES (?, ?, ?)
            ");
            $stmt->execute([
                $id,
                $item['expense_account_id'], 
                $item['amount']
            ]);
        }
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Expense updated successfully']);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
}

function deleteExpense($pdo, $id, $tenant_id) {
    $pdo->beginTransaction();
    
    try {
        // Delete expense accounts first
        $stmt = $pdo->prepare("DELETE FROM production_expense_accounts WHERE production_expense_id = ?");
        $stmt->execute([$id]);
        
        // Delete expense header
        $stmt = $pdo->prepare("DELETE FROM production_expenses WHERE id = ? AND tenant_id = ?");
        $stmt->execute([$id, $tenant_id]);
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Expense deleted successfully']);
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
}
?>
