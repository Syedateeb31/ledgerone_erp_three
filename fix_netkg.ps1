$f = 'c:\xampp\htdocs\ledgerone_erp_three\client\assets\js\sale\pos_invoice\pos-add.js'
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# ── Fix 1: Move Net KG to index 2, change priceCell insertCell(2) → (-1) ──
$old1 = "    initTableDropdownDynamic(codeContainer, row);`r`n    `r`n    // Unit cells will be added dynamically (inserted starting at index 2)`r`n`r`n    // Price`r`n`r`n    const priceCell = row.insertCell(2);"
$new1 = "    initTableDropdownDynamic(codeContainer, row);`r`n`r`n    // Net KG - inserted at index 2 (before dynamic unit cells and price)`r`n    const netKgCell = row.insertCell(2);`r`n    netKgCell.className = 'net-kg-cell';`r`n    const netKgInput = document.createElement('input');`r`n    netKgInput.type = 'number';`r`n    netKgInput.className = 'table-input';`r`n    netKgInput.min = '0';`r`n    netKgInput.step = '0.01';`r`n    netKgInput.value = '0';`r`n    netKgInput.addEventListener('input', function() {`r`n        updateNetKGTotal();`r`n        calculateBrokenAmount();`r`n    });`r`n    netKgCell.appendChild(netKgInput);`r`n`r`n    // Unit cells will be added dynamically (inserted starting at index 3)`r`n    // Price`r`n    const priceCell = row.insertCell(-1);"

if ($c.Contains($old1)) {
    $c = $c.Replace($old1, $new1)
    Write-Host "R1 CRLF: OK"
} else {
    # Try LF only
    $old1lf = "    initTableDropdownDynamic(codeContainer, row);`n    `n    // Unit cells will be added dynamically (inserted starting at index 2)`n`n    // Price`n`n    const priceCell = row.insertCell(2);"
    $new1lf = "    initTableDropdownDynamic(codeContainer, row);`n`n    // Net KG - inserted at index 2 (before dynamic unit cells and price)`n    const netKgCell = row.insertCell(2);`n    netKgCell.className = 'net-kg-cell';`n    const netKgInput = document.createElement('input');`n    netKgInput.type = 'number';`n    netKgInput.className = 'table-input';`n    netKgInput.min = '0';`n    netKgInput.step = '0.01';`n    netKgInput.value = '0';`n    netKgInput.addEventListener('input', function() {`n        updateNetKGTotal();`n        calculateBrokenAmount();`n    });`n    netKgCell.appendChild(netKgInput);`n`n    // Unit cells will be added dynamically (inserted starting at index 3)`n    // Price`n    const priceCell = row.insertCell(-1);"
    if ($c.Contains($old1lf)) {
        $c = $c.Replace($old1lf, $new1lf)
        Write-Host "R1 LF: OK"
    } else {
        Write-Host "R1: NOT FOUND"
    }
}

# ── Fix 2: Remove old Net KG block after netCell (lines 5064-5076 area) ──
# Find the old block and remove it - use a regex approach
$old2 = "    netCell.appendChild(netInput);



    // Net KG

    const netKgCell = row.insertCell(-1);"

if ($c.Contains($old2)) {
    Write-Host "Found old Net KG block with CRLF spaces"
} else {
    Write-Host "Old Net KG block pattern check - searching differently"
}

# Use regex to remove the old Net KG block after netCell
$pattern = '(?s)(    netCell\.appendChild\(netInput\);)\s*// Net KG\s*const netKgCell = row\.insertCell\(-1\);\s*netKgCell\.className = ''net-kg-cell'';\s*const netKgInput = document\.createElement\(''input''\);\s*netKgInput\.type = ''number'';\s*netKgInput\.className = ''table-input'';\s*netKgInput\.min = ''0'';\s*netKgInput\.step = ''0\.01'';\s*netKgInput\.value = ''0'';\s*netKgInput\.addEventListener\(''input'', function\(\) \{\s*updateNetKGTotal\(\);\s*calculateBrokenAmount\(\);\s*\}\);\s*netKgCell\.appendChild\(netKgInput\);\s*(    // Actions)'
$replacement = '$1

    // Actions'
$c2 = [regex]::Replace($c, $pattern, $replacement)
if ($c2 -ne $c) {
    $c = $c2
    Write-Host "R2 regex: OK"
} else {
    Write-Host "R2 regex: NOT FOUND"
}

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "Saved."
