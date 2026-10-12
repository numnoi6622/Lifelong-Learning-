import { describe, expect, it } from "vitest";
import { buildGoogleAuthorizationUrl } from "./_core/googleOAuth";

 describe("Google OAuth", () => {
  it("builds an authorization URL with safe OAuth parameters", () => {
    const url = new URL(buildGoogleAuthorizationUrl("test-state"));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.pathname).toBe("/o/oauth2/v2/auth");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("test-state");
    expect(url.searchParams.get("prompt")).toBe("select_account");
  });
});
