import { test, expect } from '@playwright/test';

test('application loads with title and branding', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Expect title to contain the company name
  await expect(page).toHaveTitle(/ANAND BUILDERS/i);

  // Expect main root container to be visible
  await expect(page.locator('#root')).toBeVisible();
});

test('navigation bar and company header render correctly', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Check that the body is rendered
  await expect(page.locator('body')).toBeVisible();

  // Check navigation is present
  await expect(page.getByRole('navigation')).toBeVisible();
});

