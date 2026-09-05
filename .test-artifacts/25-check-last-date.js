const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/purchase/purchase_order/order-list.php');
  await page.waitForTimeout(1500);
  await page.selectOption('#statusFilter', 'all');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '.test-artifacts/46-last-date-column.png', fullPage: true });

  console.log('DONE last date check');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
