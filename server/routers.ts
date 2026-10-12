import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { createApplication, getCourseBySlug, getDashboardData, getDb, listCourses, listEvents, upsertUser } from "./db";
import { applications, courses, events } from "../drizzle/schema";
import { sdk } from "./_core/sdk";

const fallbackCourses = [
  {
    id: 1,
    slug: "ev-charger-installation",
    title: "การติดตั้งตู้ชาร์จรถไฟฟ้า (EV Charger Installation)",
    shortDescription: "เรียนรู้มาตรฐานการติดตั้ง ตรวจสอบ และบำรุงรักษาตู้ชาร์จรถยนต์ไฟฟ้า AC/DC Wallbox พร้อมฝึกปฏิบัติเดินสายและระบบความปลอดภัยจริง",
    description: `หลักสูตรออกแบบสำหรับช่างไฟฟ้า วิศวกร และผู้ประกอบการที่ต้องการก้าวเข้าสู่ธุรกิจและบริการสถานีชาร์จรถยนต์ไฟฟ้าอย่างถูกต้องตามมาตรฐานสากลและมาตรฐานของการไฟฟ้าไทย (PEA/MEA)

เนื้อหาการอบรมเข้มข้น 3 วัน (24 ชั่วโมง):
• วันที่ 1: มาตรฐานการติดตั้งและความปลอดภัย
  - ประเภทหัวชาร์จและการจ่ายไฟ: Level 1, Level 2, DC Fast Charging
  - มาตรฐานสากล IEC 61851 & IEC 62196 และมาตรฐานผลิตภัณฑ์อุตสาหกรรม (TISI)
  - อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล (PPE) และขั้นตอนความปลอดภัย
  - การประเมินพื้นที่ สำรวจหน้างาน และการวางแผนผังการเดินสาย

• วันที่ 2: อัปเกรดมิเตอร์และระบบไฟฟ้า
  - ระบบไฟฟ้า 1 เฟส และ 3 เฟส สำหรับตู้ชาร์จบ้านและเชิงพาณิชย์
  - การคำนวณขนาดโหลดและขนาดหม้อแปลงที่เหมาะสม
  - ขั้นตอนการขอเพิ่มขนาดมิเตอร์หรือขอมิเตอร์ที่ 2 สำหรับ EV (TOU Tariff)
  - การเลือกขนาดสายเคเบิล ท่อร้อยสาย และ Circuit Breaker

• วันที่ 3: การติดตั้งตู้ชาร์จ อุปกรณ์ป้องกัน และการทดสอบรับรอง
  - การติดตั้งตู้ Wallbox และอุปกรณ์ป้องกันกระแสไฟฟ้ารั่ว (RCD Type B / Type A+DC)
  - การติดตั้งอุปกรณ์ป้องกันไฟกระชาก (Surge Protection Device - SPD)
  - การต่อระบบลงดิน (Grounding Rod) และการวัดค่าความต้านทานดิน
  - การทดสอบการทำงานของตู้ชาร์จจำลอง (Commissioning & Functional Test)
  - การวิเคราะห์และแก้ไขปัญหาตู้ชาร์จ พร้อมสอบประเมินภาคปฏิบัติ`,
    category: "เทคโนโลยีและพลังงาน",
    duration: "3 วัน (24 ชั่วโมง)",
    mode: "On-site + ภาคปฏิบัติ",
    tuition: 3500,
    imageUrl: "/assets/ev-training/banner.png",
    nextStartAt: new Date("2026-10-20T09:00:00Z"),
  },
  {
    id: 2,
    slug: "ev-repair-maintenance",
    title: "หลักสูตรช่างซ่อมรถไฟฟ้า (EV Repair & Maintenance Program)",
    shortDescription: "หลักสูตรอบรม 5 วัน (30 ชั่วโมง) ภาคปฏิบัติจริง สำหรับช่างซ่อมและผู้สนใจ ครอบคลุมระบบไฟแรงสูง แบตเตอรี่ มอเตอร์ และการวินิจฉัยด้วย OBD-EV",
    description: `หลักสูตรฝึกอบรมเชิงลึก 30 ชั่วโมง 5 วัน ออกแบบเฉพาะสำหรับช่างซ่อมรถยนต์ ช่างเทคนิค และผู้สนใจที่ต้องการยกระดับทักษะสู่การดูแลและซ่อมบำรุงยานยนต์ไฟฟ้า (BEV/PHEV) จากข้อมูลการวิจัยและการใช้งานจริง

โครงสร้างหลักสูตร 5 วัน (วันละ 6 ชั่วโมง):
• วันที่ 1: ความปลอดภัยไฟแรงสูง (High Voltage Safety)
  - ทำความเข้าใจระบบไฟแรงดันสูงในรถไฟฟ้า (200 - 400V DC)
  - มาตรฐานความปลอดภัย ISO 6469 & ISO 13849
  - การใช้งานอุปกรณ์ป้องกันส่วนบุคคล (PPE Class 0/00)
  - ขั้นตอนการตัดระบบไฟ (Lockout/Tagout & Manual Service Disconnect)
  - การปฐมพยาบาลและการจัดการสถานการณ์ฉุกเฉินไฟฟ้าแรงสูง

• วันที่ 2: ระบบแบตเตอรี่แรงดันสูงและการบำรุงรักษา (Traction Battery & BMS)
  - โครงสร้างและเคมีเซลล์แบตเตอรี่: Li-ion, Li-Po, LFP
  - ระบบบริหารจัดการแบตเตอรี่ (Battery Management System - BMS)
  - เทคนิคการวินิจฉัย ตรวจเช็กสุขภาพแบตเตอรี่ (State of Health - SOH / SOC)
  - การปรับสมดุลแรงดันเซลล์ (Cell Balancing) และการทดสอบแรงดันตกคร่อม
  - ข้อปฏิบัติความปลอดภัยในการเปิดซ่อมและเปลี่ยนโมดูลแบตเตอรี่

• วันที่ 3: มอเตอร์ไฟฟ้าและระบบส่งกำลังขับเคลื่อน (Electric Motor & Inverter)
  - หลักการทำงานของ AC Induction Motor และ Permanent Magnet Synchronous Motor (PMSM)
  - การทำงานของ Inverter / Converter และชุดควบคุมการขับเคลื่อน
  - ระบบเบรกสร้างพลังงานย้อนกลับ (Regenerative Braking)
  - การวิเคราะห์อาการผิดปกติ เสียง และการสั่นสะเทือนของชุดขับเคลื่อน
  - การตรวจสอบและบำรุงรักษาระบบส่งกำลังมอเตอร์เดี่ยวและมอเตอร์คู่

• วันที่ 4: ระบบควบคุมอิเล็กทรอนิกส์และเครื่องมือวิเคราะห์ (Control Units & OBD-EV)
  - หน่วยควบคุมยานยนต์ (Vehicle Control Unit - VCU, ECU/PCM)
  - สถาปัตยกรรมเครือข่าย CAN Bus และ LIN Bus ในรถยนต์ไฟฟ้า
  - การใช้เครื่องสแกนเนอร์วิเคราะห์ระบบ OBD-II และ OBD-EV
  - การวัดสัญญาณด้วย Digital Multimeter และ Oscilloscope
  - การอ่าน รหัสความผิดพลาด (DTC) และวิเคราะห์ Data Stream แบบเรียลไทม์

• วันที่ 5: ระบบจัดการความร้อนและการศึกษากรณีปัญหาจริง (Thermal Management & Case Studies)
  - ระบบระบายความร้อนแบตเตอรี่ (Liquid Cooling & Chiller System)
  - ระบบระบายความร้อนอินเวอร์เตอร์และมอเตอร์ขับเคลื่อน
  - ระบบปรับอากาศปั๊มความร้อน (Heat Pump & High-Voltage HVAC)
  - เวิร์กช็อปวิเคราะห์และแก้ปัญหาจากเคสจริง (Real Case Studies)
  - การสอบประเมินภาคทฤษฎีและทดสอบภาคปฏิบัติจริง`,
    category: "เทคโนโลยีและพลังงาน",
    duration: "30 ชั่วโมง / 5 วัน",
    mode: "ภาคปฏิบัติจริง + Workshop",
    tuition: 4900,
    imageUrl: "/assets/ev-training/banner.png",
    nextStartAt: new Date("2026-11-10T09:00:00Z"),
  },
  {
    id: 3,
    slug: "ev-masterclass-users",
    title: "คู่มือผู้ใช้รถไฟฟ้าที่สมบูรณ์ (EV Masterclass for Users)",
    shortDescription: "เจาะลึกเทคโนโลยีรถไฟฟ้าสำหรับผู้ใช้ทั่วไป การดูแลรักษาแบตเตอรี่ วิธีเลือกสถานีชาร์จ และการวิเคราะห์ความคุ้มค่าการเป็นเจ้าของ",
    description: `หลักสูตรพิเศษ 1 วัน (6 ชั่วโมง) เข้มข้น สำหรับเจ้าของรถไฟฟ้า ผู้เตรียมตัวซื้อรถ EV และผู้ที่สนใจเทคโนโลยียานยนต์ยุคใหม่

หัวข้อการเรียนรู้:
• รู้จักประเภทรถยนต์พลังงานใหม่: ความแตกต่างระหว่าง BEV, PHEV และ HEV พร้อมข้อดี-ข้อจำกัด
• กลยุทธ์การถนอมแบตเตอรี่: พฤติกรรมการชาร์จที่ถูกต้อง การตั้งขีดจำกัดชาร์จ (80% vs 100%) เพื่อยืดอายุการใช้งาน
• ระบบการชาร์จ: Level 1 (เต้ารับบ้าน), Level 2 (Wallbox), และ DC Fast Charge ตามสถานีบริการ
• เทคนิคการใช้งานแอปพลิเคชันค้นหาสถานีชาร์จและเครือข่ายผู้ให้บริการในประเทศไทย
• การวิเคราะห์ต้นทุนรวมของการเป็นเจ้าของ (Total Cost of Ownership: TCO) ค่าบำรุงรักษา และค่าประกันภัย
• ปัจจัยที่ส่งผลต่อระยะทางขับขี่จริง (สภาพอากาศ ความเร็ว แอร์ โหมดการขับ) และการวางแผนเดินทางไกล
• ข้อควรระวังและวิธีรับมือเหตุฉุกเฉิน (รถแบตหมดกลางทาง การลุยน้ำท่วม การยกรถลาก)`,
    category: "เทคโนโลยีและพลังงาน",
    duration: "6 ชั่วโมง (1 วัน)",
    mode: "On-site + Hybrid",
    tuition: 990,
    imageUrl: "/assets/ev-training/banner.png",
    nextStartAt: new Date("2026-10-28T09:00:00Z"),
  },
  {
    id: 4,
    slug: "digital-transformation",
    title: "Digital Transformation for Leaders",
    shortDescription: "เข้าใจโลกดิจิทัลและเปลี่ยนแนวคิดให้กลายเป็นการลงมือทำ",
    description: "หลักสูตรเข้มข้นสำหรับผู้บริหารและคนทำงานที่ต้องการวางกลยุทธ์ดิจิทัลให้กับองค์กร ผ่านกรณีศึกษาจริงและ workshop ที่ออกแบบให้ใช้งานได้ทันที",
    category: "การจัดการ",
    duration: "2 วัน",
    mode: "On-site + Workshop",
    tuition: 4500,
    imageUrl: "/manus-storage/academy-hero_7f64e6db.jpg",
    nextStartAt: new Date("2026-10-17T09:00:00Z"),
  },
  {
    id: 5,
    slug: "creative-communication",
    title: "Creative Communication",
    shortDescription: "สื่อสารอย่างสร้างสรรค์ เล่าเรื่องให้คนเห็นภาพและลงมือทำ",
    description: "เรียนรู้เครื่องมือคิดและเทคนิคการเล่าเรื่องสำหรับการสื่อสารในโลกที่ข้อมูลล้นเกิน ตั้งแต่การวางสาร การออกแบบประสบการณ์ จนถึงการนำเสนอที่มีพลัง",
    category: "ทักษะแห่งอนาคต",
    duration: "1 วัน",
    mode: "On-site",
    tuition: 2800,
    imageUrl: "/manus-storage/academy-community_43f6f064.jpg",
    nextStartAt: new Date("2026-11-07T09:00:00Z"),
  },
  {
    id: 6,
    slug: "data-literacy",
    title: "Data Literacy for Everyone",
    shortDescription: "อ่านข้อมูลเป็น ตัดสินใจได้ดีขึ้น และทำงานร่วมกับทีมข้อมูล",
    description: "ปูพื้นฐานการคิดเชิงข้อมูลโดยไม่ต้องเป็นนักสถิติ เรียนรู้การตั้งคำถาม อ่านกราฟ ตรวจสอบความน่าเชื่อถือ และสื่อสาร insight ให้ทีมเข้าใจตรงกัน",
    category: "ข้อมูลและเทคโนโลยี",
    duration: "2 วัน",
    mode: "Hybrid",
    tuition: 3600,
    imageUrl: "/manus-storage/academy-hero_7f64e6db.jpg",
    nextStartAt: new Date("2026-12-05T09:00:00Z"),
  },
];

