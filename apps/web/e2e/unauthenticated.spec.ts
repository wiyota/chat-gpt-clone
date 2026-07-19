import { test, expect } from "@playwright/test";

test("shows the sign-in screen for unauthenticated users", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");

  await expect(page.locator("text=ChatGPT Clone").first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator("text=Sign in with Google").first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator("[data-testid='chat-pane']")).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("does not render the chat input without authentication", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("[data-testid='chat-input']")).toHaveCount(0);
  await expect(page.locator("text=New chat")).toHaveCount(0);
});
