const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // customerId 10753 corresponds to supplier 328 (TEST AUTOMATION Territory Check Party)
  await page.goto('http://localhost/ledgerone_erp_three/client/pages/customer_supplier/customer_supplier_both/customer-supplier-add.php?edit=10753');
  await page.waitForSelector('#partyName', { timeout: 15000 });
  await page.waitForTimeout(3000); // loadForEdit fires after an 800ms delay + fetch

  console.log('partyName value:', await page.inputValue('#partyName').catch(() => 'N/A'));
  console.log('supplierCountry value:', await page.inputValue('#supplierCountry').catch(() => 'N/A'));
  console.log('supplierRegion value:', await page.inputValue('#supplierRegion').catch(() => 'N/A'));
  console.log('supplierCity value:', await page.inputValue('#supplierCity').catch(() => 'N/A'));

  await page.screenshot({ path: '.test-artifacts/30-both-edit-territory.png', fullPage: true });

  console.log('DONE edit territory test');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
