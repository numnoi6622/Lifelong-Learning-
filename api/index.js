// server/_core/app.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID || "ubu-academy-portal",
  cookieSecret: process.env.JWT_SECRET || "ubu-academy-rmutl-secret-key-2026-safe-token",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? ""
};

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  shortDescription: text("shortDescription").notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  duration: varchar("duration", { length: 100 }).notNull(),
  mode: varchar("mode", { length: 100 }).notNull(),
  tuition: int("tuition").notNull().default(0),
  imageUrl: varchar("imageUrl", { length: 500 }),
  nextStartAt: timestamp("nextStartAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  courseId: int("courseId").notNull(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  occupation: varchar("occupation", { length: 150 }),
  experience: text("experience"),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "reviewing", "accepted", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var enrollments = mysqlTable("enrollments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  status: mysqlEnum("status", ["enrolled", "completed", "paused"]).default("enrolled").notNull(),
  progress: int("progress").default(0).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt")
});
var events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startAt: timestamp("startAt").notNull(),
  endAt: timestamp("endAt"),
  location: varchar("location", { length: 255 }),
  type: varchar("type", { length: 80 }).default("\u0E01\u0E34\u0E08\u0E01\u0E23\u0E23\u0E21").notNull()
});

// server/db.ts
var _db = null;
var memoryUsers = /* @__PURE__ */ new Map();
var nextUserId = 1;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    const existing = memoryUsers.get(user.openId);
    const now = /* @__PURE__ */ new Date();
    if (existing) {
      existing.name = user.name ?? existing.name;
      existing.email = user.email ?? existing.email;
      existing.loginMethod = user.loginMethod ?? existing.loginMethod;
      existing.lastSignedIn = user.lastSignedIn ?? now;
      existing.updatedAt = now;
      if (user.role) existing.role = user.role;
    } else {
      memoryUsers.set(user.openId, {
        id: nextUserId++,
        openId: user.openId,
        name: user.name ?? null,
        email: user.email ?? null,
        loginMethod: user.loginMethod ?? null,
        role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
        createdAt: now,
        updatedAt: now,
        lastSignedIn: user.lastSignedIn ?? now
      });
    }
    return;
  }
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod"];
  for (const field of textFields) {
    if (user[field] !== void 0) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? /* @__PURE__ */ new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return memoryUsers.get(openId);
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function listCourses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).orderBy(desc(courses.createdAt));
}
async function getCourseBySlug(slug) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  return result[0];
}
async function listEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).orderBy(events.startAt);
}
async function createApplication(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.insert(applications).values(input);
}
async function getDashboardData(userId) {
  const db = await getDb();
  if (!db) return { applications: [], enrollments: [], events: [] };
  const [userApplications, userEnrollments, upcomingEvents] = await Promise.all([
    db.select({ application: applications, course: courses }).from(applications).leftJoin(courses, eq(applications.courseId, courses.id)).where(eq(applications.userId, userId)).orderBy(desc(applications.createdAt)),
    db.select({ enrollment: enrollments, course: courses }).from(enrollments).leftJoin(courses, eq(enrollments.courseId, courses.id)).where(eq(enrollments.userId, userId)).orderBy(desc(enrollments.startedAt)),
    db.select().from(events).orderBy(events.startAt)
  ]);
  return { applications: userApplications, enrollments: userEnrollments, events: upcomingEvents };
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId: typeof appId === "string" ? appId : "ubu-academy-portal",
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      if (sessionUserId.startsWith("google:")) {
        const email = sessionUserId.slice("google:".length);
        await upsertUser({
          openId: sessionUserId,
          name: session.name || email.split("@")[0],
          email,
          loginMethod: "google",
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(sessionUserId);
      } else {
        try {
          const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
          await upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            lastSignedIn: signedInAt
          });
          user = await getUserByOpenId(userInfo.openId);
        } catch (error) {
          await upsertUser({
            openId: sessionUserId,
            name: session.name || "\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19",
            email: sessionUserId.includes("@") ? sessionUserId : null,
            loginMethod: "session",
            lastSignedIn: signedInAt
          });
          user = await getUserByOpenId(sessionUserId);
        }
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/googleOAuth.ts
import { randomUUID, timingSafeEqual } from "node:crypto";
import { parse as parseCookieHeader3 } from "cookie";
var GOOGLE_STATE_COOKIE = "__Host-google_oauth_state";
var GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
var GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
function getQueryParam2(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function secureRequest(req) {
  return getSessionCookieOptions(req).secure;
}
function sameSecret(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function buildGoogleAuthorizationUrl(state) {
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
function googleCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: secureRequest(req),
    maxAge: 10 * 60 * 1e3
  };
}
function isConfigured() {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret && ENV.googleRedirectUri);
}
function registerGoogleOAuthRoutes(app2) {
  app2.get("/api/auth/google/status", (_req, res) => {
    res.json({ configured: isConfigured() });
  });
  app2.get("/api/auth/google", (req, res) => {
    if (!isConfigured()) {
      res.redirect(302, "/login?google_modal=1");
      return;
    }
    const state = randomUUID();
    res.cookie(GOOGLE_STATE_COOKIE, state, googleCookieOptions(req));
    res.redirect(302, buildGoogleAuthorizationUrl(state));
  });
  app2.get("/api/auth/google/callback", async (req, res) => {
    if (!isConfigured()) {
      res.status(503).json({ error: "Google OAuth is not configured" });
      return;
    }
    const code = getQueryParam2(req, "code");
    const state = getQueryParam2(req, "state");
    const expectedState = parseCookieHeader3(req.headers.cookie ?? "")[GOOGLE_STATE_COOKIE];
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
          grant_type: "authorization_code"
        })
      });
      if (!tokenResponse.ok) throw new Error(`Google token exchange failed: ${tokenResponse.status}`);
      const token = await tokenResponse.json();
      if (!token.access_token) throw new Error("Google token response did not include an access token");
      const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      if (!profileResponse.ok) throw new Error(`Google profile request failed: ${profileResponse.status}`);
      const profile = await profileResponse.json();
      if (!profile.sub || !profile.email || profile.email_verified === false) throw new Error("Google profile is missing a verified identity");
      const openId = `google:${profile.sub}`;
      await upsertUser({
        openId,
        name: profile.name ?? profile.email,
        email: profile.email,
        loginMethod: "google",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(openId, {
        name: profile.name ?? profile.email,
        expiresInMs: ONE_YEAR_MS
      });
      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS
      });
      res.redirect(302, "/dashboard");
    } catch (error) {
      console.error("[Google OAuth] Callback failed", error);
      res.redirect(302, "/login?error=google_oauth");
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { z as z2 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
var fallbackCourses = [
  {
    id: 1,
    slug: "ev-charger-installation",
    title: "\u0E01\u0E32\u0E23\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E15\u0E39\u0E49\u0E0A\u0E32\u0E23\u0E4C\u0E08\u0E23\u0E16\u0E44\u0E1F\u0E1F\u0E49\u0E32 (EV Charger Installation)",
    shortDescription: "\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E01\u0E32\u0E23\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07 \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A \u0E41\u0E25\u0E30\u0E1A\u0E33\u0E23\u0E38\u0E07\u0E23\u0E31\u0E01\u0E29\u0E32\u0E15\u0E39\u0E49\u0E0A\u0E32\u0E23\u0E4C\u0E08\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C\u0E44\u0E1F\u0E1F\u0E49\u0E32 AC/DC Wallbox \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E1D\u0E36\u0E01\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E40\u0E14\u0E34\u0E19\u0E2A\u0E32\u0E22\u0E41\u0E25\u0E30\u0E23\u0E30\u0E1A\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E08\u0E23\u0E34\u0E07",
    description: `\u0E2B\u0E25\u0E31\u0E01\u0E2A\u0E39\u0E15\u0E23\u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E0A\u0E48\u0E32\u0E07\u0E44\u0E1F\u0E1F\u0E49\u0E32 \u0E27\u0E34\u0E28\u0E27\u0E01\u0E23 \u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E01\u0E49\u0E32\u0E27\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E18\u0E38\u0E23\u0E01\u0E34\u0E08\u0E41\u0E25\u0E30\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E2A\u0E16\u0E32\u0E19\u0E35\u0E0A\u0E32\u0E23\u0E4C\u0E08\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C\u0E44\u0E1F\u0E1F\u0E49\u0E32\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E32\u0E21\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E2A\u0E32\u0E01\u0E25\u0E41\u0E25\u0E30\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E44\u0E1F\u0E1F\u0E49\u0E32\u0E44\u0E17\u0E22 (PEA/MEA)

\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2B\u0E32\u0E01\u0E32\u0E23\u0E2D\u0E1A\u0E23\u0E21\u0E40\u0E02\u0E49\u0E21\u0E02\u0E49\u0E19 3 \u0E27\u0E31\u0E19 (24 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07):
\u2022 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 1: \u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E01\u0E32\u0E23\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22
  - \u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E2B\u0E31\u0E27\u0E0A\u0E32\u0E23\u0E4C\u0E08\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E08\u0E48\u0E32\u0E22\u0E44\u0E1F: Level 1, Level 2, DC Fast Charging
  - \u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E2A\u0E32\u0E01\u0E25 IEC 61851 & IEC 62196 \u0E41\u0E25\u0E30\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E31\u0E13\u0E11\u0E4C\u0E2D\u0E38\u0E15\u0E2A\u0E32\u0E2B\u0E01\u0E23\u0E23\u0E21 (TISI)
  - \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E04\u0E38\u0E49\u0E21\u0E04\u0E23\u0E2D\u0E07\u0E04\u0E27\u0E32\u0E21\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E2A\u0E48\u0E27\u0E19\u0E1A\u0E38\u0E04\u0E04\u0E25 (PPE) \u0E41\u0E25\u0E30\u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E04\u0E27\u0E32\u0E21\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22
  - \u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48 \u0E2A\u0E33\u0E23\u0E27\u0E08\u0E2B\u0E19\u0E49\u0E32\u0E07\u0E32\u0E19 \u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E27\u0E32\u0E07\u0E41\u0E1C\u0E19\u0E1C\u0E31\u0E07\u0E01\u0E32\u0E23\u0E40\u0E14\u0E34\u0E19\u0E2A\u0E32\u0E22

\u2022 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 2: \u0E2D\u0E31\u0E1B\u0E40\u0E01\u0E23\u0E14\u0E21\u0E34\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E41\u0E25\u0E30\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E1F\u0E1F\u0E49\u0E32
  - \u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E1F\u0E1F\u0E49\u0E32 1 \u0E40\u0E1F\u0E2A \u0E41\u0E25\u0E30 3 \u0E40\u0E1F\u0E2A \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E15\u0E39\u0E49\u0E0A\u0E32\u0E23\u0E4C\u0E08\u0E1A\u0E49\u0E32\u0E19\u0E41\u0E25\u0E30\u0E40\u0E0A\u0E34\u0E07\u0E1E\u0E32\u0E13\u0E34\u0E0A\u0E22\u0E4C
  - \u0E01\u0E32\u0E23\u0E04\u0E33\u0E19\u0E27\u0E13\u0E02\u0E19\u0E32\u0E14\u0E42\u0E2B\u0E25\u0E14\u0E41\u0E25\u0E30\u0E02\u0E19\u0E32\u0E14\u0E2B\u0E21\u0E49\u0E2D\u0E41\u0E1B\u0E25\u0E07\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E21\u0E32\u0E30\u0E2A\u0E21
  - \u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E01\u0E32\u0E23\u0E02\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E02\u0E19\u0E32\u0E14\u0E21\u0E34\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E2B\u0E23\u0E37\u0E2D\u0E02\u0E2D\u0E21\u0E34\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E17\u0E35\u0E48 2 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A EV (TOU Tariff)
  - \u0E01\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E02\u0E19\u0E32\u0E14\u0E2A\u0E32\u0E22\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25 \u0E17\u0E48\u0E2D\u0E23\u0E49\u0E2D\u0E22\u0E2A\u0E32\u0E22 \u0E41\u0E25\u0E30 Circuit Breaker

\u2022 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 3: \u0E01\u0E32\u0E23\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E15\u0E39\u0E49\u0E0A\u0E32\u0E23\u0E4C\u0E08 \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19 \u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E23\u0E31\u0E1A\u0E23\u0E2D\u0E07
  - \u0E01\u0E32\u0E23\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E15\u0E39\u0E49 Wallbox \u0E41\u0E25\u0E30\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19\u0E01\u0E23\u0E30\u0E41\u0E2A\u0E44\u0E1F\u0E1F\u0E49\u0E32\u0E23\u0E31\u0E48\u0E27 (RCD Type B / Type A+DC)
  - \u0E01\u0E32\u0E23\u0E15\u0E34\u0E14\u0E15\u0E31\u0E49\u0E07\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19\u0E44\u0E1F\u0E01\u0E23\u0E30\u0E0A\u0E32\u0E01 (Surge Protection Device - SPD)
  - \u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D\u0E23\u0E30\u0E1A\u0E1A\u0E25\u0E07\u0E14\u0E34\u0E19 (Grounding Rod) \u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E27\u0E31\u0E14\u0E04\u0E48\u0E32\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E32\u0E19\u0E17\u0E32\u0E19\u0E14\u0E34\u0E19
  - \u0E01\u0E32\u0E23\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E17\u0E33\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E15\u0E39\u0E49\u0E0A\u0E32\u0E23\u0E4C\u0E08\u0E08\u0E33\u0E25\u0E2D\u0E07 (Commissioning & Functional Test)
  - \u0E01\u0E32\u0E23\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E41\u0E25\u0E30\u0E41\u0E01\u0E49\u0E44\u0E02\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E15\u0E39\u0E49\u0E0A\u0E32\u0E23\u0E4C\u0E08 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E2D\u0E1A\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E20\u0E32\u0E04\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34`,
    category: "\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35\u0E41\u0E25\u0E30\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19",
    duration: "3 \u0E27\u0E31\u0E19 (24 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07)",
    mode: "On-site + \u0E20\u0E32\u0E04\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34",
    tuition: 3500,
    imageUrl: "/assets/ev-training/banner.png",
    nextStartAt: /* @__PURE__ */ new Date("2026-10-20T09:00:00Z")
  },
  {
    id: 2,
    slug: "ev-repair-maintenance",
    title: "\u0E2B\u0E25\u0E31\u0E01\u0E2A\u0E39\u0E15\u0E23\u0E0A\u0E48\u0E32\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E23\u0E16\u0E44\u0E1F\u0E1F\u0E49\u0E32 (EV Repair & Maintenance Program)",
    shortDescription: "\u0E2B\u0E25\u0E31\u0E01\u0E2A\u0E39\u0E15\u0E23\u0E2D\u0E1A\u0E23\u0E21 5 \u0E27\u0E31\u0E19 (30 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07) \u0E20\u0E32\u0E04\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E08\u0E23\u0E34\u0E07 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E0A\u0E48\u0E32\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E2A\u0E19\u0E43\u0E08 \u0E04\u0E23\u0E2D\u0E1A\u0E04\u0E25\u0E38\u0E21\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E1F\u0E41\u0E23\u0E07\u0E2A\u0E39\u0E07 \u0E41\u0E1A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E35\u0E48 \u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C \u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E27\u0E34\u0E19\u0E34\u0E08\u0E09\u0E31\u0E22\u0E14\u0E49\u0E27\u0E22 OBD-EV",
    description: `\u0E2B\u0E25\u0E31\u0E01\u0E2A\u0E39\u0E15\u0E23\u0E1D\u0E36\u0E01\u0E2D\u0E1A\u0E23\u0E21\u0E40\u0E0A\u0E34\u0E07\u0E25\u0E36\u0E01 30 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07 5 \u0E27\u0E31\u0E19 \u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E0A\u0E48\u0E32\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C \u0E0A\u0E48\u0E32\u0E07\u0E40\u0E17\u0E04\u0E19\u0E34\u0E04 \u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E2A\u0E19\u0E43\u0E08\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E22\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E17\u0E31\u0E01\u0E29\u0E30\u0E2A\u0E39\u0E48\u0E01\u0E32\u0E23\u0E14\u0E39\u0E41\u0E25\u0E41\u0E25\u0E30\u0E0B\u0E48\u0E2D\u0E21\u0E1A\u0E33\u0E23\u0E38\u0E07\u0E22\u0E32\u0E19\u0E22\u0E19\u0E15\u0E4C\u0E44\u0E1F\u0E1F\u0E49\u0E32 (BEV/PHEV) \u0E08\u0E32\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E27\u0E34\u0E08\u0E31\u0E22\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E08\u0E23\u0E34\u0E07

\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E2B\u0E25\u0E31\u0E01\u0E2A\u0E39\u0E15\u0E23 5 \u0E27\u0E31\u0E19 (\u0E27\u0E31\u0E19\u0E25\u0E30 6 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07):
\u2022 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 1: \u0E04\u0E27\u0E32\u0E21\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E44\u0E1F\u0E41\u0E23\u0E07\u0E2A\u0E39\u0E07 (High Voltage Safety)
  - \u0E17\u0E33\u0E04\u0E27\u0E32\u0E21\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E1F\u0E41\u0E23\u0E07\u0E14\u0E31\u0E19\u0E2A\u0E39\u0E07\u0E43\u0E19\u0E23\u0E16\u0E44\u0E1F\u0E1F\u0E49\u0E32 (200 - 400V DC)
  - \u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19\u0E04\u0E27\u0E32\u0E21\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 ISO 6469 & ISO 13849
  - \u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19\u0E2A\u0E48\u0E27\u0E19\u0E1A\u0E38\u0E04\u0E04\u0E25 (PPE Class 0/00)
  - \u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E01\u0E32\u0E23\u0E15\u0E31\u0E14\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E1F (Lockout/Tagout & Manual Service Disconnect)
  - \u0E01\u0E32\u0E23\u0E1B\u0E10\u0E21\u0E1E\u0E22\u0E32\u0E1A\u0E32\u0E25\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E16\u0E32\u0E19\u0E01\u0E32\u0E23\u0E13\u0E4C\u0E09\u0E38\u0E01\u0E40\u0E09\u0E34\u0E19\u0E44\u0E1F\u0E1F\u0E49\u0E32\u0E41\u0E23\u0E07\u0E2A\u0E39\u0E07

\u2022 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 2: \u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E1A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E35\u0E48\u0E41\u0E23\u0E07\u0E14\u0E31\u0E19\u0E2A\u0E39\u0E07\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E1A\u0E33\u0E23\u0E38\u0E07\u0E23\u0E31\u0E01\u0E29\u0E32 (Traction Battery & BMS)
  - \u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E25\u0E30\u0E40\u0E04\u0E21\u0E35\u0E40\u0E0B\u0E25\u0E25\u0E4C\u0E41\u0E1A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E35\u0E48: Li-ion, Li-Po, LFP
  - \u0E23\u0E30\u0E1A\u0E1A\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E41\u0E1A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E35\u0E48 (Battery Management System - BMS)
  - \u0E40\u0E17\u0E04\u0E19\u0E34\u0E04\u0E01\u0E32\u0E23\u0E27\u0E34\u0E19\u0E34\u0E08\u0E09\u0E31\u0E22 \u0E15\u0E23\u0E27\u0E08\u0E40\u0E0A\u0E47\u0E01\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E\u0E41\u0E1A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E35\u0E48 (State of Health - SOH / SOC)
  - \u0E01\u0E32\u0E23\u0E1B\u0E23\u0E31\u0E1A\u0E2A\u0E21\u0E14\u0E38\u0E25\u0E41\u0E23\u0E07\u0E14\u0E31\u0E19\u0E40\u0E0B\u0E25\u0E25\u0E4C (Cell Balancing) \u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E41\u0E23\u0E07\u0E14\u0E31\u0E19\u0E15\u0E01\u0E04\u0E23\u0E48\u0E2D\u0E21
  - \u0E02\u0E49\u0E2D\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E04\u0E27\u0E32\u0E21\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E34\u0E14\u0E0B\u0E48\u0E2D\u0E21\u0E41\u0E25\u0E30\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E42\u0E21\u0E14\u0E39\u0E25\u0E41\u0E1A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E35\u0E48

\u2022 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 3: \u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E44\u0E1F\u0E1F\u0E49\u0E32\u0E41\u0E25\u0E30\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E02\u0E31\u0E1A\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19 (Electric Motor & Inverter)
  - \u0E2B\u0E25\u0E31\u0E01\u0E01\u0E32\u0E23\u0E17\u0E33\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07 AC Induction Motor \u0E41\u0E25\u0E30 Permanent Magnet Synchronous Motor (PMSM)
  - \u0E01\u0E32\u0E23\u0E17\u0E33\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07 Inverter / Converter \u0E41\u0E25\u0E30\u0E0A\u0E38\u0E14\u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21\u0E01\u0E32\u0E23\u0E02\u0E31\u0E1A\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19
  - \u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E1A\u0E23\u0E01\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19\u0E22\u0E49\u0E2D\u0E19\u0E01\u0E25\u0E31\u0E1A (Regenerative Braking)
  - \u0E01\u0E32\u0E23\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E2D\u0E32\u0E01\u0E32\u0E23\u0E1C\u0E34\u0E14\u0E1B\u0E01\u0E15\u0E34 \u0E40\u0E2A\u0E35\u0E22\u0E07 \u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E2A\u0E31\u0E48\u0E19\u0E2A\u0E30\u0E40\u0E17\u0E37\u0E2D\u0E19\u0E02\u0E2D\u0E07\u0E0A\u0E38\u0E14\u0E02\u0E31\u0E1A\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19
  - \u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E1A\u0E33\u0E23\u0E38\u0E07\u0E23\u0E31\u0E01\u0E29\u0E32\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E48\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E40\u0E14\u0E35\u0E48\u0E22\u0E27\u0E41\u0E25\u0E30\u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E04\u0E39\u0E48

\u2022 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 4: \u0E23\u0E30\u0E1A\u0E1A\u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21\u0E2D\u0E34\u0E40\u0E25\u0E47\u0E01\u0E17\u0E23\u0E2D\u0E19\u0E34\u0E01\u0E2A\u0E4C\u0E41\u0E25\u0E30\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E37\u0E2D\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C (Control Units & OBD-EV)
  - \u0E2B\u0E19\u0E48\u0E27\u0E22\u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21\u0E22\u0E32\u0E19\u0E22\u0E19\u0E15\u0E4C (Vehicle Control Unit - VCU, ECU/PCM)
  - \u0E2A\u0E16\u0E32\u0E1B\u0E31\u0E15\u0E22\u0E01\u0E23\u0E23\u0E21\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E02\u0E48\u0E32\u0E22 CAN Bus \u0E41\u0E25\u0E30 LIN Bus \u0E43\u0E19\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C\u0E44\u0E1F\u0E1F\u0E49\u0E32
  - \u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E2A\u0E41\u0E01\u0E19\u0E40\u0E19\u0E2D\u0E23\u0E4C\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E23\u0E30\u0E1A\u0E1A OBD-II \u0E41\u0E25\u0E30 OBD-EV
  - \u0E01\u0E32\u0E23\u0E27\u0E31\u0E14\u0E2A\u0E31\u0E0D\u0E0D\u0E32\u0E13\u0E14\u0E49\u0E27\u0E22 Digital Multimeter \u0E41\u0E25\u0E30 Oscilloscope
  - \u0E01\u0E32\u0E23\u0E2D\u0E48\u0E32\u0E19 \u0E23\u0E2B\u0E31\u0E2A\u0E04\u0E27\u0E32\u0E21\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14 (DTC) \u0E41\u0E25\u0E30\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C Data Stream \u0E41\u0E1A\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E25\u0E44\u0E17\u0E21\u0E4C

\u2022 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 5: \u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E04\u0E27\u0E32\u0E21\u0E23\u0E49\u0E2D\u0E19\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E01\u0E23\u0E13\u0E35\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E08\u0E23\u0E34\u0E07 (Thermal Management & Case Studies)
  - \u0E23\u0E30\u0E1A\u0E1A\u0E23\u0E30\u0E1A\u0E32\u0E22\u0E04\u0E27\u0E32\u0E21\u0E23\u0E49\u0E2D\u0E19\u0E41\u0E1A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E35\u0E48 (Liquid Cooling & Chiller System)
  - \u0E23\u0E30\u0E1A\u0E1A\u0E23\u0E30\u0E1A\u0E32\u0E22\u0E04\u0E27\u0E32\u0E21\u0E23\u0E49\u0E2D\u0E19\u0E2D\u0E34\u0E19\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E41\u0E25\u0E30\u0E21\u0E2D\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E02\u0E31\u0E1A\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19
  - \u0E23\u0E30\u0E1A\u0E1A\u0E1B\u0E23\u0E31\u0E1A\u0E2D\u0E32\u0E01\u0E32\u0E28\u0E1B\u0E31\u0E4A\u0E21\u0E04\u0E27\u0E32\u0E21\u0E23\u0E49\u0E2D\u0E19 (Heat Pump & High-Voltage HVAC)
  - \u0E40\u0E27\u0E34\u0E23\u0E4C\u0E01\u0E0A\u0E47\u0E2D\u0E1B\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E41\u0E25\u0E30\u0E41\u0E01\u0E49\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E08\u0E32\u0E01\u0E40\u0E04\u0E2A\u0E08\u0E23\u0E34\u0E07 (Real Case Studies)
  - \u0E01\u0E32\u0E23\u0E2A\u0E2D\u0E1A\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E20\u0E32\u0E04\u0E17\u0E24\u0E29\u0E0E\u0E35\u0E41\u0E25\u0E30\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E20\u0E32\u0E04\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E08\u0E23\u0E34\u0E07`,
    category: "\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35\u0E41\u0E25\u0E30\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19",
    duration: "30 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07 / 5 \u0E27\u0E31\u0E19",
    mode: "\u0E20\u0E32\u0E04\u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E08\u0E23\u0E34\u0E07 + Workshop",
    tuition: 4900,
    imageUrl: "/assets/ev-training/banner.png",
    nextStartAt: /* @__PURE__ */ new Date("2026-11-10T09:00:00Z")
  },
  {
    id: 3,
    slug: "ev-masterclass-users",
    title: "\u0E04\u0E39\u0E48\u0E21\u0E37\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E23\u0E16\u0E44\u0E1F\u0E1F\u0E49\u0E32\u0E17\u0E35\u0E48\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C (EV Masterclass for Users)",
    shortDescription: "\u0E40\u0E08\u0E32\u0E30\u0E25\u0E36\u0E01\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35\u0E23\u0E16\u0E44\u0E1F\u0E1F\u0E49\u0E32\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B \u0E01\u0E32\u0E23\u0E14\u0E39\u0E41\u0E25\u0E23\u0E31\u0E01\u0E29\u0E32\u0E41\u0E1A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E35\u0E48 \u0E27\u0E34\u0E18\u0E35\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2A\u0E16\u0E32\u0E19\u0E35\u0E0A\u0E32\u0E23\u0E4C\u0E08 \u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E04\u0E27\u0E32\u0E21\u0E04\u0E38\u0E49\u0E21\u0E04\u0E48\u0E32\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07",
    description: `\u0E2B\u0E25\u0E31\u0E01\u0E2A\u0E39\u0E15\u0E23\u0E1E\u0E34\u0E40\u0E28\u0E29 1 \u0E27\u0E31\u0E19 (6 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07) \u0E40\u0E02\u0E49\u0E21\u0E02\u0E49\u0E19 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E23\u0E16\u0E44\u0E1F\u0E1F\u0E49\u0E32 \u0E1C\u0E39\u0E49\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E15\u0E31\u0E27\u0E0B\u0E37\u0E49\u0E2D\u0E23\u0E16 EV \u0E41\u0E25\u0E30\u0E1C\u0E39\u0E49\u0E17\u0E35\u0E48\u0E2A\u0E19\u0E43\u0E08\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35\u0E22\u0E32\u0E19\u0E22\u0E19\u0E15\u0E4C\u0E22\u0E38\u0E04\u0E43\u0E2B\u0E21\u0E48

\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49:
\u2022 \u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E23\u0E16\u0E22\u0E19\u0E15\u0E4C\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48: \u0E04\u0E27\u0E32\u0E21\u0E41\u0E15\u0E01\u0E15\u0E48\u0E32\u0E07\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07 BEV, PHEV \u0E41\u0E25\u0E30 HEV \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E02\u0E49\u0E2D\u0E14\u0E35-\u0E02\u0E49\u0E2D\u0E08\u0E33\u0E01\u0E31\u0E14
\u2022 \u0E01\u0E25\u0E22\u0E38\u0E17\u0E18\u0E4C\u0E01\u0E32\u0E23\u0E16\u0E19\u0E2D\u0E21\u0E41\u0E1A\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E35\u0E48: \u0E1E\u0E24\u0E15\u0E34\u0E01\u0E23\u0E23\u0E21\u0E01\u0E32\u0E23\u0E0A\u0E32\u0E23\u0E4C\u0E08\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E02\u0E35\u0E14\u0E08\u0E33\u0E01\u0E31\u0E14\u0E0A\u0E32\u0E23\u0E4C\u0E08 (80% vs 100%) \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E22\u0E37\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19
\u2022 \u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E32\u0E23\u0E0A\u0E32\u0E23\u0E4C\u0E08: Level 1 (\u0E40\u0E15\u0E49\u0E32\u0E23\u0E31\u0E1A\u0E1A\u0E49\u0E32\u0E19), Level 2 (Wallbox), \u0E41\u0E25\u0E30 DC Fast Charge \u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E35\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23
\u2022 \u0E40\u0E17\u0E04\u0E19\u0E34\u0E04\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E41\u0E2D\u0E1B\u0E1E\u0E25\u0E34\u0E40\u0E04\u0E0A\u0E31\u0E19\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E2A\u0E16\u0E32\u0E19\u0E35\u0E0A\u0E32\u0E23\u0E4C\u0E08\u0E41\u0E25\u0E30\u0E40\u0E04\u0E23\u0E37\u0E2D\u0E02\u0E48\u0E32\u0E22\u0E1C\u0E39\u0E49\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E43\u0E19\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28\u0E44\u0E17\u0E22
\u2022 \u0E01\u0E32\u0E23\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E15\u0E49\u0E19\u0E17\u0E38\u0E19\u0E23\u0E27\u0E21\u0E02\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07 (Total Cost of Ownership: TCO) \u0E04\u0E48\u0E32\u0E1A\u0E33\u0E23\u0E38\u0E07\u0E23\u0E31\u0E01\u0E29\u0E32 \u0E41\u0E25\u0E30\u0E04\u0E48\u0E32\u0E1B\u0E23\u0E30\u0E01\u0E31\u0E19\u0E20\u0E31\u0E22
\u2022 \u0E1B\u0E31\u0E08\u0E08\u0E31\u0E22\u0E17\u0E35\u0E48\u0E2A\u0E48\u0E07\u0E1C\u0E25\u0E15\u0E48\u0E2D\u0E23\u0E30\u0E22\u0E30\u0E17\u0E32\u0E07\u0E02\u0E31\u0E1A\u0E02\u0E35\u0E48\u0E08\u0E23\u0E34\u0E07 (\u0E2A\u0E20\u0E32\u0E1E\u0E2D\u0E32\u0E01\u0E32\u0E28 \u0E04\u0E27\u0E32\u0E21\u0E40\u0E23\u0E47\u0E27 \u0E41\u0E2D\u0E23\u0E4C \u0E42\u0E2B\u0E21\u0E14\u0E01\u0E32\u0E23\u0E02\u0E31\u0E1A) \u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E27\u0E32\u0E07\u0E41\u0E1C\u0E19\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07\u0E44\u0E01\u0E25
\u2022 \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E23\u0E23\u0E30\u0E27\u0E31\u0E07\u0E41\u0E25\u0E30\u0E27\u0E34\u0E18\u0E35\u0E23\u0E31\u0E1A\u0E21\u0E37\u0E2D\u0E40\u0E2B\u0E15\u0E38\u0E09\u0E38\u0E01\u0E40\u0E09\u0E34\u0E19 (\u0E23\u0E16\u0E41\u0E1A\u0E15\u0E2B\u0E21\u0E14\u0E01\u0E25\u0E32\u0E07\u0E17\u0E32\u0E07 \u0E01\u0E32\u0E23\u0E25\u0E38\u0E22\u0E19\u0E49\u0E33\u0E17\u0E48\u0E27\u0E21 \u0E01\u0E32\u0E23\u0E22\u0E01\u0E23\u0E16\u0E25\u0E32\u0E01)`,
    category: "\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35\u0E41\u0E25\u0E30\u0E1E\u0E25\u0E31\u0E07\u0E07\u0E32\u0E19",
    duration: "6 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07 (1 \u0E27\u0E31\u0E19)",
    mode: "On-site + Hybrid",
    tuition: 990,
    imageUrl: "/assets/ev-training/banner.png",
    nextStartAt: /* @__PURE__ */ new Date("2026-10-28T09:00:00Z")
  },
  {
    id: 4,
    slug: "digital-transformation",
    title: "Digital Transformation for Leaders",
    shortDescription: "\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E42\u0E25\u0E01\u0E14\u0E34\u0E08\u0E34\u0E17\u0E31\u0E25\u0E41\u0E25\u0E30\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E41\u0E19\u0E27\u0E04\u0E34\u0E14\u0E43\u0E2B\u0E49\u0E01\u0E25\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E01\u0E32\u0E23\u0E25\u0E07\u0E21\u0E37\u0E2D\u0E17\u0E33",
    description: "\u0E2B\u0E25\u0E31\u0E01\u0E2A\u0E39\u0E15\u0E23\u0E40\u0E02\u0E49\u0E21\u0E02\u0E49\u0E19\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1C\u0E39\u0E49\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E41\u0E25\u0E30\u0E04\u0E19\u0E17\u0E33\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E27\u0E32\u0E07\u0E01\u0E25\u0E22\u0E38\u0E17\u0E18\u0E4C\u0E14\u0E34\u0E08\u0E34\u0E17\u0E31\u0E25\u0E43\u0E2B\u0E49\u0E01\u0E31\u0E1A\u0E2D\u0E07\u0E04\u0E4C\u0E01\u0E23 \u0E1C\u0E48\u0E32\u0E19\u0E01\u0E23\u0E13\u0E35\u0E28\u0E36\u0E01\u0E29\u0E32\u0E08\u0E23\u0E34\u0E07\u0E41\u0E25\u0E30 workshop \u0E17\u0E35\u0E48\u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A\u0E43\u0E2B\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35",
    category: "\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23",
    duration: "2 \u0E27\u0E31\u0E19",
    mode: "On-site + Workshop",
    tuition: 4500,
    imageUrl: "/manus-storage/academy-hero_7f64e6db.jpg",
    nextStartAt: /* @__PURE__ */ new Date("2026-10-17T09:00:00Z")
  },
  {
    id: 5,
    slug: "creative-communication",
    title: "Creative Communication",
    shortDescription: "\u0E2A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E23\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E2A\u0E23\u0E23\u0E04\u0E4C \u0E40\u0E25\u0E48\u0E32\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E43\u0E2B\u0E49\u0E04\u0E19\u0E40\u0E2B\u0E47\u0E19\u0E20\u0E32\u0E1E\u0E41\u0E25\u0E30\u0E25\u0E07\u0E21\u0E37\u0E2D\u0E17\u0E33",
    description: "\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E37\u0E2D\u0E04\u0E34\u0E14\u0E41\u0E25\u0E30\u0E40\u0E17\u0E04\u0E19\u0E34\u0E04\u0E01\u0E32\u0E23\u0E40\u0E25\u0E48\u0E32\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E2A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E23\u0E43\u0E19\u0E42\u0E25\u0E01\u0E17\u0E35\u0E48\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E25\u0E49\u0E19\u0E40\u0E01\u0E34\u0E19 \u0E15\u0E31\u0E49\u0E07\u0E41\u0E15\u0E48\u0E01\u0E32\u0E23\u0E27\u0E32\u0E07\u0E2A\u0E32\u0E23 \u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A\u0E1B\u0E23\u0E30\u0E2A\u0E1A\u0E01\u0E32\u0E23\u0E13\u0E4C \u0E08\u0E19\u0E16\u0E36\u0E07\u0E01\u0E32\u0E23\u0E19\u0E33\u0E40\u0E2A\u0E19\u0E2D\u0E17\u0E35\u0E48\u0E21\u0E35\u0E1E\u0E25\u0E31\u0E07",
    category: "\u0E17\u0E31\u0E01\u0E29\u0E30\u0E41\u0E2B\u0E48\u0E07\u0E2D\u0E19\u0E32\u0E04\u0E15",
    duration: "1 \u0E27\u0E31\u0E19",
    mode: "On-site",
    tuition: 2800,
    imageUrl: "/manus-storage/academy-community_43f6f064.jpg",
    nextStartAt: /* @__PURE__ */ new Date("2026-11-07T09:00:00Z")
  },
  {
    id: 6,
    slug: "data-literacy",
    title: "Data Literacy for Everyone",
    shortDescription: "\u0E2D\u0E48\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E1B\u0E47\u0E19 \u0E15\u0E31\u0E14\u0E2A\u0E34\u0E19\u0E43\u0E08\u0E44\u0E14\u0E49\u0E14\u0E35\u0E02\u0E36\u0E49\u0E19 \u0E41\u0E25\u0E30\u0E17\u0E33\u0E07\u0E32\u0E19\u0E23\u0E48\u0E27\u0E21\u0E01\u0E31\u0E1A\u0E17\u0E35\u0E21\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25",
    description: "\u0E1B\u0E39\u0E1E\u0E37\u0E49\u0E19\u0E10\u0E32\u0E19\u0E01\u0E32\u0E23\u0E04\u0E34\u0E14\u0E40\u0E0A\u0E34\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E19\u0E31\u0E01\u0E2A\u0E16\u0E34\u0E15\u0E34 \u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E33\u0E16\u0E32\u0E21 \u0E2D\u0E48\u0E32\u0E19\u0E01\u0E23\u0E32\u0E1F \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E19\u0E48\u0E32\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E16\u0E37\u0E2D \u0E41\u0E25\u0E30\u0E2A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E23 insight \u0E43\u0E2B\u0E49\u0E17\u0E35\u0E21\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E15\u0E23\u0E07\u0E01\u0E31\u0E19",
    category: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E40\u0E17\u0E04\u0E42\u0E19\u0E42\u0E25\u0E22\u0E35",
    duration: "2 \u0E27\u0E31\u0E19",
    mode: "Hybrid",
    tuition: 3600,
    imageUrl: "/manus-storage/academy-hero_7f64e6db.jpg",
    nextStartAt: /* @__PURE__ */ new Date("2026-12-05T09:00:00Z")
  }
];
var fallbackEvents = [
  { id: 1, title: "\u0E1B\u0E10\u0E21\u0E19\u0E34\u0E40\u0E17\u0E28\u0E1C\u0E39\u0E49\u0E40\u0E23\u0E35\u0E22\u0E19 \u0E21\u0E17\u0E23.\u0E25\u0E49\u0E32\u0E19\u0E19\u0E32 \u0E40\u0E0A\u0E35\u0E22\u0E07\u0E23\u0E32\u0E22 Lifelong Learning", description: "\u0E17\u0E33\u0E04\u0E27\u0E32\u0E21\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01\u0E17\u0E35\u0E21\u0E1C\u0E39\u0E49\u0E2A\u0E2D\u0E19\u0E41\u0E25\u0E30\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E19\u0E23\u0E48\u0E27\u0E21\u0E23\u0E38\u0E48\u0E19", startAt: /* @__PURE__ */ new Date("2026-10-15T09:00:00Z"), endAt: /* @__PURE__ */ new Date("2026-10-15T12:00:00Z"), location: "\u0E2B\u0E49\u0E2D\u0E07\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21 \u0E21\u0E17\u0E23.\u0E25\u0E49\u0E32\u0E19\u0E19\u0E32 \u0E40\u0E0A\u0E35\u0E22\u0E07\u0E23\u0E32\u0E22", type: "\u0E1B\u0E10\u0E21\u0E19\u0E34\u0E40\u0E17\u0E28" },
  { id: 2, title: "Open Class: Design Thinking", description: "\u0E04\u0E25\u0E32\u0E2A\u0E17\u0E14\u0E25\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E1F\u0E23\u0E35\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1C\u0E39\u0E49\u0E2A\u0E19\u0E43\u0E08", startAt: /* @__PURE__ */ new Date("2026-10-24T13:00:00Z"), endAt: /* @__PURE__ */ new Date("2026-10-24T16:00:00Z"), location: "\u0E2D\u0E2D\u0E19\u0E44\u0E25\u0E19\u0E4C\u0E1C\u0E48\u0E32\u0E19 Zoom", type: "Open Class" },
  { id: 3, title: "\u0E40\u0E2A\u0E27\u0E19\u0E32 Learning for Tomorrow", description: "\u0E1E\u0E39\u0E14\u0E04\u0E38\u0E22\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E17\u0E31\u0E01\u0E29\u0E30\u0E17\u0E35\u0E48\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E2D\u0E19\u0E32\u0E04\u0E15\u0E01\u0E32\u0E23\u0E17\u0E33\u0E07\u0E32\u0E19", startAt: /* @__PURE__ */ new Date("2026-11-14T10:00:00Z"), endAt: /* @__PURE__ */ new Date("2026-11-14T12:00:00Z"), location: "\u0E2B\u0E2D\u0E1B\u0E23\u0E30\u0E0A\u0E38\u0E21\u0E21\u0E2B\u0E32\u0E27\u0E34\u0E17\u0E22\u0E32\u0E25\u0E31\u0E22", type: "\u0E40\u0E2A\u0E27\u0E19\u0E32" }
];
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    loginWithGoogle: publicProcedure.input(
      z2.object({
        email: z2.string().email("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"),
        name: z2.string().optional()
      })
    ).mutation(async ({ input, ctx }) => {
      const name = input.name?.trim() || input.email.split("@")[0];
      const openId = `google:${input.email.toLowerCase()}`;
      await upsertUser({
        openId,
        name,
        email: input.email.toLowerCase(),
        loginMethod: "google",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS
      });
      return {
        success: true,
        sessionToken,
        user: {
          openId,
          name,
          email: input.email
        }
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  courses: router({
    list: publicProcedure.query(async () => {
      const data = await listCourses();
      return data.length ? data : fallbackCourses;
    }),
    getBySlug: publicProcedure.input(z2.object({ slug: z2.string().min(1) })).query(async ({ input }) => {
      const data = await getCourseBySlug(input.slug);
      return data ?? fallbackCourses.find((course) => course.slug === input.slug) ?? null;
    })
  }),
  events: router({
    list: publicProcedure.query(async () => {
      const data = await listEvents();
      return data.length ? data : fallbackEvents;
    })
  }),
  applications: router({
    create: publicProcedure.input(z2.object({
      courseSlug: z2.string().min(1),
      fullName: z2.string().min(2, "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25"),
      email: z2.string().email("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E43\u0E2B\u0E49\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"),
      phone: z2.string().min(8, "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C"),
      occupation: z2.string().optional(),
      experience: z2.string().optional(),
      message: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const course = await getCourseBySlug(input.courseSlug) ?? fallbackCourses.find((item) => item.slug === input.courseSlug);
      if (!course) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2B\u0E25\u0E31\u0E01\u0E2A\u0E39\u0E15\u0E23\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01");
      const db = await getDb();
      if (!db || !course.id) return { success: true, demo: true };
      await createApplication({
        userId: ctx.user?.id ?? null,
        courseId: course.id,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        occupation: input.occupation || null,
        experience: input.experience || null,
        message: input.message || null,
        status: "pending"
      });
      return { success: true, demo: false };
    })
  }),
  dashboard: router({
    overview: protectedProcedure.query(({ ctx }) => getDashboardData(ctx.user.id))
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/app.ts
function createExpressApp() {
  const app2 = express();
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app2);
  registerOAuthRoutes(app2);
  registerGoogleOAuthRoutes(app2);
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app2;
}

// server/api_entry.ts
var app = createExpressApp();
var api_entry_default = app;
export {
  api_entry_default as default
};
