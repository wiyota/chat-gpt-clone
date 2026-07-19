import { test, expect } from "@playwright/test";

interface MockConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

async function fillChatInput(page: import("@playwright/test").Page, value: string) {
  const input = page.locator("textarea[placeholder='Message...']");
  await input.click();
  await input.fill("");
  await page.keyboard.type(value, { delay: 10 });
  await input.blur();
}

async function submitChatForm(page: import("@playwright/test").Page) {
  await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
}

test.describe("quota exceeded", () => {
  test("shows a budget exceeded error when the server returns 429", async ({ page }) => {
    const conversations: MockConversation[] = [];

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

      if (url.pathname === "/api/chat" && method === "POST") {
        return route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Daily token budget exceeded",
            code: "quota_exceeded",
            todayUsage: 9500,
            budget: 10000,
          }),
        });
      }

      if (url.pathname.match(/^\/api\/conversations\/[^/]+\/messages$/) && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ messages: [] }),
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

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      const text = msg.text();
      // Ignore expected 429 network error logs; we only care about runtime exceptions.
      if (msg.type() === "error" && !text.includes("429")) {
        errors.push(text);
      }
    });

    await fillChatInput(page, "Hit the limit");
    await submitChatForm(page);

    // Wait for the error banner to appear.
    await expect(page.locator("text=Daily token budget exceeded").first()).toBeVisible({
      timeout: 10000,
    });

    expect(errors).toEqual([]);
  });
});
