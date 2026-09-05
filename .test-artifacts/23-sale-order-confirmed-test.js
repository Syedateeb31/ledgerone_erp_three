const { chromium } = require('playwright');

async function createSaleOrder(page, qty, price) {
  await page.goto('http://localhost/ledgerone_erp_three/client/pages/sale/sale_order/order-add.php');
  await page.waitForSelector('#customerCodeSearch', { timeout: 15000 });
  await page.waitForTimeout(1500);
  const companyOptCount = await page.locator('#company option').count();
  if (companyOptCount > 1) await page.selectOption('#company', { index: 1 });
  const branchVal = await page.inputValue('#branch').catch(() => '');
  if (!branchVal) {
    await page.evaluate(() => {
      const b = document.getElementById('branch');
      const bs = document.getElementById('branchSearch');
      if (b) b.value = '21';
      if (bs) bs.value = 'WA-001 - Warehouse# 1 (warehouse)';
    });
  }
  await page.click('#customerCodeSearch');
  await page.fill('#customerCodeSearch', 'TEST AUTOMATION Customer');
  await page.waitForTimeout(1000);
  await page.locator('#customerCodeOptions .dropdown-option:visible', { hasText: 'TEST AUTOMATION Customer' }).first().click();
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
  console.log('sale order created:', body);
  return body;
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

  const orderResult = await createSaleOrder(page, 10, 300); // order 10 units
  await page.waitForTimeout(1000);

  // Find the order's bill_no via the all-status listing
  const orderRow = await page.evaluate(async () => {
    const r = await fetch(`/ledgerone_erp_three/server/api/sale/sale_order/order-list.php?page=1&limit=10&status=all`);
    const d = await r.json();
    return d.invoices[0]; // most recent
  });
  console.log('New sale order:', orderRow.bill_no, 'id:', orderRow.id);

  // Now create a POS/Sale invoice linked to this order, with only PART of the qty, status=confirmed
  await page.goto('http://localhost/ledgerone_erp_three/client/pages/sale/pos_invoice/pos-add.php');
  await page.waitForSelector('#customerCodeSearch', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const branchVal = await page.inputValue('#branch').catch(() => '');
  if (!branchVal) {
    await page.evaluate(() => {
      document.getElementById('branch').value = '21';
      document.getElementById('branchSearch').value = 'WA-001 - Warehouse# 1 (warehouse)';
    });
  }

  const statusOptions = await page.locator('#invoiceStatus option').allTextContents().catch(() => []);
  console.log('invoiceStatus options:', statusOptions);
  await page.selectOption('#invoiceStatus', 'confirmed').catch(async e => {
    console.log('could not select confirmed by value, trying label match');
  });

  await page.click('#customerCodeSearch');
  await page.fill('#customerCodeSearch', 'TEST AUTOMATION Customer');
  await page.waitForTimeout(1000);
  await page.locator('#customerCodeOptions .dropdown-option:visible', { hasText: 'TEST AUTOMATION Customer' }).first().click();
  await page.waitForTimeout(1000);

  // Link the Sale Order
  const saleOrderSearch = page.locator('#saleOrderSearch');
  if (await saleOrderSearch.count() > 0) {
    await saleOrderSearch.click();
    await saleOrderSearch.fill(orderRow.bill_no);
    await page.waitForTimeout(1200);
    const soOption = page.locator('#saleOrderOptions .dropdown-option:visible').first();
    await soOption.waitFor({ timeout: 5000 });
    console.log('sale order option text:', await soOption.textContent());
    await soOption.click();
    await page.waitForTimeout(1500);
  } else {
    console.log('WARN: no saleOrderSearch field found on pos-add.php');
  }

  await page.screenshot({ path: '.test-artifacts/43-pos-after-so-link.png', fullPage: true });

  const rowCount = await page.locator('#itemsTable tbody tr').count();
  console.log('item rows after SO link:', rowCount);
  if (rowCount === 0) {
    const rowSearchInput2 = page.locator('#itemsTable tbody tr').first().locator('input.search-input').first();
    await rowSearchInput2.click().catch(()=>{});
  }
  // Reduce qty to make it a partial fulfillment (e.g. 4 of 10)
  const row2 = page.locator('#itemsTable tbody tr').first();
  const qtyInput = row2.locator('input.unit-input').first();
  if (await qtyInput.count() > 0) {
    await qtyInput.fill('4');
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: '.test-artifacts/44-pos-filled.png', fullPage: true });

  await page.locator('#saveBtn').scrollIntoViewIfNeeded();
  const [invResp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('pos-add.php') && r.request().method() === 'POST').catch(() => null),
    page.locator('#saveBtn').click()
  ]);
  if (invResp) console.log('pos-add.php response:', await invResp.text());
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test-artifacts/45-pos-saved.png', fullPage: true });

  // Now check Soda Book Seller
  const pendingCheck = await page.evaluate(async (id) => {
    const r = await fetch(`/ledgerone_erp_three/server/api/sale/sale_order/order-list.php?page=1&limit=50&status=pending`);
    const d = await r.json();
    return { total: d.pagination.total, present: d.invoices.some(i => i.id == id) };
  }, orderRow.id);
  console.log('Default Pending filter:', JSON.stringify(pendingCheck), '(present should be false)');

  const allCheck = await page.evaluate(async (id) => {
    const r = await fetch(`/ledgerone_erp_three/server/api/sale/sale_order/order-list.php?page=1&limit=50&status=all`);
    const d = await r.json();
    return d.invoices.find(i => i.id == id);
  }, orderRow.id);
  console.log('All filter -> order row:', JSON.stringify(allCheck));

  const confirmedCheck = await page.evaluate(async (id) => {
    const r = await fetch(`/ledgerone_erp_three/server/api/sale/sale_order/order-list.php?page=1&limit=50&status=confirmed`);
    const d = await r.json();
    return d.invoices.some(i => i.id == id);
  }, orderRow.id);
  console.log('Shown under Confirmed filter?', confirmedCheck, '(should be true)');

  console.log('DONE sale order confirmed test');
  await page.waitForTimeout(2000);
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
