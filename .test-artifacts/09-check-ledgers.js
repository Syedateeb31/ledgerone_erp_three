const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/dashboard/dashboard.php');
  await page.waitForTimeout(1000);

  const custLedger = await page.evaluate(async () => {
    const r = await fetch('/ledgerone_erp_three/server/api/financial_reports/customer_ledger/customer-ledger.php?type=detailed&customer_id=10751');
    return r.json();
  });
  console.log('CUSTOMER LEDGER for id=10751:');
  console.log(JSON.stringify(custLedger, null, 2).slice(0, 3000));

  const suppLedger = await page.evaluate(async () => {
    const r = await fetch('/ledgerone_erp_three/server/api/financial_reports/supplier_ledger/supplier-ledger.php?type=detailed&supplier_id=326');
    return r.json();
  });
  console.log('\n\nSUPPLIER LEDGER for id=326:');
  console.log(JSON.stringify(suppLedger, null, 2).slice(0, 3000));

  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
