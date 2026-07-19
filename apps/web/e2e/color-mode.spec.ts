import { test, expect } from "@playwright/test";

test.describe("color mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addInitScript(() => {
      window.localStorage.setItem("__test_auth_token", "e2e-token");
      window.localStorage.setItem(
        "__test_user",
        JSON.stringify({ id: "e2e-user", email: "e2e@example.com" }),
      );
      window.localStorage.removeItem("color-mode");
    });

    await page.goto("/");
    await expect(page.locator("[data-testid='chat-pane']").first()).toBeVisible({ timeout: 10000 });
  });

  test("switches to dark mode from the sidebar", async ({ page }) => {
    await page.locator("text=e2e@example.com").first().click();

    // Wait for the dropdown content to render.
    await expect(page.locator("text=Sign out").first()).toBeVisible({ timeout: 5000 });

    const darkToggle = page.locator("button").filter({ hasText: /^$/ }).nth(2);
    await expect(darkToggle).toBeVisible({ timeout: 5000 });
    await darkToggle.click();

    await expect(page.locator("html")).toHaveAttribute("data-kb-theme", "dark");

    const colorMode = await page.evaluate(() => window.localStorage.getItem("color-mode"));
    expect(colorMode).toBe("dark");
  });

  test("switches back to light mode from the sidebar", async ({ page }) => {
    await page.locator("text=e2e@example.com").first().click();

    // Wait for the dropdown content to render.
    await expect(page.locator("text=Sign out").first()).toBeVisible({ timeout: 5000 });

    const darkToggle = page.locator("button").filter({ hasText: /^$/ }).nth(2);
    await expect(darkToggle).toBeVisible({ timeout: 5000 });
    await darkToggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-kb-theme", "dark");

    const lightToggle = page.locator("button").filter({ hasText: /^$/ }).nth(1);
    await lightToggle.click();

    await expect(page.locator("html")).not.toHaveAttribute("data-kb-theme", "dark");

    const colorMode = await page.evaluate(() => window.localStorage.getItem("color-mode"));
    expect(colorMode).toBe("light");
  });

  test("starts in light mode by default", async ({ page }) => {
    const theme = await page.locator("html").getAttribute("data-kb-theme");
    expect(theme).not.toBe("dark");
  });
});
