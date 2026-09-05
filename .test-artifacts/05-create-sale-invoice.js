const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/sale/pos_invoice/pos-add.php');
  await page.waitForSelector('#customerCodeSearch', { timeout: 15000 });
  await page.waitForFunction(() => document.getElementById('branch')?.value, { timeout: 8000 }).catch(() => console.log('WARN: branch never auto-filled (pre-existing data gap: tenant 5 default branch has no parent_branch_id, excluded by get-branches.php query) - setting manually for this test'));
  const branchVal = await page.inputValue('#branch').catch(() => '');
  if (!branchVal) {
    await page.evaluate(() => {
      document.getElementById('branch').value = '21';
      document.getElementById('branchSearch').value = 'WA-001 - Warehouse# 1 (warehouse)';
    });
  }
  console.log('branch after fix:', await page.inputValue('#branch').catch(() => 'N/A'));
  await page.waitForTimeout(500);

  // Select customer via searchable dropdown
  await page.click('#customerCodeSearch');
  await page.fill('#customerCodeSearch', 'TEST AUTOMATION Customer');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.test-artifacts/08-customer-search.png' });
  const custOption = page.locator('#customerCodeOptions .dropdown-option:visible', { hasText: 'TEST AUTOMATION Customer' }).first();
  await custOption.click();
  await page.waitForTimeout(1000);

  // Select product in first item row
  const rowSearchInput = page.locator('#itemsTable tbody tr').first().locator('input.search-input').first();
  await rowSearchInput.click();
  await rowSearchInput.fill('Abbamactin');
  await page.waitForTimeout(1000);

  const firstProductOption = page.locator('.dropdown-options .dropdown-option:visible', { hasText: 'Abbamactin' }).first();
  await firstProductOption.waitFor({ timeout: 5000 });
  const productText = await firstProductOption.textContent();
  console.log('Selected product:', productText);
  await firstProductOption.click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: '.test-artifacts/10-after-product-select.png', fullPage: true });

  // Fill quantity (first unit-input in the row) and price
  const row = page.locator('#itemsTable tbody tr').first();
  const qtyInput = row.locator('input.unit-input').first();
  await qtyInput.fill('2');
  await page.waitForTimeout(500);
  const priceInput = row.locator('.price-cell input').first();
  await priceInput.fill('500');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '.test-artifacts/11-item-filled.png', fullPage: true });

  const saveBtn = page.locator('#saveBtn');
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test-artifacts/12-invoice-saved.png', fullPage: true });

  console.log('Final URL:', page.url());
  console.log('DONE sale invoice');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
