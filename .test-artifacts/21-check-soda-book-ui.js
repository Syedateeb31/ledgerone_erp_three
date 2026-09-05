const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/soda_book/soda-book-list.php');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test-artifacts/38-soda-book-default-pending.png', fullPage: true });

  // Switch the buyer iframe's status filter to Confirmed
  const frame = page.frames().find(f => f.url().includes('order-list.php'));
  console.log('frame found:', !!frame, frame ? frame.url() : '');
  if (frame) {
    await frame.selectOption('#statusFilter', 'confirmed');
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: '.test-artifacts/39-soda-book-confirmed-filter.png', fullPage: true });

  console.log('DONE soda book UI check');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
