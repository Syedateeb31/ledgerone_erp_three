const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/customer_supplier/customer_supplier_both/customer-supplier-list.php');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '.test-artifacts/26-both-list.png', fullPage: true });

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/financial_reports/both_ledger/both-ledger.php');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '.test-artifacts/27-both-ledger-page.png', fullPage: true });

  console.log('DONE both list/ledger UI check');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
