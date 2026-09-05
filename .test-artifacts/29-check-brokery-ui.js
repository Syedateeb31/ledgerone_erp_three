const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/sale/brokery_income_report/brokery-income-report.php');
  await page.waitForTimeout(1000);
  await page.fill('#date_from', '2026-09-01');
  await page.fill('#date_to', '2026-09-30');
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '.test-artifacts/49-brokery-both.png', fullPage: true });

  // Expand the product block to see transaction rows
  await page.click('.product-header');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.test-artifacts/50-brokery-both-expanded.png', fullPage: true });

  // Switch to Sale only
  await page.selectOption('#txn_type', 'sale');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '.test-artifacts/51-brokery-sale-only.png', fullPage: true });

  // Switch to Purchase only
  await page.selectOption('#txn_type', 'purchase');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '.test-artifacts/52-brokery-purchase-only.png', fullPage: true });

  console.log('DONE brokery UI check');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
