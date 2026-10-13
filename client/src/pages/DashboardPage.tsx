import CertificateModal from "@/components/CertificateModal";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLocalApplications, saveLocalApplications, upsertLocalApplication } from "@/lib/traineeStore";
import { trpc } from "@/lib/trpc";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  LogOut,
  PlayCircle,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "รอยืนยันการสมัคร", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    reviewing: { label: "กำลังพิจารณา", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    accepted: { label: "ยืนยันการสมัครแล้ว", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "ไม่ผ่านการอนุมัติ", cls: "bg-red-50 text-red-700 border-red-200" },
  };
  return map[status] ?? { label: status, cls: "bg-slate-100 text-slate-700 border-slate-200" };
}

function paymentBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    unpaid: { label: "รอชำระค่าลงทะเบียน", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    pending_verification: {
      label: "แจ้งโอนแล้ว (รอตรวจสอบ)",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
    },
    paid: { label: "ชำระเงินเรียบร้อยแล้ว", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  };
  return map[status] ?? { label: status, cls: "bg-slate-100 text-slate-700 border-slate-200" };
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();
  const [cachedApps] = useState(() => getLocalApplications());
  const [selectedCertApp, setSelectedCertApp] = useState<any | null>(null);
  const [paymentModalApp, setPaymentModalApp] = useState<any | null>(null);
  const [paymentRefInput, setPaymentRefInput] = useState("");

  const { data, isLoading, refetch } = trpc.dashboard.overview.useQuery({
    cachedApplications: cachedApps,
  });

  useEffect(() => {
    if (data?.allSyncedApplications) {
      saveLocalApplications(data.allSyncedApplications);
    }
  }, [data?.allSyncedApplications]);

  const submitPaymentMutation = trpc.applications.submitPayment.useMutation({
    onSuccess: async (res) => {
      if (res.application) {
        upsertLocalApplication(res.application);
      }
      toast.success("ส่งข้อมูลแจ้งชำระเงินเรียบร้อยแล้ว รอเจ้าหน้าที่ยืนยัน");
      setPaymentModalApp(null);
      setPaymentRefInput("");
      await utils.dashboard.overview.invalidate();
      refetch();
    },
    onError: (err) => toast.error(err.message || "ไม่สามารถบันทึกข้อมูลได้"),
  });

  if (isLoading)
    return (
      <div className="grid min-h-[70vh] place-items-center text-slate-500">
        กำลังโหลดข้อมูลสมาชิกของคุณ…
      </div>
    );

  const applications = data?.applications ?? [];
  const enrollments = data?.enrollments ?? [];
  const events = data?.events ?? [];
  const issuedCertificates = applications.filter(item => item.application.certificateIssued);

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#11243d]">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-white px-5 py-4 lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">
            Member & Trainee Portal
          </p>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-[#7b1313]">
            สวัสดี, {user?.name || "ผู้เข้าอบรม"}
          </h1>
          {user?.email && (
            <p className="text-xs text-slate-500 mt-0.5">
              บัญชี Google ที่เชื่อมต่อ: <span className="font-semibold text-slate-700">{user.email}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/courses"
            className="rounded-full bg-[#fdf0f0] px-4 py-2 text-xs font-bold text-[#7b1313] hover:bg-[#f9dede]"
          >
            + สมัครเรียนหลักสูตรเพิ่ม
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-full border border-[#7b1313]/30 bg-white px-4 py-2 text-xs font-bold text-[#7b1313] hover:bg-[#7b1313] hover:text-white transition-colors"
          >
            <ShieldAlert size={14} /> ระบบจัดการหลังบ้าน (Admin)
          </Link>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-[#7b1313] hover:text-[#7b1313] transition-colors"
          >
            <LogOut size={14} /> ออกจากระบบ
          </button>
        </div>
      </div>

      <main className="p-5 lg:p-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-[#7b1313] p-6 text-white shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">หลักสูตรที่สมัครไว้</span>
              <FileText size={22} className="text-[#f5c842]" />
            </div>
            <div className="mt-4 font-serif text-4xl font-bold">{applications.length}</div>
            <div className="mt-1 text-xs text-white/65">รายการในบัญชีนี้</div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">กำลังศึกษา / อนุมัติแล้ว</span>
              <PlayCircle size={22} className="text-[#c0392b]" />
            </div>
            <div className="mt-4 font-serif text-4xl font-bold text-[#7b1313]">
              {enrollments.length}
            </div>
            <div className="mt-1 text-xs text-slate-400">หลักสูตร</div>
          </div>

          <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-[#fffdf5] to-[#fef9e7] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-amber-900">ใบประกาศนียบัตรของฉัน</span>
              <Award size={24} className="text-[#d4a017]" />
            </div>
            <div className="mt-4 font-serif text-4xl font-bold text-[#7b1313]">
              {issuedCertificates.length}
            </div>
            <div className="mt-1 text-xs text-amber-700">ใบประกาศออนไลน์ที่พร้อมดาวน์โหลด</div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">กิจกรรมที่กำลังจะมาถึง</span>
              <CalendarDays size={22} className="text-[#c0392b]" />
            </div>
            <div className="mt-4 font-serif text-4xl font-bold text-[#7b1313]">{events.length}</div>
            <div className="mt-1 text-xs text-slate-400">กิจกรรม</div>
          </div>
        </div>

        {/* Section 1: Online Certificates (Highlighted if any certificate is issued) */}
        {issuedCertificates.length > 0 && (
          <section className="rounded-3xl border-2 border-[#e5c158] bg-gradient-to-r from-[#fffdf6] via-white to-[#fdf8e8] p-6 sm:p-7 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#7b1313] text-[#f5c842] shadow">
                  <Award size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#a17b37]">
                      Official e-Certificate
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      <Sparkles size={11} /> ผ่านการอบรมครบหลักสูตรแล้ว
                    </span>
                  </div>
                  <h2 className="mt-0.5 font-serif text-2xl font-bold text-[#7b1313]">
                    ใบประกาศนียบัตรออนไลน์ของคุณ
                  </h2>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {issuedCertificates.map(({ application }) => (
                <div
                  key={application.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e5c158]/60 bg-white p-5 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#a17b37]">
                        เลขทะเบียน: {application.certificateNo}
                      </span>
                      <span className="text-xs text-slate-400">
                        ออกเมื่อ {formatDate(application.certificateIssuedAt)}
                      </span>
                    </div>
                    <h3 className="mt-2 font-serif text-lg font-bold text-[#11243d]">
                      {application.courseTitle}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">
                      ผู้ผ่านการอบรม: <strong>{application.fullName}</strong> ({application.courseDuration})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCertApp(application)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7b1313] py-3 text-xs font-bold text-[#f5c842] shadow hover:bg-[#921a1a] transition-all"
                  >
                    <Award size={16} /> เปิดดูและดาวน์โหลดใบประกาศนียบัตรออนไลน์
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 2: Applications & Training Status */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-[#c0392b]" />
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#7b1313]">
                  รายการหลักสูตรที่สมัครและสถานะการอบรม
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                  ติดตามสถานะการยืนยันใบสมัคร การชำระเงิน ความคืบหน้าการเข้าเรียน และการรับใบประกาศนียบัตร
                </p>
              </div>
            </div>
            <Link
              href="/courses"
              className="rounded-xl bg-[#7b1313] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#921a1a]"
            >
              + สมัครหลักสูตรเพิ่มเติม
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {applications.length > 0 ? (
              applications.map(({ application, course }) => {
                const appBadge = statusBadge(application.status);
                const payBadge = paymentBadge(application.paymentStatus);
                return (
                  <div
                    key={application.id}
                    className="rounded-2xl border border-slate-200/90 bg-[#fbfcfe] p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-slate-200/70 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-700">
                            รหัส #{application.id}
                          </span>
                          <span className="text-xs text-slate-500">
                            สมัครเมื่อ {formatDate(application.createdAt)}
                          </span>
                        </div>
                        <h3 className="mt-2 font-serif text-xl font-bold text-[#7b1313]">
                          {course?.title || application.courseTitle}
                        </h3>
                        <p className="mt-1 text-xs text-slate-600">
                          ผู้เข้าอบรม: <strong>{application.fullName}</strong> · อีเมล: {application.email} · โทร:{" "}
                          {application.phone}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${appBadge.cls}`}
                        >
                          1. {appBadge.label}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${payBadge.cls}`}
                        >
                          2. {payBadge.label}
                        </span>
                      </div>
                    </div>

                    {/* Step Progress & Actions */}
                    <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_1fr] items-center">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">
                            3. ความคืบหน้าการเข้าเรียน (Attendance & Progress)
                          </span>
                          <span className="font-bold text-[#7b1313]">
                            {application.attendanceProgress}%{" "}
                            {application.attendanceProgress >= 100
                              ? "(เข้าเรียนครบหลักสูตรแล้ว)"
                              : application.attendanceProgress > 0
                                ? "(กำลังเข้าศึกษา)"
                                : "(รอเริ่มการอบรม)"}
                          </span>
                        </div>
                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#7b1313] to-[#10b981] transition-all duration-500"
                            style={{ width: `${application.attendanceProgress}%` }}
                          />
                        </div>
                        {application.paymentRef && (
                          <div className="mt-2 text-[11px] text-slate-500">
                            หลักฐานการชำระเงิน: <span className="font-semibold">{application.paymentRef}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2.5">
                        {application.paymentStatus === "unpaid" && (
                          <button
                            onClick={() => {
                              setPaymentModalApp(application);
                              setPaymentRefInput("");
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
                          >
                            <CreditCard size={14} /> แจ้งชำระเงินค่าอบรม
                          </button>
                        )}

                        {application.certificateIssued ? (
                          <button
                            onClick={() => setSelectedCertApp(application)}
                            className="flex items-center gap-1.5 rounded-xl bg-[#7b1313] px-4 py-2.5 text-xs font-bold text-[#f5c842] shadow hover:bg-[#921a1a]"
                          >
                            <Award size={15} /> ดูใบประกาศนียบัตรออนไลน์
                          </button>
                        ) : (
                          <span className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-500">
                            4. ใบประกาศนียบัตร: รอเข้าเรียนครบ 100% และอนุมัติจาก Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <p className="text-sm font-semibold text-slate-600">
                  คุณยังไม่มีรายการสมัครหลักสูตรในบัญชีนี้
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  เลือกหลักสูตรที่สนใจและกดสมัครเรียน ข้อมูลจะแสดงในหน้านี้ทันที
                </p>
                <Link
                  href="/courses"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7b1313] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#921a1a]"
                >
                  ค้นหาและสมัครหลักสูตรอบรม <PlayCircle size={15} />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Upcoming Events */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">Upcoming</p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-[#7b1313]">
              ปฏิทินการอบรมและกิจกรรม
            </h2>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {events.map(event => (
              <div key={event.id} className="flex gap-4 rounded-2xl border bg-[#fbfcfe] p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fdf0f0] text-center text-[#7b1313]">
                  <div className="text-lg font-bold leading-none">
                    {new Date(event.startAt).getDate()}
                  </div>
                  <div className="mt-1 text-[10px]">
                    {new Intl.DateTimeFormat("th-TH", { month: "short" }).format(
                      new Date(event.startAt)
                    )}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{event.title}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Clock3 size={13} />{" "}
                    {new Intl.DateTimeFormat("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(event.startAt))}{" "}
                    น. · {event.location}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Payment Notification Modal */}
      {paymentModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-[#7b1313]">
              แจ้งชำระค่าลงทะเบียนอบรม
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              หลักสูตร: <strong>{paymentModalApp.courseTitle}</strong>
            </p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs space-y-1 border border-slate-200">
              <div className="font-bold text-slate-800">
                บัญชีธนาคารสำหรับโอนชำระค่าลงทะเบียน:
              </div>
              <div>ธนาคารกรุงไทย สาขาเชียงราย</div>
              <div>ชื่อบัญชี: มทร.ล้านนา เชียงราย (โครงการบริการวิชาการ)</div>
              <div className="font-bold text-[#7b1313] text-sm pt-1">
                ยอดชำระ: {Number(paymentModalApp.courseTuition || 0).toLocaleString("th-TH")} บาท
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-700">
                ระบุเลขที่อ้างอิงสลิป / ธนาคารและเวลาโอน *
              </label>
              <input
                type="text"
                value={paymentRefInput}
                onChange={e => setPaymentRefInput(e.target.value)}
                placeholder="เช่น KBank 13/10/2569 เวลา 10:30 น. รหัส 49201"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#7b1313]"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setPaymentModalApp(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                disabled={!paymentRefInput.trim() || submitPaymentMutation.isPending}
                onClick={() =>
                  submitPaymentMutation.mutate({
                    applicationId: paymentModalApp.id,
                    paymentRef: paymentRefInput,
                    paymentAmount: paymentModalApp.courseTuition,
                    fallbackRecord: paymentModalApp,
                  })
                }
                className="flex items-center gap-1.5 rounded-xl bg-[#7b1313] px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-[#921a1a] disabled:opacity-50"
              >
                <Send size={14} /> ยืนยันแจ้งชำระเงิน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Certificate Modal */}
      {selectedCertApp && (
        <CertificateModal
          application={selectedCertApp}
          onClose={() => setSelectedCertApp(null)}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}
