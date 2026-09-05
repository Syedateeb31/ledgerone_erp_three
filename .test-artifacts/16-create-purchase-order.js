const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/purchase/purchase_order/order-add.php');
  await page.waitForSelector('#supplierCodeSearch', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const companyOptCount = await page.locator('#company option').count();
  if (companyOptCount > 1) await page.selectOption('#company', { index: 1 });

  const branchVal = await page.inputValue('#branch').catch(() => '');
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
  await row.locator('input.unit-input').first().fill('5');
  await page.waitForTimeout(300);
  await row.locator('.price-cell input').first().fill('200');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '.test-artifacts/31-order-filled.png', fullPage: true });

  await page.locator('#saveBtn').scrollIntoViewIfNeeded();
  await page.locator('#saveBtn').click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test-artifacts/32-order-saved.png', fullPage: true });

  console.log('Final URL:', page.url());
  console.log('DONE create purchase order');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
