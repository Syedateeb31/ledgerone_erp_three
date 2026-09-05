const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/vouchers/receive_voucher/receive-add.php');
  await page.waitForSelector('#customerCode', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const companyOptCount = await page.locator('#company option').count();
  if (companyOptCount > 1) await page.selectOption('#company', { index: 1 });

  await page.click('#customerCode');
  await page.fill('#customerCode', 'TEST AUTOMATION Customer');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.test-artifacts/16-rv-customer-search.png' });

  const custOption = page.locator('#customerDropdown .dropdown-item:visible', { hasText: 'TEST AUTOMATION Customer' }).first();
  await custOption.waitFor({ timeout: 5000 });
  await custOption.click();
  await page.waitForTimeout(1500);

  await page.fill('#amount', '400');
  await page.waitForTimeout(500);

  const pmOptions = await page.locator('#paymentMethod option').allTextContents();
  console.log('payment method options:', pmOptions);
  const cashIdx = pmOptions.findIndex(o => /cash/i.test(o));
  await page.selectOption('#paymentMethod', { index: cashIdx >= 0 ? cashIdx : 1 });
  await page.waitForTimeout(500);

  await page.screenshot({ path: '.test-artifacts/17-rv-filled.png', fullPage: true });

  const postBtn = page.locator('#postBtn');
  await postBtn.scrollIntoViewIfNeeded();
  await postBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test-artifacts/18-rv-saved.png', fullPage: true });

  console.log('Final URL:', page.url());
  console.log('DONE receive voucher');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
