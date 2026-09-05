const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/sale/brokery_income_report/brokery-income-report.php');
  await page.waitForTimeout(1000);
  await page.fill('#date_from', '2026-09-01');
  await page.fill('#date_to', '2026-09-30');
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '.test-artifacts/53-remarks-column.png', fullPage: true });

  // Confirm <b> was escaped, not rendered as bold
  const remarksCellHTML = await page.locator('td:has-text("Urgent delivery")').innerHTML().catch(() => 'NOT FOUND');
  console.log('Remarks cell innerHTML:', remarksCellHTML);

  console.log('DONE remarks check');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
