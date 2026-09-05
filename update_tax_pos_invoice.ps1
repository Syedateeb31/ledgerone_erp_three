# Update all references from pos_invoice to tax_pos_invoice

$basePath = "c:\xampp\htdocs\ledgerone_erp_two"

# Update PHP files in client/pages
$phpFiles = @(
    "$basePath\client\pages\sale\tax_pos_invoice\tax-pos-add.php",
    "$basePath\client\pages\sale\tax_pos_invoice\tax-pos-add-new.php",
    "$basePath\client\pages\sale\tax_pos_invoice\tax-pos-list.php",
    "$basePath\client\pages\sale\tax_pos_invoice\tax-counter-invoice.php",
    "$basePath\client\pages\sale\tax_pos_invoice\tax-invoice-print.php",
    "$basePath\client\pages\sale\tax_pos_invoice\tax-thermal-print.php",
    "$basePath\client\pages\sale\tax_pos_invoice\tax-bulk-print.php",
    "$basePath\client\pages\sale\tax_pos_invoice\tax-verify-invoice.php"
)

foreach ($file in $phpFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Replace path references
        $content = $content -replace 'pos_invoice', 'tax_pos_invoice'
        $content = $content -replace 'pos-add\.css', 'tax-pos-add.css'
        $content = $content -replace 'pos-list\.css', 'tax-pos-list.css'
        $content = $content -replace 'pos-add\.js', 'tax-pos-add.js'
        $content = $content -replace 'pos-list\.js', 'tax-pos-list.js'
        $content = $content -replace 'pos-add-uom\.js', 'tax-pos-add-uom.js'
        $content = $content -replace 'pos-add-scheme\.js', 'tax-pos-add-scheme.js'
        $content = $content -replace 'invoice-level-taxes-dynamic\.js', 'tax-invoice-level-taxes-dynamic.js'
        $content = $content -replace 'pos-tax-calculation\.js', 'tax-pos-tax-calculation.js'
        $content = $content -replace 'withholding-tax\.js', 'tax-withholding-tax.js'
        $content = $content -replace 'stock-validation\.js', 'tax-stock-validation.js'
        $content = $content -replace 'supplier-product-filter\.js', 'tax-supplier-product-filter.js'
        $content = $content -replace 'tax-integration\.js', 'tax-tax-integration.js'
        $content = $content -replace 'vehicle-details\.js', 'tax-vehicle-details.js'
        $content = $content -replace 'invoice-print\.php', 'tax-invoice-print.php'
        $content = $content -replace 'thermal-print\.php', 'tax-thermal-print.php'
        $content = $content -replace 'counter-invoice\.php', 'tax-counter-invoice.php'
        $content = $content -replace 'pos-add\.php', 'tax-pos-add.php'
        $content = $content -replace 'pos-list\.php', 'tax-pos-list.php'
        
        Set-Content $file $content
        Write-Host "Updated: $file"
    }
}

# Update API files
$apiFiles = Get-ChildItem "$basePath\server\api\sale\tax_pos_invoice" -Filter "*.php" -Recurse

foreach ($file in $apiFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace references
    $content = $content -replace 'pos_invoice', 'tax_pos_invoice'
    $content = $content -replace 'pos-add\.php', 'tax-pos-add.php'
    $content = $content -replace 'pos-edit\.php', 'tax-pos-edit.php'
    $content = $content -replace 'pos-delete\.php', 'tax-pos-delete.php'
    $content = $content -replace 'pos-list\.php', 'tax-pos-list.php'
    
    Set-Content $file.FullName $content
    Write-Host "Updated: $($file.FullName)"
}

Write-Host "All files updated successfully!"
