<?php
require_once '../../../../includes/connection.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

session_start();
$tenant_id = $_SESSION['tenant_id'] ?? null;

if (!$tenant_id) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$broken_pct = floatval($_GET['broken_pct'] ?? 0);
$chart_id   = intval($_GET['chart_id'] ?? 1);

try {
    // Fetch all slabs up to broken_pct for this chart
    $stmt = $pdo->prepare("
        SELECT `from`, `to`, `rate`
        FROM broken_allowance_slabs
        WHERE chart_id = ? AND `from` < ?
        ORDER BY `from` ASC
    ");
    $stmt->execute([$chart_id, $broken_pct]);
    $slabs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $cumulative_rate = 0;
    foreach ($slabs as $slab) {
        $from = floatval($slab['from']);
        $to   = floatval($slab['to']);
        $rate = floatval($slab['rate']);

        // Clamp the current (partial) slab to broken_pct so the rate rises
        // progressively within a slab instead of jumping by the full slab width
        // as soon as broken_pct crosses the slab's `from` boundary.
        $gap = min($to, $broken_pct) - $from;
        if ($gap > 0) {
            $cumulative_rate += $gap * $rate;
        }
    }

    echo json_encode([
        'success'          => true,
        'broken_pct'       => $broken_pct,
        'cumulative_rate'  => $cumulative_rate,
        'slabs'            => $slabs
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
