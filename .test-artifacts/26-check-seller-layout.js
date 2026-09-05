const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/sale/sale_order/order-list.php');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '.test-artifacts/47-seller-layout.png', fullPage: true });

  await page.selectOption('#statusFilter', 'all').catch(()=>{});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '.test-artifacts/48-seller-layout-all.png', fullPage: true });

  console.log('DONE seller layout check');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
