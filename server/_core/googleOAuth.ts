import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

const GOOGLE_STATE_COOKIE = "__Host-google_oauth_state";
const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function secureRequest(req: Request) {
  return getSessionCookieOptions(req).secure;
}

function sameSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function buildGoogleAuthorizationUrl(state: string) {
  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.searchParams.set("client_id", ENV.googleClientId);
  url.searchParams.set("redirect_uri", ENV.googleRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

function googleCookieOptions(req: Request) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: secureRequest(req),
    maxAge: 10 * 60 * 1000,
  };
}

function isConfigured() {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret && ENV.googleRedirectUri);
}

export function registerGoogleOAuthRoutes(app: Express) {
  app.get("/api/auth/google/status", (_req: Request, res: Response) => {
    res.json({ configured: isConfigured() });
  });

  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!isConfigured()) {
      res.redirect(302, "/login?google_modal=1");
      return;
    }
    const state = randomUUID();
    res.cookie(GOOGLE_STATE_COOKIE, state, googleCookieOptions(req));
    res.redirect(302, buildGoogleAuthorizationUrl(state));
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    if (!isConfigured()) {
      res.status(503).json({ error: "Google OAuth is not configured" });
      return;
    }

    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const expectedState = parseCookieHeader(req.headers.cookie ?? "")[GOOGLE_STATE_COOKIE];
    res.clearCookie(GOOGLE_STATE_COOKIE, googleCookieOptions(req));

    if (!code || !state || !expectedState || !sameSecret(state, expectedState)) {
      res.status(403).json({ error: "Invalid Google OAuth state" });
      return;
    }

    try {
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: ENV.googleRedirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenResponse.ok) throw new Error(`Google token exchange failed: ${tokenResponse.status}`);
      const token = await tokenResponse.json() as { access_token?: string };
      if (!token.access_token) throw new Error("Google token response did not include an access token");

      const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!profileResponse.ok) throw new Error(`Google profile request failed: ${profileResponse.status}`);
      const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
      if (!profile.sub || !profile.email || profile.email_verified === false) throw new Error("Google profile is missing a verified identity");

      const openId = `google:${profile.sub}`;
      await db.upsertUser({
        openId,
        name: profile.name ?? profile.email,
        email: profile.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: profile.name ?? profile.email,
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.redirect(302, "/dashboard");
    } catch (error) {
      console.error("[Google OAuth] Callback failed", error);
      res.redirect(302, "/login?error=google_oauth");
    }
  });
}

export { GOOGLE_STATE_COOKIE };
