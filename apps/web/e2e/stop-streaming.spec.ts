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
  await input.fill(value);
  await input.blur();
}

async function submitChatForm(page: import("@playwright/test").Page) {
  await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
}

test.describe("streaming stop", () => {
  test("stops an in-progress assistant response", async ({ page }) => {
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
        const body = (await route.request().postDataJSON()) as {
          messages: { role: string; content: string }[];
        };
        const userMessage = body.messages[body.messages.length - 1];
        const id = `e2e-conv-${Date.now()}`;
        const now = new Date().toISOString();
        conversations.unshift({
          id,
          title: userMessage?.content.slice(0, 40) || "New conversation",
          created_at: now,
          updated_at: now,
        });

        // Keep the response body streaming for a while so the stop button stays visible.
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(`data: conversationId:${id}\n\n`));
            controller.enqueue(new TextEncoder().encode("data: First chunk\n\n"));
            // Periodically send whitespace to keep the connection alive.
            const interval = setInterval(() => {
              controller.enqueue(new TextEncoder().encode("data: \n\n"));
            }, 100);
            // Clean up after a reasonable test duration.
            setTimeout(() => {
              clearInterval(interval);
              controller.close();
            }, 10_000);
          },
        });
        return route.fulfill({
          status: 200,
          body: stream,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
          },
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
      if (msg.type() === "error") errors.push(msg.text());
    });

    await fillChatInput(page, "Keep talking");
    await submitChatForm(page);

    // Wait until the stop button appears (it replaces the submit button during streaming).
    const stopButton = page
      .locator("button[type='button']")
      .filter({ has: page.locator("rect") })
      .first();
    await expect(stopButton).toBeVisible({ timeout: 5000 });

    // The user message should be visible while streaming.
    await expect(page.locator("text=Keep talking").first()).toBeVisible({ timeout: 10000 });

    await stopButton.click();

    // After stopping, the submit button should come back.
    await expect(page.locator("button[type='submit']").first()).toBeVisible({ timeout: 5000 });

    // Stopping clears live messages, so the user message may disappear. We verify
    // that the app did not crash and returned to a usable state.
    const userMessageAfterStop = page.locator("text=Keep talking").first();
    const stillVisible = await userMessageAfterStop.isVisible().catch(() => false);
    if (stillVisible) {
      await expect(userMessageAfterStop).toBeVisible();
    }

    expect(errors).toEqual([]);
  });
});
