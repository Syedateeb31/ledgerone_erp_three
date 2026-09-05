const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/customer_supplier/suppliers/supplier-add.php');
  await page.waitForSelector('#supplierName', { timeout: 15000 });
  await page.waitForTimeout(1500);

  await page.selectOption('#company', { index: 1 });
  await page.fill('#supplierName', 'TEST AUTOMATION Supplier Khan Traders');

  await page.screenshot({ path: '.test-artifacts/05-supplier-form-filled.png', fullPage: true });

  await page.click('#submitBtn');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '.test-artifacts/06-supplier-saved.png', fullPage: true });

  console.log('DONE create-supplier');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
