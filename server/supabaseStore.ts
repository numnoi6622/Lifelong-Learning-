import dns from "node:dns/promises";

export interface TraineeApplicationRecord {
  id: number;
  userId: number | null;
  courseId: number;
  courseSlug: string;
  courseTitle: string;
  courseDuration: string;
  courseTuition: number;
  fullName: string;
  email: string;
  phone: string;
  nationalId: string | null;
  occupation: string | null;
  experience: string | null;
  message: string | null;
  status: "pending" | "reviewing" | "accepted" | "rejected";
  paymentStatus: "unpaid" | "pending_verification" | "paid";
  paymentAmount: number | null;
  paymentRef: string | null;
  paidAt: string | null;
  attendanceProgress: number;
  attendanceStatus: "not_started" | "studying" | "completed";
  completedAt: string | null;
  certificateIssued: boolean;
  certificateNo: string | null;
  certificateIssuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  googleClientId?: string;
}

const DEFAULT_SUPABASE_URL = "https://ovtflphcqhmmzraqhixd.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_fcasvASney7Bt3l4qjtAHQ_wNABYk3I";

function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}

let runtimeSupabaseConfig: SupabaseConfig = {
  url: normalizeSupabaseUrl(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
  ),
  anonKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY,
  googleClientId:
    process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "",
};

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: normalizeSupabaseUrl(
      runtimeSupabaseConfig.url ||
        process.env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        DEFAULT_SUPABASE_URL
    ),
    anonKey:
      runtimeSupabaseConfig.anonKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      DEFAULT_SUPABASE_ANON_KEY,
    googleClientId:
      runtimeSupabaseConfig.googleClientId ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.VITE_GOOGLE_CLIENT_ID ||
      "",
  };
}

export function setSupabaseConfig(config: Partial<SupabaseConfig>) {
  if (config.url !== undefined) runtimeSupabaseConfig.url = normalizeSupabaseUrl(config.url);
  if (config.anonKey !== undefined) runtimeSupabaseConfig.anonKey = config.anonKey.trim();
  if (config.googleClientId !== undefined) runtimeSupabaseConfig.googleClientId = config.googleClientId.trim();
  return getSupabaseConfig();
}

export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey && cfg.url.startsWith("https://"));
}

// In-memory store (persists within warm instances and syncs with client & Supabase)
const applicationsMap = new Map<number, TraineeApplicationRecord>();
let nextAppId = 1001;

