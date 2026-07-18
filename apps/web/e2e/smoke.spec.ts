import { test, expect } from "@playwright/test";

test("sign-in page renders", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await expect(page.locator("text=ChatGPT Clone").first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator("text=Sign in with Google").first()).toBeVisible({ timeout: 5000 });

  expect(errors).toEqual([]);
});
