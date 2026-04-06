<?php
$pdo = new PDO('mysql:host=31.97.123.46:3306;dbname=ledgerone_public', 'ledgerone_admin', 'd5VbDC_Kx!1M8~%O');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$response = file_get_contents('https://v6.exchangerate-api.com/v6/09d1eae8bf8f00d9f9fd4f61/latest/USD');
$data = json_decode($response, true);

if ($data['result'] === 'success') {
    $baseCurrency = $data['base_code'];
    $effectiveDate = date('Y-m-d', $data['time_last_update_unix']);
    
    $validCurrencies = $pdo->query("SELECT code FROM currencies")->fetchAll(PDO::FETCH_COLUMN);
    
    $stmt = $pdo->prepare("INSERT INTO currency_exchange_rates 
        (base_currency_code, target_currency_code, exchange_rate, effective_date, source, is_active) 
        VALUES (?, ?, ?, ?, 'api', 1)
        ON DUPLICATE KEY UPDATE exchange_rate = VALUES(exchange_rate), effective_date = VALUES(effective_date), updated_at = CURRENT_TIMESTAMP");
    
    foreach ($data['conversion_rates'] as $currency => $rate) {
        if (in_array($currency, $validCurrencies)) {
            $pdo->exec("DELETE FROM currency_exchange_rates 
                WHERE base_currency_code = '$baseCurrency' AND target_currency_code = '$currency'");
            $stmt->execute([$baseCurrency, $currency, $rate, $effectiveDate]);
        }
    }
    
    echo "Exchange rates updated successfully\n";
} else {
    echo "API request failed\n";
}
