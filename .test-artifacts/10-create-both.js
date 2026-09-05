const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/customer_supplier/customer_supplier_both/customer-supplier-add.php');
  await page.waitForSelector('#partyName', { timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.selectOption('#company', { index: 1 });
  await page.fill('#partyName', 'TEST AUTOMATION Both Party Rehman Traders');

  await page.screenshot({ path: '.test-artifacts/22-both-form-filled.png', fullPage: true });

  const submitBtn = page.locator('#submitBtn');
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test-artifacts/23-both-saved.png', fullPage: true });

  console.log('Final URL:', page.url());
  console.log('DONE create both');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
