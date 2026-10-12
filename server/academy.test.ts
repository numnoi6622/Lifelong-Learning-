import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("academy public catalog", () => {
  it("returns courses and course details", async () => {
    const caller = appRouter.createCaller(createContext());
    const courses = await caller.courses.list();
    expect(courses.length).toBeGreaterThan(0);
    const first = courses[0];
    expect(first?.slug).toBeTruthy();
    const detail = await caller.courses.getBySlug({ slug: first!.slug });
    expect(detail?.title).toBe(first?.title);
  });

  it("returns upcoming events", async () => {
    const caller = appRouter.createCaller(createContext());
    const events = await caller.events.list();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.title).toBeTruthy();
  });

  it("includes the imported EV technology program", async () => {
    const caller = appRouter.createCaller(createContext());
    const course = await caller.courses.getBySlug({ slug: "ev-technology-training" });
    expect(course?.title).toContain("เทคโนโลยีรถไฟฟ้า");
    expect(course?.duration).toBe("30 ชั่วโมง / 5 วัน");
    expect(course?.description).toContain("ความปลอดภัยไฟแรงสูง");
  });
});

describe("academy application validation", () => {
  it("rejects invalid email before writing", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.applications.create({
      courseSlug: "digital-transformation",
      fullName: "ผู้สมัครทดสอบ",
      email: "not-an-email",
      phone: "0812345678",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("academy dashboard authorization", () => {
  it("requires an authenticated user", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.dashboard.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
