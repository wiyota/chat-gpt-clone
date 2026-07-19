import { test, expect } from "@playwright/test";

export interface MockConversation {
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

test.describe.configure({ mode: "serial" });

test.describe("authenticated conversations", () => {
  const conversations: MockConversation[] = [];

  test.beforeEach(async ({ page }) => {
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
        const title = userMessage?.content.slice(0, 40) || "New conversation";
        const id = `e2e-conv-${Date.now()}`;
        const now = new Date().toISOString();
        conversations.unshift({ id, title, created_at: now, updated_at: now });

        const sseBody = [
          `data: conversationId:${id}\n\n`,
          "data: Mock response\n\n",
          "data: [DONE]\n\n",
        ].join("");
        return route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: sseBody,
        });
      }

      const titleMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)\/title$/);
      if (titleMatch && method === "POST") {
        const id = titleMatch[1];
        const body = (await route.request().postDataJSON()) as { title?: string };
        const conversation = conversations.find((c) => c.id === id);
        if (conversation && body.title) {
          conversation.title = body.title;
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ title: body.title ?? "New conversation" }),
        });
      }

      const deleteMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)$/);
      if (deleteMatch && method === "DELETE") {
        const id = deleteMatch[1];
        const index = conversations.findIndex((c) => c.id === id);
        if (index >= 0) {
          conversations.splice(index, 1);
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }

      const messagesMatch = url.pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
      if (messagesMatch && method === "GET") {
        const id = messagesMatch[1];
        const conversation = conversations.find((c) => c.id === id);
        const messages = conversation
          ? [
              { role: "user", content: conversation.title },
              { role: "assistant", content: "Mock response" },
            ]
          : [];
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ messages }),
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
  });

  test("send a message and see the assistant response", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await fillChatInput(page, "Hello, assistant");
    await submitChatForm(page);

    await expect(page.locator("text=Hello, assistant").first()).toBeVisible();
    await expect(page.locator("text=Mock response").first()).toBeVisible({ timeout: 10000 });
    expect(errors).toEqual([]);
  });

  test("new conversation appears in the sidebar", async ({ page }) => {
    await fillChatInput(page, "New conversation test");
    await submitChatForm(page);

    await expect(page.locator("text=Mock response").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=New conversation test").first()).toBeVisible();
  });

  test("rename a conversation", async ({ page }) => {
    await fillChatInput(page, "Rename me");
    await submitChatForm(page);
    await expect(page.locator("text=Rename me").first()).toBeVisible();
    await expect(page.locator("[data-testid='conversation-title']").first()).toHaveText(
      "Rename me",
      {
        timeout: 10000,
      },
    );

    const settingsButton = page.locator("[data-testid='conversation-settings']").first();
    await settingsButton.click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.locator("input[placeholder='Conversation title']").fill("Renamed chat");
    await page.locator("button:has-text('Save')").click();

    await expect(page.locator("[data-testid='conversation-title']").first()).toHaveText(
      "Renamed chat",
      {
        timeout: 10000,
      },
    );
  });

  test("delete a conversation", async ({ page }) => {
    await fillChatInput(page, "Delete me");
    await submitChatForm(page);
    await expect(page.locator("text=Delete me").first()).toBeVisible();
    await expect(page.locator("[data-testid='conversation-title']").first()).toHaveText(
      "Delete me",
      {
        timeout: 10000,
      },
    );

    const settingsButton = page.locator("[data-testid='conversation-settings']").first();
    await settingsButton.click();
    await page.locator("text=Remove").click();

    await expect(page.locator("text=Delete me").first()).not.toBeVisible();
  });
});
