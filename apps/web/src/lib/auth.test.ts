import { describe, it, expect, beforeEach } from "vitest";
import { readTestAuthFromStorage, TEST_AUTH_TOKEN_KEY, TEST_USER_KEY } from "./auth";

describe("readTestAuthFromStorage", () => {
  beforeEach(() => {
    window.localStorage.setItem("__test_auth_enabled", "true");
    window.localStorage.removeItem(TEST_AUTH_TOKEN_KEY);
    window.localStorage.removeItem(TEST_USER_KEY);
  });

  it("returns null when no test auth is stored", () => {
    expect(readTestAuthFromStorage()).toBeNull();
  });

  it("returns parsed user and token when both items are present", () => {
    window.localStorage.setItem(TEST_AUTH_TOKEN_KEY, "test-token");
    window.localStorage.setItem(
      TEST_USER_KEY,
      JSON.stringify({ id: "user-1", email: "test@example.com" }),
    );
    expect(readTestAuthFromStorage()).toEqual({
      token: "test-token",
      user: { id: "user-1", email: "test@example.com" },
    });
  });

  it("returns null when only the token is stored", () => {
    window.localStorage.setItem(TEST_AUTH_TOKEN_KEY, "test-token");
    expect(readTestAuthFromStorage()).toBeNull();
  });

  it("returns null when only the user is stored", () => {
    window.localStorage.setItem(TEST_USER_KEY, JSON.stringify({ id: "user-1" }));
    expect(readTestAuthFromStorage()).toBeNull();
  });

  it("returns null when the stored user JSON is invalid", () => {
    window.localStorage.setItem(TEST_AUTH_TOKEN_KEY, "test-token");
    window.localStorage.setItem(TEST_USER_KEY, "not-json");
    expect(readTestAuthFromStorage()).toBeNull();
  });

  it("returns null outside of development mode", () => {
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = false;
    window.localStorage.setItem("__test_auth_enabled", "true");
    window.localStorage.setItem(TEST_AUTH_TOKEN_KEY, "test-token");
    window.localStorage.setItem(TEST_USER_KEY, JSON.stringify({ id: "user-1" }));

    expect(readTestAuthFromStorage()).toBeNull();

    import.meta.env.DEV = originalDev;
  });

  it("returns null when test auth is disabled", () => {
    window.localStorage.removeItem("__test_auth_enabled");
    window.localStorage.setItem(TEST_AUTH_TOKEN_KEY, "test-token");
    window.localStorage.setItem(
      TEST_USER_KEY,
      JSON.stringify({ id: "user-1", email: "test@example.com" }),
    );
    expect(readTestAuthFromStorage()).toBeNull();
  });
});
