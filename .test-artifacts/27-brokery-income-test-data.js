const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  // ---- Sale invoice with 5% brokery, confirmed ----
  await page.goto('http://localhost/ledgerone_erp_three/client/pages/sale/pos_invoice/pos-add.php');
  await page.waitForSelector('#customerCodeSearch', { timeout: 15000 });
  await page.waitForTimeout(1500);
  const branchVal = await page.inputValue('#branch').catch(() => '');
  if (!branchVal) {
    await page.evaluate(() => {
      document.getElementById('branch').value = '21';
      document.getElementById('branchSearch').value = 'WA-001 - Warehouse# 1 (warehouse)';
    });
  }
  await page.selectOption('#invoiceStatus', 'confirmed');
  await page.click('#customerCodeSearch');
  await page.fill('#customerCodeSearch', 'TEST AUTOMATION Customer');
  await page.waitForTimeout(1000);
  await page.locator('#customerCodeOptions .dropdown-option:visible', { hasText: 'TEST AUTOMATION Customer' }).first().click();
  await page.waitForTimeout(1000);
  const rowSearchInput = page.locator('#itemsTable tbody tr').first().locator('input.search-input').first();
  await rowSearchInput.click();
  await rowSearchInput.fill('Abbamactin');
  await page.waitForTimeout(1000);
  await page.locator('.dropdown-options .dropdown-option:visible', { hasText: 'Abbamactin' }).first().click();
  await page.waitForTimeout(1500);
  const row = page.locator('#itemsTable tbody tr').first();
  await row.locator('input.unit-input').first().fill('1');
  await page.waitForTimeout(300);
  await row.locator('.price-cell input').first().fill('1000');
  await page.waitForTimeout(1000);

  // Switch brokery to % mode and set 5%
  await page.click('#brokeryPctToggle');
  await page.waitForTimeout(500);
  await page.fill('#brokeryRate', '5');
  await page.waitForTimeout(1000);
  const brokeryAmtText = await page.locator('#brokeryAmount').textContent().catch(() => '');
  console.log('Sale brokery amount preview:', brokeryAmtText);

  await page.locator('#saveBtn').scrollIntoViewIfNeeded();
  const [resp1] = await Promise.all([
    page.waitForResponse(r => r.url().includes('pos-add.php') && r.request().method() === 'POST').catch(() => null),
    page.locator('#saveBtn').click()
  ]);
  if (resp1) console.log('sale invoice response:', await resp1.text());
  await page.waitForTimeout(2500);

  // ---- Purchase invoice with 5% brokery, confirmed ----
  await page.goto('http://localhost/ledgerone_erp_three/client/pages/purchase/purchase_invoice/purchase-add.php');
  await page.waitForSelector('#supplierCodeSearch', { timeout: 15000 });
  await page.waitForTimeout(1500);
  const branchVal2 = await page.inputValue('#branch').catch(() => '');
  if (!branchVal2) {
    await page.evaluate(() => {
      const b = document.getElementById('branch');
      const bs = document.getElementById('branchSearch');
      if (b) b.value = '21';
      if (bs) bs.value = 'WA-001 - Warehouse# 1 (warehouse)';
    });
  }
  await page.selectOption('#invoiceStatus', 'confirmed');
  await page.click('#supplierCodeSearch');
  await page.fill('#supplierCodeSearch', 'TEST AUTOMATION Supplier');
  await page.waitForTimeout(1000);
  await page.locator('#supplierCodeOptions .dropdown-option:visible', { hasText: 'TEST AUTOMATION Supplier' }).first().click();
  await page.waitForTimeout(1000);
  const rowSearchInput2 = page.locator('#itemsTable tbody tr').first().locator('input.search-input').first();
  await rowSearchInput2.click();
  await rowSearchInput2.fill('Abbamactin');
  await page.waitForTimeout(1000);
  await page.locator('.dropdown-options .dropdown-option:visible', { hasText: 'Abbamactin' }).first().click();
  await page.waitForTimeout(1500);
  const row2 = page.locator('#itemsTable tbody tr').first();
  await row2.locator('input.unit-input').first().fill('1');
  await page.waitForTimeout(300);
  await row2.locator('.price-cell input').first().fill('800');
  await page.waitForTimeout(1000);

  await page.click('#brokeryPctToggle');
  await page.waitForTimeout(500);
  await page.fill('#brokeryRate', '4');
  await page.waitForTimeout(1000);
  const brokeryAmtText2 = await page.locator('#brokeryAmount').textContent().catch(() => '');
  console.log('Purchase brokery amount preview:', brokeryAmtText2);

  await page.locator('#saveBtn').scrollIntoViewIfNeeded();
  const [resp2] = await Promise.all([
    page.waitForResponse(r => r.url().includes('purchase-add.php') && r.request().method() === 'POST').catch(() => null),
    page.locator('#saveBtn').click()
  ]);
  if (resp2) console.log('purchase invoice response:', await resp2.text());
  await page.waitForTimeout(2500);

  console.log('DONE brokery test data creation');
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
