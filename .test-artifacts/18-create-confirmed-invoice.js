const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });
  page.on('response', async resp => {
    if (resp.url().includes('purchase-add.php') && resp.request().method() === 'POST') {
      try { console.log('purchase-add.php response:', await resp.text()); } catch (e) {}
    }
  });

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/purchase/purchase_invoice/purchase-add.php');
  await page.waitForSelector('#supplierCodeSearch', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const branchVal = await page.inputValue('#branch').catch(() => '');
  if (!branchVal) {
    await page.evaluate(() => {
      const b = document.getElementById('branch');
      const bs = document.getElementById('branchSearch');
      if (b) b.value = '21';
      if (bs) bs.value = 'WA-001 - Warehouse# 1 (warehouse)';
    });
  }

  // Set status to Confirmed
  await page.selectOption('#invoiceStatus', 'confirmed');

  // Link to the Purchase Order we just created (PO-0001)
  await page.click('#purchaseOrderSearch');
  await page.fill('#purchaseOrderSearch', 'PO-0001');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '.test-artifacts/34-po-search.png' });
  const poOption = page.locator('#purchaseOrderOptions .dropdown-option:visible').first();
  await poOption.waitFor({ timeout: 5000 });
  const poText = await poOption.textContent();
  console.log('PO option found:', poText);
  await poOption.click();
  await page.waitForTimeout(1500);

  console.log('supplierCode after PO select:', await page.inputValue('#supplierCode').catch(() => 'N/A'));
  console.log('purchaseOrder hidden value:', await page.inputValue('#purchaseOrder').catch(() => 'N/A'));

  await page.screenshot({ path: '.test-artifacts/35-invoice-after-po-link.png', fullPage: true });

  // If items weren't pulled in automatically from the PO, add one manually
  const rowCount = await page.locator('#itemsTable tbody tr').count();
  console.log('item rows after PO link:', rowCount);
  if (rowCount === 0) {
    await page.click('#addRowBtn').catch(() => {});
    await page.waitForTimeout(500);
  }
  const firstRowQty = await page.locator('#itemsTable tbody tr').first().locator('input.unit-input').first().inputValue().catch(() => '');
  console.log('first row qty:', firstRowQty);
  if (!firstRowQty || parseFloat(firstRowQty) === 0) {
    const rowSearchInput = page.locator('#itemsTable tbody tr').first().locator('input.search-input').first();
    await rowSearchInput.click();
    await rowSearchInput.fill('Abbamactin');
    await page.waitForTimeout(1000);
    const firstProductOption = page.locator('.dropdown-options .dropdown-option:visible', { hasText: 'Abbamactin' }).first();
    await firstProductOption.waitFor({ timeout: 5000 });
    await firstProductOption.click();
    await page.waitForTimeout(1500);
    const row = page.locator('#itemsTable tbody tr').first();
    await row.locator('input.unit-input').first().fill('5');
    await page.waitForTimeout(300);
    await row.locator('.price-cell input').first().fill('200');
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: '.test-artifacts/36-invoice-filled.png', fullPage: true });

  await page.locator('#saveBtn').scrollIntoViewIfNeeded();
  await page.locator('#saveBtn').click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test-artifacts/37-invoice-saved.png', fullPage: true });

  console.log('DONE confirmed invoice');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
