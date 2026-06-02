import { expect, test } from "@playwright/test";

test("renders all submission modes", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /evidence-first claim analysis/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /url/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /text/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /image/i })).toBeVisible();

  await page.getByRole("button", { name: /text/i }).click();
  await expect(page.getByLabel(/raw text/i)).toBeVisible();

  await page.getByRole("button", { name: /image/i }).click();
  await expect(page.getByText(/select image/i)).toBeVisible();
});

