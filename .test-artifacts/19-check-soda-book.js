const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/dashboard/dashboard.php');
  await page.waitForTimeout(1000);

  const pendingResult = await page.evaluate(async () => {
    const r = await fetch('/ledgerone_erp_three/server/api/purchase/purchase_order/order-list.php?page=1&limit=50&status=pending');
    return r.json();
  });
  const pendingHasPO199 = pendingResult.invoices.some(i => i.id == 199);
  console.log('Default (Pending) filter -> total:', pendingResult.pagination.total, '| PO-0001 (id=199) present?', pendingHasPO199);

  const confirmedResult = await page.evaluate(async () => {
    const r = await fetch('/ledgerone_erp_three/server/api/purchase/purchase_order/order-list.php?page=1&limit=50&status=confirmed');
    return r.json();
  });
  const po199Row = confirmedResult.invoices.find(i => i.id == 199);
  console.log('Confirmed filter -> total:', confirmedResult.pagination.total, '| PO-0001 row:', JSON.stringify(po199Row));

  const allResult = await page.evaluate(async () => {
    const r = await fetch('/ledgerone_erp_three/server/api/purchase/purchase_order/order-list.php?page=1&limit=50&status=all');
    return r.json();
  });
  const po199InAll = allResult.invoices.find(i => i.id == 199);
  console.log('All filter -> total:', allResult.pagination.total, '| PO-0001 fulfillment_status:', po199InAll ? po199InAll.fulfillment_status : 'NOT FOUND');

  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
