const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/dashboard/dashboard.php');
  await page.waitForTimeout(1000);

  const partiesList = await page.evaluate(async () => {
    const r = await fetch('/ledgerone_erp_three/server/api/financial_reports/both_ledger/both-ledger.php?type=parties');
    return r.json();
  });
  console.log('BOTH PARTIES LIST:');
  console.log(JSON.stringify(partiesList, null, 2));

  const detailed = await page.evaluate(async () => {
    const r = await fetch('/ledgerone_erp_three/server/api/financial_reports/both_ledger/both-ledger.php?type=detailed&customer_id=10752');
    return r.json();
  });
  console.log('\n\nBOTH LEDGER DETAILED for customer_id=10752 (linked supplier 327):');
  console.log(JSON.stringify(detailed, null, 2));

  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
