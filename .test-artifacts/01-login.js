const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost/ledgerone_erp_three/client/pages/auth/login.html');
  await page.waitForSelector('#email, input[type="email"], input[name="email"]', { timeout: 10000 });

  // Try to find login form fields generically
  const emailSel = await page.locator('input[type="email"], #email').first();
  const passSel = await page.locator('input[type="password"], #password').first();
  await emailSel.fill('mhaji2681@gmail.com');
  await passSel.fill('Test@1234');
  await page.screenshot({ path: '.test-artifacts/01-login-form.png' });

  const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
  await submitBtn.click();

  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.test-artifacts/02-after-login.png' });
  console.log('URL after login:', page.url());

  await context.storageState({ path: '.test-artifacts/auth-state.json' });
  await browser.close();
})().catch(e => { console.error('SCRIPT ERROR:', e); process.exit(1); });
