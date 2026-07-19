import { test, expect } from "@playwright/test";

test.describe("new chat", () => {
  test("resets the active conversation when New chat is clicked", async ({ page }) => {
    const conversations: { id: string; title: string; created_at: string; updated_at: string }[] = [
      {
        id: "conv-1",
        title: "Existing conversation",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
    ];

    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (url.pathname === "/api/conversations" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ conversations: [...conversations] }),
        });
      }

      if (url.pathname.match(/^\/api\/conversations\/[^/]+\/messages$/) && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            messages: [
              { role: "user", content: "Old message", created_at: "2024-01-01T00:00:00Z" },
              { role: "assistant", content: "Old reply", created_at: "2024-01-01T00:00:01Z" },
            ],
          }),
        });
      }

      await route.continue();
    });

    await page.context().addInitScript(() => {
      window.localStorage.setItem("__test_auth_token", "e2e-token");
      window.localStorage.setItem(
        "__test_user",
        JSON.stringify({ id: "e2e-user", email: "e2e@example.com" }),
      );
    });

    await page.goto("/");
    await expect(page.locator("[data-testid='chat-pane']").first()).toBeVisible({ timeout: 10000 });

    // Select the existing conversation.
    await page.locator("text=Existing conversation").first().click();
    await expect(page.locator("text=Old message").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Old reply").first()).toBeVisible({ timeout: 10000 });

    // Click New chat and verify the old messages disappear.
    await page.locator("text=New chat").first().click();

    await expect(page.locator("text=Old message").first()).not.toBeVisible();
    await expect(page.locator("text=Old reply").first()).not.toBeVisible();
    await expect(page.locator("textarea[placeholder='Message...']").first()).toBeVisible();
  });
});
