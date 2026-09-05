$addPath = 'c:\xampp\htdocs\ledgerone_erp_three\client\assets\js\sale\pos_invoice\pos-add.js'
$uomPath = 'c:\xampp\htdocs\ledgerone_erp_three\client\assets\js\sale\pos_invoice\pos-add-uom.js'
$content = [System.IO.File]::ReadAllText($addPath)
$uom     = [System.IO.File]::ReadAllText($uomPath)
$r = "`r`n"
$n = "`n"

# Fix 1: Add updateTotalCharges function before // Recalculate Cut KG marker in pos-add.js
$marker = "// Recalculate Cut KG and AL KG from Total KG and Cut KG %"
$fn = "// Calculate Total Charges (sum of all extra charges)${r}function updateTotalCharges() {${r}    const ids = ['wtCharges','freight','mSukri','brokeryAmount','brokeryTaxAmount','bardana','phoneCharges','fillingCharges'];${r}    let total = 0;${r}    ids.forEach(id => {${r}        const el = document.getElementById(id);${r}        if (!el) return;${r}        const val = el.tagName === 'INPUT' ? parseFloat(el.value) : parseFloat(el.textContent);${r}        total += val || 0;${r}    });${r}    const el = document.getElementById('totalCharges');${r}    if (el) el.textContent = total.toFixed(2);${r}}${r}${r}"

if ($content.Contains($marker)) {
    $content = $content.Replace($marker, $fn + $marker)
    Write-Host "Fix1 OK"
} else {
    Write-Host "Fix1 NOT FOUND"
}

# Fix 2: Call updateTotalCharges when any charge input changes — add listeners in DOMContentLoaded
$old2 = "    const btp = document.getElementById('brokeryTaxPercent');${r}    if (btp) btp.addEventListener('input', function() { calculateBrokeryAmount(); });"
$new2 = "    const btp = document.getElementById('brokeryTaxPercent');${r}    if (btp) btp.addEventListener('input', function() { calculateBrokeryAmount(); });${r}    ['wtCharges','freight','mSukri','bardana','phoneCharges','fillingCharges'].forEach(function(id) {${r}        const el = document.getElementById(id);${r}        if (el) el.addEventListener('input', updateTotalCharges);${r}    });"

if ($content.Contains($old2)) {
    $content = $content.Replace($old2, $new2)
    Write-Host "Fix2 OK"
} else {
    Write-Host "Fix2 NOT FOUND"
}

[System.IO.File]::WriteAllText($addPath, $content, [System.Text.Encoding]::UTF8)

# Fix 3: Call updateTotalCharges at end of updateInvoiceSummaryDynamic in pos-add-uom.js
$old3 = "    if (typeof calculateInvoiceLevelTaxes === 'function') calculateInvoiceLevelTaxes();${n}    if (typeof calculateBrokeryAmount === 'function') calculateBrokeryAmount();${n}}"
$new3 = "    if (typeof calculateInvoiceLevelTaxes === 'function') calculateInvoiceLevelTaxes();${n}    if (typeof calculateBrokeryAmount === 'function') calculateBrokeryAmount();${n}    if (typeof updateTotalCharges === 'function') updateTotalCharges();${n}}"

if ($uom.Contains($old3)) {
    [System.IO.File]::WriteAllText($uomPath, $uom.Replace($old3, $new3), [System.Text.Encoding]::UTF8)
    Write-Host "Fix3 OK"
} else {
    Write-Host "Fix3 NOT FOUND"
}