function seedInitialApplications() {
  if (applicationsMap.size > 0) return;
  const now = new Date().toISOString();
  const sample1: TraineeApplicationRecord = {
    id: 1001,
    userId: 1,
    courseId: 1,
    courseSlug: "ev-charger-installation",
    courseTitle: "การติดตั้งตู้ชาร์จรถไฟฟ้า (EV Charger Installation)",
    courseDuration: "3 วัน (24 ชั่วโมง)",
    courseTuition: 3500,
    fullName: "นายกิตติพงศ์ เจริญสุข",
    email: "kittipong.cr@gmail.com",
    phone: "081-234-5678",
    nationalId: "1579900123456",
    occupation: "วิศวกรไฟฟ้า / บริษัท เชียงรายโซลาร์แอนด์อีวี จำกัด",
    experience: "มีพื้นฐานงานระบบไฟฟ้าอาคาร ต้องการต่อยอดติดตั้ง EV Charger มาตรฐาน PEA",
    message: "ต้องการใบกำกับภาษีในนามบริษัท",
    status: "accepted",
    paymentStatus: "paid",
    paymentAmount: 3500,
    paymentRef: "KBank-25691012-8841",
    paidAt: now,
    attendanceProgress: 100,
    attendanceStatus: "completed",
    completedAt: now,
    certificateIssued: true,
    certificateNo: "RMUTLCR-EV-2569-0001",
    certificateIssuedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const sample2: TraineeApplicationRecord = {
    id: 1002,
    userId: 2,
    courseId: 2,
    courseSlug: "ev-repair-maintenance",
    courseTitle: "หลักสูตรช่างซ่อมรถไฟฟ้า (EV Repair & Maintenance Program)",
    courseDuration: "30 ชั่วโมง / 5 วัน",
    courseTuition: 4900,
    fullName: "นางสาวพิมพ์ชนก วงศ์สวัสดิ์",
    email: "pimchanok.ev@gmail.com",
    phone: "089-876-5432",
    nationalId: "1509900543210",
    occupation: "เจ้าของอู่ซ่อมรถยนต์ / เชียงรายออโต้เซอร์วิส",
    experience: "ซ่อมรถยนต์ไฮบริดมา 3 ปี ต้องการยกระดับเป็นช่างซ่อมรถไฟฟ้า BEV เต็มรูปแบบ",
    message: null,
    status: "accepted",
    paymentStatus: "pending_verification",
    paymentAmount: 4900,
    paymentRef: "SCB-25691013-1102",
    paidAt: now,
    attendanceProgress: 60,
    attendanceStatus: "studying",
    completedAt: null,
    certificateIssued: false,
    certificateNo: null,
    certificateIssuedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  applicationsMap.set(sample1.id, sample1);
  applicationsMap.set(sample2.id, sample2);
  nextAppId = 1003;
}

seedInitialApplications();

// Convert snake_case row from Supabase to camelCase TraineeApplicationRecord
function fromSupabaseRow(row: any): TraineeApplicationRecord {
  const rawStatus = row.status ?? "pending";
  const normalizedStatus: TraineeApplicationRecord["status"] =
    rawStatus === "submitted"
      ? "pending"
      : rawStatus === "approved"
        ? "accepted"
        : ["pending", "reviewing", "accepted", "rejected"].includes(rawStatus)
          ? rawStatus
          : "pending";

  const rawAttendanceStatus = row.attendance_status ?? row.attendanceStatus ?? "not_started";
  const progress = Number(
    row.attendance_percent ?? row.attendance_progress ?? row.attendanceProgress ?? 0
  );
  const normalizedAttendanceStatus: TraineeApplicationRecord["attendanceStatus"] =
    rawAttendanceStatus === "completed" || progress >= 100
      ? "completed"
      : rawAttendanceStatus === "studying" || progress > 0
        ? "studying"
        : "not_started";

  return {
    id: Number(row.id),
    userId: row.user_id ?? row.userId ?? null,
    courseId: Number(row.course_id ?? row.courseId ?? 1),
    courseSlug: row.course_slug ?? row.courseSlug ?? "ev-charger-installation",
    courseTitle: row.course_title ?? row.courseTitle ?? "หลักสูตรอบรม",
    courseDuration: row.course_duration ?? row.courseDuration ?? "24 ชั่วโมง",
    courseTuition: Number(row.course_tuition ?? row.courseTuition ?? 0),
    fullName: row.full_name ?? row.fullName ?? "",
    email: (row.email ?? "").toLowerCase(),
    phone: row.phone ?? "",
    nationalId: row.position ?? row.national_id ?? row.nationalId ?? null,
    occupation: row.organization ?? row.occupation ?? null,
    experience: row.motivation ?? row.experience ?? null,
    message: row.admin_note ?? row.message ?? null,
    status: normalizedStatus,
    paymentStatus: row.payment_status ?? row.paymentStatus ?? "unpaid",
    paymentAmount: Number(row.payment_amount ?? row.paymentAmount ?? 0),
    paymentRef: row.payment_slip_ref ?? row.payment_ref ?? row.paymentRef ?? null,
    paidAt: row.paid_at ?? row.paidAt ?? null,
    attendanceProgress: progress,
    attendanceStatus: normalizedAttendanceStatus,
    completedAt: row.completed_at ?? row.completedAt ?? row.certificate_issued_at ?? null,
    certificateIssued: Boolean(row.certificate_issued ?? row.certificateIssued ?? false),
    certificateNo: row.certificate_no ?? row.certificateNo ?? null,
    certificateIssuedAt: row.certificate_issued_at ?? row.certificateIssuedAt ?? null,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
  };
}

// Convert camelCase record to snake_case for Supabase table `trainee_applications`
function toSupabaseRow(record: TraineeApplicationRecord) {
  return {
    id: record.id,
    user_id: record.userId,
    course_id: record.courseId,
    course_slug: record.courseSlug,
    course_title: record.courseTitle,
    course_duration: record.courseDuration,
    course_tuition: record.courseTuition,
    full_name: record.fullName,
    email: record.email.toLowerCase(),
    phone: record.phone,
    organization: record.occupation,
    position: record.nationalId,
    province: "เชียงราย",
    motivation: record.experience,
    status: record.status,
    payment_status: record.paymentStatus,
    payment_amount: record.paymentAmount ?? 0,
    payment_slip_ref: record.paymentRef,
    paid_at: record.paidAt,
    attendance_status: record.attendanceStatus,
    attendance_hours: Math.round((record.attendanceProgress / 100) * 24),
    attendance_percent: record.attendanceProgress,
    certificate_issued: record.certificateIssued,
    certificate_no: record.certificateNo,
    certificate_issued_at: record.certificateIssuedAt,
    admin_note: record.message,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

async function supabaseFetch(path: string, options: RequestInit = {}) {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) return null;
  const url = `${cfg.url}/rest/v1/${path}`;
  const headers: Record<string, string> = {
    apikey: cfg.anonKey,
    Authorization: `Bearer ${cfg.anonKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...(options.headers as Record<string, string> | undefined),
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.warn(`[Supabase] ${options.method || "GET"} ${path} failed (${response.status}):`, errText);
    return null;
  }
  const text = await response.text();
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  count?: number;
}> {
  if (!isSupabaseConfigured()) {
    return {
      connected: false,
      message: "ยังไม่ได้ระบุ SUPABASE_URL หรือ SUPABASE_ANON_KEY",
    };
  }
  try {
    const rows = await supabaseFetch("trainee_applications?select=*&limit=50");
    if (rows === null) {
      return {
        connected: false,
        message: "เชื่อมต่อ Supabase ได้ แต่ยังไม่ได้สร้างตาราง trainee_applications (กรุณารันคำสั่ง SQL ด้านล่างใน Supabase SQL Editor)",
      };
    }
    return {
      connected: true,
      message: `เชื่อมต่อ Supabase สำเร็จ! พบข้อมูลผู้เข้าอบรม ${Array.isArray(rows) ? rows.length : 0} รายการ`,
      count: Array.isArray(rows) ? rows.length : 0,
    };
  } catch (err) {
    return {
      connected: false,
      message: `ไม่สามารถเชื่อมต่อ Supabase: ${String(err)}`,
    };
  }
}

export async function syncAllToSupabase(): Promise<{ synced: number; connected: boolean }> {
  if (!isSupabaseConfigured()) return { synced: 0, connected: false };
  const all = Array.from(applicationsMap.values());
  let synced = 0;
  for (const item of all) {
    const res = await supabaseFetch("trainee_applications", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(toSupabaseRow(item)),
    });
    if (res) synced++;
  }
  return { synced, connected: true };
}

export async function listAllTraineeApplications(
  clientCachedRecords?: TraineeApplicationRecord[]
): Promise<TraineeApplicationRecord[]> {
  // 1. Merge any client-synced records so serverless cold starts never lose trainee submissions
  if (Array.isArray(clientCachedRecords)) {
    for (const rec of clientCachedRecords) {
      if (rec && typeof rec.id === "number" && rec.email) {
        const existing = applicationsMap.get(rec.id);
        if (!existing || new Date(rec.updatedAt) > new Date(existing.updatedAt)) {
          applicationsMap.set(rec.id, rec);
          if (rec.id >= nextAppId) nextAppId = rec.id + 1;
        }
      }
    }
  }

  // 2. If Supabase is configured, fetch latest records from Supabase and merge
  if (isSupabaseConfigured()) {
    const rows = await supabaseFetch("trainee_applications?select=*&order=created_at.desc");
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const mapped = fromSupabaseRow(row);
        applicationsMap.set(mapped.id, mapped);
        if (mapped.id >= nextAppId) nextAppId = mapped.id + 1;
      }
    }
  }

  return Array.from(applicationsMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function createTraineeApplication(input: {
  userId?: number | null;
  courseId: number;
  courseSlug: string;
  courseTitle: string;
  courseDuration: string;
  courseTuition: number;
  fullName: string;
  email: string;
  phone: string;
  nationalId?: string | null;
  occupation?: string | null;
  experience?: string | null;
  message?: string | null;
}): Promise<TraineeApplicationRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const maxRows = await supabaseFetch("trainee_applications?select=id&order=id.desc&limit=1");
    if (Array.isArray(maxRows) && maxRows[0]?.id) {
      const dbMaxId = Number(maxRows[0].id);
      if (dbMaxId >= nextAppId) {
        nextAppId = dbMaxId + 1;
      }
    }
  }
  const id = nextAppId++;
  const record: TraineeApplicationRecord = {
    id,
    userId: input.userId ?? null,
    courseId: input.courseId,
    courseSlug: input.courseSlug,
    courseTitle: input.courseTitle,
    courseDuration: input.courseDuration,
    courseTuition: input.courseTuition,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    nationalId: input.nationalId?.trim() || null,
    occupation: input.occupation?.trim() || null,
    experience: input.experience?.trim() || null,
    message: input.message?.trim() || null,
    status: "pending",
    paymentStatus: input.courseTuition === 0 ? "paid" : "unpaid",
    paymentAmount: input.courseTuition,
    paymentRef: null,
    paidAt: input.courseTuition === 0 ? now : null,
    attendanceProgress: 0,
    attendanceStatus: "not_started",
    completedAt: null,
    certificateIssued: false,
    certificateNo: null,
    certificateIssuedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  applicationsMap.set(id, record);

  if (isSupabaseConfigured()) {
    await supabaseFetch("trainee_applications", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(toSupabaseRow(record)),
    });
  }

  return record;
}

export function generateCertificateNumber(courseSlug: string, id: number): string {
  const prefix = courseSlug.startsWith("ev-") ? "RMUTLCR-EV" : "RMUTLCR-LL";
  const buddhistYear = new Date().getFullYear() + 543;
  const paddedId = String(id).padStart(4, "0");
  return `${prefix}-${buddhistYear}-${paddedId}`;
}

export async function updateTraineeApplication(
  id: number,
  patch: Partial<{
    status: "pending" | "reviewing" | "accepted" | "rejected";
    paymentStatus: "unpaid" | "pending_verification" | "paid";
    paymentRef: string | null;
    paymentAmount: number | null;
    attendanceProgress: number;
    attendanceStatus: "not_started" | "studying" | "completed";
    certificateIssued: boolean;
    fullName: string;
    phone: string;
    nationalId: string | null;
  }>,
  fallbackRecord?: TraineeApplicationRecord
): Promise<TraineeApplicationRecord> {
  let existing = applicationsMap.get(id) || fallbackRecord;
  if (!existing && isSupabaseConfigured()) {
    const rows = await supabaseFetch(`trainee_applications?id=eq.${id}&select=*`);
    if (Array.isArray(rows) && rows[0]) {
      existing = fromSupabaseRow(rows[0]);
    }
  }
  if (!existing) {
    throw new Error("ไม่พบข้อมูลใบสมัครผู้เข้าอบรมนี้");
  }

  const now = new Date().toISOString();
  const updated: TraineeApplicationRecord = {
    ...existing,
    ...patch,
    updatedAt: now,
  };

  if (patch.paymentStatus === "paid" && !updated.paidAt) {
    updated.paidAt = now;
  }

  if (patch.attendanceProgress !== undefined) {
    updated.attendanceProgress = Math.max(0, Math.min(100, patch.attendanceProgress));
    if (updated.attendanceProgress >= 100) {
      updated.attendanceStatus = "completed";
      if (!updated.completedAt) updated.completedAt = now;
    } else if (updated.attendanceProgress > 0) {
      updated.attendanceStatus = "studying";
    } else {
      updated.attendanceStatus = "not_started";
    }
  }

  if (patch.attendanceStatus === "completed") {
    updated.attendanceProgress = 100;
    if (!updated.completedAt) updated.completedAt = now;
  }

  if (patch.certificateIssued === true) {
    updated.certificateIssued = true;
    updated.status = "accepted";
    updated.attendanceProgress = 100;
    updated.attendanceStatus = "completed";
    if (!updated.completedAt) updated.completedAt = now;
    if (!updated.certificateNo) {
      updated.certificateNo = generateCertificateNumber(updated.courseSlug, updated.id);
    }
    if (!updated.certificateIssuedAt) {
      updated.certificateIssuedAt = now;
    }
  } else if (patch.certificateIssued === false) {
    updated.certificateIssued = false;
  }

  applicationsMap.set(id, updated);

  if (isSupabaseConfigured()) {
    await supabaseFetch("trainee_applications", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(toSupabaseRow(updated)),
    });
  }

  return updated;
}

export async function deleteTraineeApplication(id: number): Promise<boolean> {
  applicationsMap.delete(id);
  if (isSupabaseConfigured()) {
    await supabaseFetch(`trainee_applications?id=eq.${id}`, {
      method: "DELETE",
    });
  }
  return true;
}

// Validate real Google / Gmail / Academic email account
const BLOCKED_FAKE_USERNAMES = new Set([
  "test",
  "testing",
  "user",
  "admin",
  "abc",
  "abcd",
  "abcde",
  "abcdef",
  "123",
  "1234",
  "12345",
  "123456",
  "1234567",
  "12345678",
  "123456789",
  "aaa",
  "aaaa",
  "aaaaa",
  "aaaaaa",
  "asdf",
  "asdfgh",
  "qwerty",
  "none",
  "null",
  "fake",
  "demo",
  "example",
  "mygoogle",
  "sample",
]);

export async function verifyGoogleEmailAccount(
  email: string,
  googleAccessToken?: string
): Promise<{ valid: boolean; reason?: string; verifiedName?: string; verifiedEmail?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. If a real Google OAuth / Supabase access_token or id_token is provided, verify directly with Google!
  if (googleAccessToken) {
    try {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      if (userInfoRes.ok) {
        const profile = (await userInfoRes.json()) as { email?: string; name?: string; email_verified?: boolean };
        if (profile.email) {
          return {
            valid: true,
            verifiedEmail: profile.email.toLowerCase(),
            verifiedName: profile.name || profile.email.split("@")[0],
          };
        }
      }
    } catch {
      // Fall through to tokeninfo check
    }
  }

  // 2. Basic email format check
  const parts = cleanEmail.split("@");
  if (parts.length !== 2) {
    return { valid: false, reason: "รูปแบบอีเมลไม่ถูกต้อง" };
  }
  const [localPart, domain] = parts;

  // 3. Only allow @gmail.com, @googlemail.com, or verified Google Workspace / University (.ac.th) domains
  const isGmail = domain === "gmail.com" || domain === "googlemail.com";
  const isAcademic = domain.endsWith(".ac.th") || domain.endsWith(".edu");

  if (BLOCKED_FAKE_USERNAMES.has(localPart) || /^(.)\1{4,}$/.test(localPart)) {
    return {
      valid: false,
      reason: `ไม่สามารถใช้อีเมลทดสอบหรืออีเมลจำลอง (${cleanEmail}) ได้ กรุณาใช้บัญชี Gmail จริงของคุณ`,
    };
  }

  if (isGmail) {
    // Google's strict Gmail username rules:
    // - Must be 6 to 30 characters long
    // - Only letters (a-z), numbers (0-9), and periods (.)
    // - Cannot start or end with a period, nor have consecutive periods (..)
    // - Cannot be purely digits of short length
    if (localPart.length < 6 || localPart.length > 30) {
      return {
        valid: false,
        reason: "บัญชี Gmail จริงต้องมีชื่อผู้ใช้ (หน้า @gmail.com) ความยาวตั้งแต่ 6 ถึง 30 ตัวอักษร ตามมาตรฐานของ Google",
      };
    }
    if (!/^[a-z0-9.]+$/.test(localPart) || localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) {
      return {
        valid: false,
        reason: "รูปแบบชื่อบัญชี Gmail ไม่ถูกต้องตามมาตรฐาน Google (ใช้ได้เฉพาะ a-z, 0-9 และจุด . เท่านั้น)",
      };
    }
    if (/^\d+$/.test(localPart)) {
      return {
        valid: false,
        reason: "ไม่พบบัญชี Gmail ที่เป็นตัวเลขล้วน กรุณาระบุบัญชี Gmail จริงของคุณ",
      };
    }
  } else if (!isAcademic) {
    // Check DNS MX records to verify the domain actually uses Google Workspace mail servers!
    try {
      const mxRecords = await dns.resolveMx(domain);
      const hasGoogleMx = mxRecords.some(
        r =>
          r.exchange.toLowerCase().includes("google.com") ||
          r.exchange.toLowerCase().includes("googlemail.com")
      );
      if (!hasGoogleMx) {
        return {
          valid: false,
          reason: `โดเมน @${domain} ไม่ได้เชื่อมต่อกับระบบบัญชี Google (Gmail / Google Workspace) กรุณาใช้อีเมล @gmail.com หรืออีเมลมหาวิทยาลัย (@rmutl.ac.th)`,
        };
      }
    } catch {
      return {
        valid: false,
        reason: `ไม่พบเซิร์ฟเวอร์อีเมลของโดเมน @${domain} กรุณาใช้อีเมล @gmail.com ที่มีอยู่จริง`,
      };
    }
  } else {
    // Verify .ac.th domain has valid MX records
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return { valid: false, reason: `ไม่พบระบบอีเมลของโดเมน @${domain}` };
      }
    } catch {
      return { valid: false, reason: `โดเมน @${domain} ไม่มีอยู่จริงในระบบอินเทอร์เน็ต` };
    }
  }

  return { valid: true, verifiedEmail: cleanEmail };
}

export const SUPABASE_SQL_SCHEMA = `-- คัดลอกคำสั่ง SQL นี้ไปรันใน Supabase SQL Editor (https://supabase.com/dashboard)
-- เพื่อสร้างตารางเก็บข้อมูลผู้เข้าอบรม การชำระเงิน การเข้าเรียน และใบประกาศนียบัตรออนไลน์

CREATE TABLE IF NOT EXISTS public.trainee_applications (
  id BIGINT PRIMARY KEY,
  user_id BIGINT,
  course_id INTEGER NOT NULL,
  course_slug TEXT NOT NULL,
  course_title TEXT NOT NULL,
  course_duration TEXT NOT NULL,
  course_tuition INTEGER NOT NULL DEFAULT 0,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  national_id TEXT,
  occupation TEXT,
  experience TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_amount INTEGER DEFAULT 0,
  payment_ref TEXT,
  paid_at TIMESTAMPTZ,
  attendance_progress INTEGER NOT NULL DEFAULT 0,
  attendance_status TEXT NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  certificate_issued BOOLEAN NOT NULL DEFAULT FALSE,
  certificate_no TEXT,
  certificate_issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- เปิดสิทธิ์ให้ระบบอ่านและบันทึกข้อมูลผ่าน API ได้
ALTER TABLE public.trainee_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access to trainee_applications" ON public.trainee_applications;
CREATE POLICY "Allow public full access to trainee_applications"
  ON public.trainee_applications
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trainee_applications_email ON public.trainee_applications(email);
CREATE INDEX IF NOT EXISTS idx_trainee_applications_certificate_no ON public.trainee_applications(certificate_no);
`;
