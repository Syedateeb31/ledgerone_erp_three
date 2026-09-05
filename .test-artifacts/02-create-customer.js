const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json' });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/customer_supplier/customers/customer-add.php');
  await page.waitForSelector('#customerName', { timeout: 15000 });
  await page.waitForTimeout(1500); // let dropdowns (company etc) populate

  await page.selectOption('#company', { index: 1 });
  await page.fill('#customerName', 'TEST AUTOMATION Customer Ali Traders');

  // Also exercise the "Linked Supplier" (party-link) feature: check it, keep default
  // "Create new Supplier (same details)" mode, so this save also creates+links a Supplier.
  const linkCheckbox = page.locator('#partyLinkContainer input[type="checkbox"]').first();
  await linkCheckbox.check();

  await page.screenshot({ path: '.test-artifacts/03-customer-form-filled.png', fullPage: true });

  await page.click('#submitBtn');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '.test-artifacts/04-customer-saved.png', fullPage: true });

  console.log('DONE create-customer');
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
