const { chromium } = require('playwright');

async function createSale(page) {
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

  await page.click('#customerCodeSearch');
  await page.fill('#customerCodeSearch', 'TEST AUTOMATION Both Party');
  await page.waitForTimeout(1000);
  const custOption = page.locator('#customerCodeOptions .dropdown-option:visible', { hasText: 'TEST AUTOMATION Both Party' }).first();
  await custOption.click();
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
  await row.locator('input.unit-input').first().fill('1');
  await page.waitForTimeout(300);
  await row.locator('.price-cell input').first().fill('700');
  await page.waitForTimeout(1000);

  await page.locator('#saveBtn').scrollIntoViewIfNeeded();
  await page.locator('#saveBtn').click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test-artifacts/24-both-sale-saved.png', fullPage: true });
}

async function createPurchase(page) {
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

  await page.click('#supplierCodeSearch');
  await page.fill('#supplierCodeSearch', 'TEST AUTOMATION Both Party');
  await page.waitForTimeout(1000);
  const suppOption = page.locator('#supplierCodeOptions .dropdown-option:visible', { hasText: 'TEST AUTOMATION Both Party' }).first();
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
  await row.locator('input.unit-input').first().fill('1');
  await page.waitForTimeout(300);
  await row.locator('.price-cell input').first().fill('450');
  await page.waitForTimeout(1000);

  await page.locator('#saveBtn').scrollIntoViewIfNeeded();
  await page.locator('#saveBtn').click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test-artifacts/25-both-purchase-saved.png', fullPage: true });
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  console.log('--- Creating Sale Invoice for Both party ---');
  await createSale(page);
  console.log('--- Creating Purchase Invoice for Both party ---');
  await createPurchase(page);

  console.log('DONE both transactions');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
