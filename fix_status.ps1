$file = 'c:\xampp\htdocs\ledgerone_erp_three\client\assets\js\purchase\purchase_invoice\purchase-add.js'
$content = Get-Content $file -Raw
$bad = "parseFloat(document.getElementById('netAmount')?.textContent),\n            status: document.getElementById('invoiceStatus')?.value || 'pending',\n            remarks: document.getElementById('remarks')?.value,"
$good = "parseFloat(document.getElementById('netAmount')?.textContent)," + "`r`n" + "            status: document.getElementById('invoiceStatus')?.value || 'pending'," + "`r`n" + "            remarks: document.getElementById('remarks')?.value,"
$content = $content.Replace($bad, $good)
Set-Content $file $content -NoNewline
Write-Host "Done"
