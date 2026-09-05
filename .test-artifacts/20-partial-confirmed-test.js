const { chromium } = require('playwright');

async function createOrder(page, qty, price) {
  await page.goto('http://localhost/ledgerone_erp_three/client/pages/purchase/purchase_order/order-add.php');
  await page.waitForSelector('#supplierCodeSearch', { timeout: 15000 });
  await page.waitForTimeout(1500);
  const companyOptCount = await page.locator('#company option').count();
  if (companyOptCount > 1) await page.selectOption('#company', { index: 1 });
  await page.click('#supplierCodeSearch');
  await page.fill('#supplierCodeSearch', 'TEST AUTOMATION Supplier');
  await page.waitForTimeout(1000);
  await page.locator('#supplierCodeOptions .dropdown-option:visible', { hasText: 'TEST AUTOMATION Supplier' }).first().click();
  await page.waitForTimeout(1000);
  const rowSearchInput = page.locator('#itemsTable tbody tr').first().locator('input.search-input').first();
  await rowSearchInput.click();
  await rowSearchInput.fill('Abbamactin');
  await page.waitForTimeout(1000);
  await page.locator('.dropdown-options .dropdown-option:visible', { hasText: 'Abbamactin' }).first().click();
  await page.waitForTimeout(1500);
  const row = page.locator('#itemsTable tbody tr').first();
  await row.locator('input.unit-input').first().fill(String(qty));
  await page.waitForTimeout(300);
  await row.locator('.price-cell input').first().fill(String(price));
  await page.waitForTimeout(1000);
  await page.locator('#saveBtn').scrollIntoViewIfNeeded();
  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('order-add.php') && r.request().method() === 'POST'),
    page.locator('#saveBtn').click()
  ]);
  const body = await resp.json();
  console.log('order created:', body);
  return body.invoice_id; // actually the purchase_order id
}

async function createInvoiceForOrder(page, poBillNo, invoiceQty, status) {
  await page.goto('http://localhost/ledgerone_erp_three/client/pages/purchase/purchase_invoice/purchase-add.php');
  await page.waitForSelector('#supplierCodeSearch', { timeout: 15000 });
  await page.waitForTimeout(1500);
  const branchVal = await page.inputValue('#branch').catch(() => '');
  if (!branchVal) {
    await page.evaluate(() => {
      const b = document.getElementById('branch');
      const bs = document.getElementById('branchSearch');
      if (b) b.value = '21';
      if (bs) bs.value = 'WA-001 - Warehouse# 1 (warehouse)';
    });
  }
  await page.selectOption('#invoiceStatus', status);
  await page.click('#purchaseOrderSearch');
  await page.fill('#purchaseOrderSearch', poBillNo);
  await page.waitForTimeout(1200);
  const poOption = page.locator('#purchaseOrderOptions .dropdown-option:visible').first();
  await poOption.waitFor({ timeout: 5000 });
  await poOption.click();
  await page.waitForTimeout(1500);

  // Reduce quantity to simulate a partial invoice
  const row = page.locator('#itemsTable tbody tr').first();
  await row.locator('input.unit-input').first().fill(String(invoiceQty));
  await page.waitForTimeout(500);

  await page.locator('#saveBtn').scrollIntoViewIfNeeded();
  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('purchase-add.php') && r.request().method() === 'POST'),
    page.locator('#saveBtn').click()
  ]);
  const body = await resp.json();
  console.log('invoice created:', body);
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  const orderId = await createOrder(page, 10, 200); // order 10 units
  await page.waitForTimeout(1000);

  const orderRow = await page.evaluate(async (id) => {
    const r = await fetch(`/ledgerone_erp_three/server/api/purchase/purchase_order/order-list.php?page=1&limit=50&status=all`);
    const d = await r.json();
    return d.invoices.find(i => i.id == id);
  }, orderId);
  console.log('New order bill_no:', orderRow ? orderRow.bill_no : 'NOT FOUND');

  await createInvoiceForOrder(page, orderRow.bill_no, 4, 'confirmed'); // invoice only 4 of 10, confirmed
  await page.waitForTimeout(1500);

  const check = await page.evaluate(async (id) => {
    const r = await fetch(`/ledgerone_erp_three/server/api/purchase/purchase_order/order-list.php?page=1&limit=50&status=all`);
    const d = await r.json();
    return d.invoices.find(i => i.id == id);
  }, orderId);
  console.log('Order after PARTIAL confirmed invoice:', JSON.stringify(check));

  const pendingCheck = await page.evaluate(async (id) => {
    const r = await fetch(`/ledgerone_erp_three/server/api/purchase/purchase_order/order-list.php?page=1&limit=50&status=pending`);
    const d = await r.json();
    return d.invoices.some(i => i.id == id);
  }, orderId);
  console.log('Still shown under default Pending filter?', pendingCheck, '(should be false)');

  const confirmedCheck = await page.evaluate(async (id) => {
    const r = await fetch(`/ledgerone_erp_three/server/api/purchase/purchase_order/order-list.php?page=1&limit=50&status=confirmed`);
    const d = await r.json();
    return d.invoices.some(i => i.id == id);
  }, orderId);
  console.log('Shown under Confirmed filter?', confirmedCheck, '(should be true)');

  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
