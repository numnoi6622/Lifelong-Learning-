import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import { applications, courses, enrollments, events, InsertUser, users } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
const memoryUsers = new Map<string, typeof users.$inferSelect>();
let nextUserId = 1;

export async function getDb() {
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    const existing = memoryUsers.get(user.openId);
    const now = new Date();
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
        lastSignedIn: user.lastSignedIn ?? now,
      });
    }
    return;
  }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return memoryUsers.get(openId);
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listCourses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).orderBy(desc(courses.createdAt));
}

export async function getCourseBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  return result[0];
}

export async function listEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(events).orderBy(events.startAt);
}

export async function createApplication(input: typeof applications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.insert(applications).values(input);
}

export async function getDashboardData(userId: number) {
  const db = await getDb();
  if (!db) return { applications: [], enrollments: [], events: [] };
  const [userApplications, userEnrollments, upcomingEvents] = await Promise.all([
    db.select({ application: applications, course: courses })
      .from(applications)
      .leftJoin(courses, eq(applications.courseId, courses.id))
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.createdAt)),
    db.select({ enrollment: enrollments, course: courses })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.userId, userId))
      .orderBy(desc(enrollments.startedAt)),
    db.select().from(events).orderBy(events.startAt),
  ]);
  return { applications: userApplications, enrollments: userEnrollments, events: upcomingEvents };
}

void and;
