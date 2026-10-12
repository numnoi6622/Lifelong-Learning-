import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const courses = mysqlTable("courses", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const applications = mysqlTable("applications", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const enrollments = mysqlTable("enrollments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  status: mysqlEnum("status", ["enrolled", "completed", "paused"]).default("enrolled").notNull(),
  progress: int("progress").default(0).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startAt: timestamp("startAt").notNull(),
  endAt: timestamp("endAt"),
  location: varchar("location", { length: 255 }),
  type: varchar("type", { length: 80 }).default("กิจกรรม").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Event = typeof events.$inferSelect;
