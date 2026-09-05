const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/purchase/purchase_invoice/purchase-add.php');
  await page.waitForSelector('#supplierCodeSearch', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const branchVal = await page.inputValue('#branch').catch(() => '');
  console.log('branch initial:', branchVal);
  if (!branchVal) {
    await page.evaluate(() => {
      const b = document.getElementById('branch');
      const bs = document.getElementById('branchSearch');
      if (b) b.value = '21';
      if (bs) bs.value = 'WA-001 - Warehouse# 1 (warehouse)';
    });
  }

  await page.click('#supplierCodeSearch');
  await page.fill('#supplierCodeSearch', 'TEST AUTOMATION Supplier');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.test-artifacts/13-supplier-search.png' });
  const suppOption = page.locator('#supplierCodeOptions .dropdown-option:visible', { hasText: 'TEST AUTOMATION Supplier' }).first();
  await suppOption.click();
  await page.waitForTimeout(1000);

  const rowSearchInput = page.locator('#itemsTable tbody tr').first().locator('input.search-input').first();
  await rowSearchInput.click();
  await rowSearchInput.fill('Abbamactin');
  await page.waitForTimeout(1000);
  const firstProductOption = page.locator('.dropdown-options .dropdown-option:visible', { hasText: 'Abbamactin' }).first();
  await firstProductOption.waitFor({ timeout: 5000 });
  await firstProductOption.click();
  await page.waitForTimeout(1500);

  const row = page.locator('#itemsTable tbody tr').first();
  const qtyInput = row.locator('input.unit-input').first();
  await qtyInput.fill('3');
  await page.waitForTimeout(500);
  const priceInput = row.locator('.price-cell input').first();
  await priceInput.fill('300');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '.test-artifacts/14-purchase-item-filled.png', fullPage: true });

  const saveBtn = page.locator('#saveBtn');
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test-artifacts/15-purchase-saved.png', fullPage: true });

  console.log('Final URL:', page.url());
  console.log('DONE purchase invoice');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
