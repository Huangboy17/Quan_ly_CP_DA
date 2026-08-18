import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(2000);
  try {
    await page.locator('text=Tổng quan dự án').click();
    await page.waitForTimeout(2000);
  } catch (e) {}
  await browser.close();
})();
