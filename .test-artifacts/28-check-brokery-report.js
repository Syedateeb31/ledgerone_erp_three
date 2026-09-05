const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50, args: ['--start-maximized'] });
  const context = await browser.newContext({ storageState: '.test-artifacts/auth-state.json', viewport: null });
  const page = await context.newPage();

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/dashboard/dashboard.php');
  await page.waitForTimeout(1000);

  for (const type of ['sale', 'purchase', 'both']) {
    const result = await page.evaluate(async (t) => {
      const r = await fetch(`/ledgerone_erp_three/server/api/financial_reports/brokery_income_report/get-brokery-income-report.php?type=${t}&date_from=2026-09-01&date_to=2026-09-30`);
      return r.json();
    }, type);
    console.log(`\n=== type=${type} ===`);
    console.log('summary:', JSON.stringify(result.summary));
    console.log('data:', JSON.stringify(result.data, null, 2));
  }

  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
