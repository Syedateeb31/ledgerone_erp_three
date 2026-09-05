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
  await page.waitForTimeout(2500);

  await page.selectOption('#company', { index: 1 });
  await page.fill('#partyName', 'TEST AUTOMATION Territory Check Party');

  // Customer-side territory: pick first real option in each cascade select
  const custCountryOpts = await page.locator('#country option').count();
  console.log('customer country options:', custCountryOpts);
  if (custCountryOpts > 1) {
    await page.selectOption('#country', { index: 1 });
    await page.waitForTimeout(1200);
  }

  // Supplier-side territory: pick first real option
  const suppCountryOpts = await page.locator('#supplierCountry option').count();
  console.log('supplier country options:', suppCountryOpts);
  if (suppCountryOpts > 1) {
    await page.selectOption('#supplierCountry', { index: 1 });
    await page.waitForTimeout(1200);
  }
  const suppRegionOpts = await page.locator('#supplierRegion option').count();
  console.log('supplier region options after country select:', suppRegionOpts);
  if (suppRegionOpts > 1) {
    await page.selectOption('#supplierRegion', { index: 1 });
    await page.waitForTimeout(1200);
  }
  const suppCityOpts = await page.locator('#supplierCity option').count();
  console.log('supplier city options after region select:', suppCityOpts);
  if (suppCityOpts > 1) {
    await page.selectOption('#supplierCity', { index: 1 });
    await page.waitForTimeout(1200);
  }

  await page.screenshot({ path: '.test-artifacts/28-supplier-territory-filled.png', fullPage: true });

  console.log('supplierCountry value:', await page.inputValue('#supplierCountry').catch(() => 'N/A'));
  console.log('supplierRegion value:', await page.inputValue('#supplierRegion').catch(() => 'N/A'));
  console.log('supplierCity value:', await page.inputValue('#supplierCity').catch(() => 'N/A'));

  const submitBtn = page.locator('#submitBtn');
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test-artifacts/29-territory-both-saved.png', fullPage: true });

  console.log('DONE territory test');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
