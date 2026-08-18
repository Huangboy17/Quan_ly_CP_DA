const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  await page.goto('http://localhost:5174/');
  // wait for react to render
  await page.waitForTimeout(2000);
  // switch to Projects tab
  const tabs = await page.('text=T?ng quan d? án');
  if (tabs.length > 0) {
    await tabs[0].click();
    await page.waitForTimeout(2000);
  }
  await browser.close();
})();