const fallbackEvents = [
  { id: 1, title: "ปฐมนิเทศผู้เรียน มทร.ล้านนา เชียงราย Lifelong Learning", description: "ทำความรู้จักทีมผู้สอนและเพื่อนร่วมรุ่น", startAt: new Date("2026-10-15T09:00:00Z"), endAt: new Date("2026-10-15T12:00:00Z"), location: "ห้องประชุม มทร.ล้านนา เชียงราย", type: "ปฐมนิเทศ" },
  { id: 2, title: "Open Class: Design Thinking", description: "คลาสทดลองเรียนฟรีสำหรับผู้สนใจ", startAt: new Date("2026-10-24T13:00:00Z"), endAt: new Date("2026-10-24T16:00:00Z"), location: "ออนไลน์ผ่าน Zoom", type: "Open Class" },
  { id: 3, title: "เสวนา Learning for Tomorrow", description: "พูดคุยเรื่องทักษะที่จำเป็นสำหรับอนาคตการทำงาน", startAt: new Date("2026-11-14T10:00:00Z"), endAt: new Date("2026-11-14T12:00:00Z"), location: "หอประชุมมหาวิทยาลัย", type: "เสวนา" },
];

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    loginWithGoogle: publicProcedure
      .input(
        z.object({
          email: z.string().email("กรุณาระบุอีเมลที่ถูกต้อง"),
          name: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const name = input.name?.trim() || input.email.split("@")[0];
        const openId = `google:${input.email.toLowerCase()}`;

        await upsertUser({
          openId,
          name,
          email: input.email.toLowerCase(),
          loginMethod: "google",
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(openId, {
          name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          success: true,
          user: {
            openId,
            name,
            email: input.email,
          },
        };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  courses: router({
    list: publicProcedure.query(async () => {
      const data = await listCourses();
      return data.length ? data : fallbackCourses;
    }),
    getBySlug: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(async ({ input }) => {
      const data = await getCourseBySlug(input.slug);
      return data ?? fallbackCourses.find(course => course.slug === input.slug) ?? null;
    }),
  }),
  events: router({
    list: publicProcedure.query(async () => {
      const data = await listEvents();
      return data.length ? data : fallbackEvents;
    }),
  }),
  applications: router({
    create: publicProcedure.input(z.object({
      courseSlug: z.string().min(1),
      fullName: z.string().min(2, "กรุณากรอกชื่อ-นามสกุล"),
      email: z.string().email("กรุณากรอกอีเมลให้ถูกต้อง"),
      phone: z.string().min(8, "กรุณากรอกเบอร์โทรศัพท์"),
      occupation: z.string().optional(),
      experience: z.string().optional(),
      message: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const course = await getCourseBySlug(input.courseSlug) ?? fallbackCourses.find(item => item.slug === input.courseSlug);
      if (!course) throw new Error("ไม่พบหลักสูตรที่เลือก");
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
        status: "pending",
      });
      return { success: true, demo: false };
    }),
  }),
  dashboard: router({
    overview: protectedProcedure.query(({ ctx }) => getDashboardData(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
void applications;
void courses;
void events;
