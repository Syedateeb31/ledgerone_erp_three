const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/sale/pos_invoice/pos-add.php');
  await page.waitForSelector('#customerCodeSearch', { timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log('saleDate value:', await page.inputValue('#saleDate').catch(() => 'N/A'));
  console.log('companyGroup visible:', await page.isVisible('#companyGroup'));
  console.log('branchGroup visible:', await page.isVisible('#branchGroup'));
  console.log('company hidden value:', await page.inputValue('#company').catch(() => 'N/A'));
  console.log('branch hidden value:', await page.inputValue('#branch').catch(() => 'N/A'));

  await page.screenshot({ path: '.test-artifacts/07-pos-initial.png', fullPage: true });
  await page.waitForTimeout(3000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
