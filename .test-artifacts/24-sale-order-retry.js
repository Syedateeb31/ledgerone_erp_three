const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();
  page.on('dialog', async d => { console.log('DIALOG:', d.message()); await d.accept(); });

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
  await page.selectOption('#invoiceStatus', 'confirmed');

  await page.click('#customerCodeSearch');
  await page.fill('#customerCodeSearch', 'TEST AUTOMATION Customer');
  await page.waitForTimeout(1000);
  await page.locator('#customerCodeOptions .dropdown-option:visible', { hasText: 'TEST AUTOMATION Customer' }).first().click();
  await page.waitForTimeout(1000);

  const saleOrderSearch = page.locator('#saleOrderSearch');
  await saleOrderSearch.click();
  await saleOrderSearch.fill('SO-0001');
  await page.waitForTimeout(1200);
  const soOption = page.locator('#saleOrderOptions .dropdown-option:visible').first();
  await soOption.waitFor({ timeout: 5000 });
  await soOption.click();
  await page.waitForTimeout(1500);

  const row = page.locator('#itemsTable tbody tr').first();
  await row.locator('input.unit-input').first().fill('1');
  await page.waitForTimeout(800);

  await page.locator('#saveBtn').scrollIntoViewIfNeeded();
  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('pos-add.php') && r.request().method() === 'POST').catch(() => null),
    page.locator('#saveBtn').click()
  ]);
  if (resp) console.log('pos-add.php response:', await resp.text());
  await page.waitForTimeout(2500);

  const pendingCheck = await page.evaluate(async () => {
    const r = await fetch(`/ledgerone_erp_three/server/api/sale/sale_order/order-list.php?page=1&limit=50&status=pending`);
    const d = await r.json();
    return { total: d.pagination.total, present: d.invoices.some(i => i.bill_no === 'SO-0001') };
  });
  console.log('Default Pending filter:', JSON.stringify(pendingCheck), '(present should be false)');

  const allCheck = await page.evaluate(async () => {
    const r = await fetch(`/ledgerone_erp_three/server/api/sale/sale_order/order-list.php?page=1&limit=50&status=all`);
    const d = await r.json();
    return d.invoices.find(i => i.bill_no === 'SO-0001');
  });
  console.log('All filter -> SO-0001 row:', JSON.stringify(allCheck));

  const confirmedCheck = await page.evaluate(async () => {
    const r = await fetch(`/ledgerone_erp_three/server/api/sale/sale_order/order-list.php?page=1&limit=50&status=confirmed`);
    const d = await r.json();
    return d.invoices.some(i => i.bill_no === 'SO-0001');
  });
  console.log('Shown under Confirmed filter?', confirmedCheck, '(should be true)');

  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
