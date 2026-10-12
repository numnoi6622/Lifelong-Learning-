import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CalendarDays, CheckCircle2, Clock3, FileText, LogOut, PlayCircle } from "lucide-react";
import { Link } from "wouter";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function statusLabel(status: string) {
  return ({ pending: "รอตรวจสอบ", reviewing: "กำลังพิจารณา", accepted: "ผ่านการคัดเลือก", rejected: "ไม่ผ่านการคัดเลือก" } as Record<string, string>)[status] ?? status;
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const { data, isLoading } = trpc.dashboard.overview.useQuery();
  if (isLoading) return <div className="grid min-h-[70vh] place-items-center text-slate-500">กำลังโหลดข้อมูลของคุณ…</div>;
  const applications = data?.applications ?? [];
  const enrollments = data?.enrollments ?? [];
  const events = data?.events ?? [];

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#11243d]">
      <div className="flex items-center justify-between border-b bg-white px-5 py-4 lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">Student portal</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-[#7b1313]">สวัสดี, {user?.name || "ผู้เรียน"}</h1>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-[#7b1313] hover:text-[#7b1313] transition-colors"
        >
          <LogOut size={16} /> ออกจากระบบ
        </button>
      </div>

      <main className="p-5 lg:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-[#7b1313] p-6 text-white shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/75">หลักสูตรที่กำลังเรียน</span>
              <PlayCircle size={22} className="text-[#f5c842]" />
            </div>
            <div className="mt-5 font-serif text-4xl font-bold">{enrollments.length}</div>
            <div className="mt-1 text-xs text-white/60">หลักสูตร</div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">ใบสมัครของฉัน</span>
              <FileText size={22} className="text-[#c0392b]" />
            </div>
            <div className="mt-5 font-serif text-4xl font-bold text-[#7b1313]">{applications.length}</div>
            <div className="mt-1 text-xs text-slate-400">รายการ</div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">กิจกรรมที่กำลังจะมาถึง</span>
              <CalendarDays size={22} className="text-[#c0392b]" />
            </div>
            <div className="mt-5 font-serif text-4xl font-bold text-[#7b1313]">{events.length}</div>
            <div className="mt-1 text-xs text-slate-400">กิจกรรม</div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">Learning history</p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-[#7b1313]">ประวัติการเรียน</h2>
              </div>
              <Link href="/courses" className="text-sm font-semibold text-[#c0392b] hover:underline">
                ค้นหาหลักสูตร
              </Link>
            </div>

            <div className="mt-6 grid gap-3">
              {enrollments.length ? enrollments.map(item => (
                <div key={item.enrollment.id} className="rounded-2xl border bg-[#fbfcfe] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900">{item.course?.title ?? "หลักสูตรของฉัน"}</div>
                      <div className="mt-1 text-xs text-slate-500">เริ่มเรียน {formatDate(item.enrollment.startedAt)}</div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {item.enrollment.progress}%
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#c0392b]" style={{ width: `${item.enrollment.progress}%` }} />
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-500">ยังไม่มีประวัติการเรียนในระบบ</p>
                  <Link href="/courses" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#7b1313] hover:text-[#c0392b]">
                    เริ่มค้นหาหลักสูตร <PlayCircle size={16} />
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c0392b]">Upcoming</p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-[#7b1313]">ปฏิทินกิจกรรม</h2>
            </div>
            <div className="mt-6 grid gap-3">
              {events.slice(0, 4).map(event => (
                <div key={event.id} className="flex gap-4 rounded-2xl border bg-[#fbfcfe] p-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fdf0f0] text-center text-[#7b1313]">
                    <div className="text-lg font-bold leading-none">{new Date(event.startAt).getDate()}</div>
                    <div className="mt-1 text-[10px]">{new Intl.DateTimeFormat("th-TH", { month: "short" }).format(new Date(event.startAt))}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{event.title}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Clock3 size={13} /> {new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.startAt))} น. · {event.location}
                    </div>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  ยังไม่มีกิจกรรมที่กำลังจะมาถึง
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-[#c0392b]" />
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#7b1313]">สถานะการสมัครเรียน</h2>
              <p className="mt-1 text-sm text-slate-500">ติดตามความคืบหน้าของใบสมัครทั้งหมดจากหน้านี้</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {applications.length ? applications.map(item => (
              <div key={item.application.id} className="rounded-2xl border bg-[#fbfcfe] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-900">{item.course?.title ?? "หลักสูตร"}</div>
                    <div className="mt-1 text-xs text-slate-500">ส่งใบสมัครเมื่อ {formatDate(item.application.createdAt)}</div>
                  </div>
                  <span className="rounded-full bg-[#fdf0f0] px-3 py-1 text-xs font-semibold text-[#c0392b]">
                    {statusLabel(item.application.status)}
                  </span>
                </div>
              </div>
            )) : (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                คุณยังไม่มีใบสมัครในระบบ
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function DashboardPage() { return <DashboardLayout><DashboardContent /></DashboardLayout>; }
