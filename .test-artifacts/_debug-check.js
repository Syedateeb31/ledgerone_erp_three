const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  await page.goto('http://localhost/ledgerone_erp_three/client/pages/purchase/purchase_order/order-add.php');
  await page.waitForTimeout(2000);
  console.log('URL:', page.url());
  await page.screenshot({ path: '.test-artifacts/_debug.png', fullPage: true });
  await page.waitForTimeout(2000);
  await browser.close();
})();
