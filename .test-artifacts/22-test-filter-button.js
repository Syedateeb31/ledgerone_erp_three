const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

  // Go straight to the buyer page (not through the iframe wrapper) to isolate it
  await page.goto('http://localhost/ledgerone_erp_three/client/pages/purchase/purchase_order/order-list.php');
  await page.waitForTimeout(2500);

  const initialRows = await page.locator('#invoicesTable tbody tr').count();
  console.log('Rows with default Pending filter:', initialRows);
  await page.screenshot({ path: '.test-artifacts/40-filter-default.png', fullPage: true });

  // Real user interaction: click the dropdown, pick "Confirmed"
  await page.selectOption('#statusFilter', 'confirmed');
  await page.waitForTimeout(2000);
  const afterDropdownRows = await page.locator('#invoicesTable tbody tr').count();
  console.log('Rows right after selecting Confirmed (auto change event):', afterDropdownRows);
  await page.screenshot({ path: '.test-artifacts/41-filter-after-dropdown.png', fullPage: true });

  // Now switch back to Pending and use the explicit Filter button instead
  await page.selectOption('#statusFilter', 'pending');
  await page.waitForTimeout(500);
  await page.selectOption('#statusFilter', 'confirmed');
  await page.waitForTimeout(300);
  await page.click('#applyFilterBtn');
  await page.waitForTimeout(2000);
  const afterButtonRows = await page.locator('#invoicesTable tbody tr').count();
  console.log('Rows after clicking Filter button (status=confirmed):', afterButtonRows);
  await page.screenshot({ path: '.test-artifacts/42-filter-after-button.png', fullPage: true });

  console.log('DONE filter button test');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
