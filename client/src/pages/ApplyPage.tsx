import { useAuth } from "@/_core/hooks/useAuth";
import { upsertLocalApplication } from "@/lib/traineeStore";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function ApplyPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: course, isLoading } = trpc.courses.getBySlug.useQuery({ slug });

  const [submitted, setSubmitted] = useState(false);
  const [createdApp, setCreatedApp] = useState<any>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    nationalId: "",
    occupation: "",
    experience: "",
    message: "",
  });

  // Auto-fill from logged in Google user
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        fullName: prev.fullName || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  const apply = trpc.applications.create.useMutation({
    onSuccess: async (res) => {
      if (res.application) {
        upsertLocalApplication(res.application);
        setCreatedApp(res.application);
      }
      await utils.dashboard.overview.invalidate();
      await utils.admin.listApplications.invalidate();
      toast.success("บันทึกใบสมัครเข้าสู่ระบบเรียบร้อยแล้ว!");
      setSubmitted(true);
    },
    onError: error => toast.error(error.message || "ส่งใบสมัครไม่สำเร็จ"),
  });

  const update =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(previous => ({ ...previous, [field]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!course) return;
    apply.mutate({ ...form, courseSlug: course.slug });
  };

  if (isLoading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f8fb] text-slate-500">
        กำลังเตรียมแบบฟอร์ม…
      </div>
    );
  if (!course)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f8fb]">
        <Link href="/courses" className="font-semibold text-[#7b1313]">
          กลับไปดูหลักสูตรทั้งหมด
        </Link>
      </div>
    );

  if (submitted)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f8fb] px-6 py-12">
        <div className="max-w-lg w-full rounded-3xl border bg-white p-8 sm:p-10 text-center shadow-xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={34} />
          </div>
          <h1 className="mt-6 font-serif text-3xl font-bold text-[#7b1313]">
            บันทึกใบสมัครเรียบร้อยแล้ว
          </h1>
          <p className="mt-3 leading-7 text-slate-600 text-sm">
            ข้อมูลการสมัครหลักสูตร <strong>{course.title}</strong> ของคุณถูกบันทึกเข้าสู่ระบบสมาชิกเรียบร้อยแล้ว
          </p>
          {createdApp && (
            <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-left text-xs space-y-1.5 text-slate-700">
              <div>
                <span className="font-bold text-slate-900">รหัสใบสมัคร:</span> #{createdApp.id}
              </div>
              <div>
                <span className="font-bold text-slate-900">ชื่อผู้เข้าอบรม:</span> {createdApp.fullName}
              </div>
              <div>
                <span className="font-bold text-slate-900">อีเมลบัญชีสมาชิก:</span> {createdApp.email}
              </div>
              <div>
                <span className="font-bold text-slate-900">สถานะปัจจุบัน:</span>{" "}
                <span className="text-amber-700 font-semibold">รอเจ้าหน้าที่ยืนยันการสมัครและชำระเงิน</span>
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="rounded-xl bg-[#7b1313] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#921a1a]"
            >
              ไปที่หน้าแดชบอร์ดสมาชิกของฉัน
            </Link>
            <Link
              href={`/courses/${course.slug}`}
              className="rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              กลับไปดูหลักสูตร
            </Link>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#11243d]">
      <header className="border-b bg-white">
        <div className="container flex h-20 items-center justify-between">
          <Link
            href={`/courses/${course.slug}`}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#7b1313]"
          >
            <ArrowLeft size={17} /> กลับรายละเอียดหลักสูตร
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xs font-semibold text-[#7b1313] hover:underline">
              แดชบอร์ดสมาชิก
            </Link>
            <Link href="/" className="flex items-center gap-3">
              <img src="/rmutl-logo.jpg" alt="Logo" className="h-10 w-auto object-contain" />
              <span className="font-serif text-lg font-bold text-[#7b1313]">มทร.ล้านนา เชียงราย</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="container grid gap-10 py-14 lg:grid-cols-[.75fr_1.25fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c0392b]">Application form</p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-bold leading-tight text-[#7b1313]">
            ลงทะเบียน<br />เข้าอบรม
          </h1>
          <p className="mt-6 leading-8 text-slate-600">
            กรอกข้อมูลผู้เข้าอบรมเพื่อบันทึกในฐานข้อมูลผู้เรียน และใช้สำหรับออกใบประกาศนียบัตรออนไลน์เมื่อจบหลักสูตร
          </p>
          <div className="mt-8 rounded-3xl bg-[#7b1313] p-7 text-white shadow-lg">
            <div className="text-xs uppercase tracking-[0.16em] text-[#f5c842]">หลักสูตรที่เลือก</div>
            <div className="mt-3 font-serif text-2xl font-bold">{course.title}</div>
            <div className="mt-3 text-sm text-white/75">
              {course.duration} · {course.mode}
            </div>
            <div className="mt-4 pt-4 border-t border-white/15 text-sm font-semibold text-[#f5c842]">
              ค่าลงทะเบียน: {course.tuition === 0 ? "ฟรี" : `${course.tuition.toLocaleString("th-TH")} บาท`}
            </div>
          </div>

          {user && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-800 flex items-start gap-2.5">
              <ShieldCheck size={18} className="shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <div className="font-bold">เชื่อมต่อบัญชีสมาชิกแล้ว</div>
                <div className="mt-0.5">
                  ใบสมัครนี้จะผูกกับบัญชี <strong>{user.email}</strong> และแสดงในหน้าแดชบอร์ดสมาชิกของคุณทันที
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="rounded-3xl border bg-white p-6 shadow-sm sm:p-9">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
              ชื่อ-นามสกุล (คำนำหน้า + ชื่อ-สกุลจริง สำหรับออกใบประกาศนียบัตร) *
              <input
                required
                value={form.fullName}
                onChange={update("fullName")}
                placeholder="เช่น นายสมชาย ใจดี"
                className="rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              อีเมล Google (Gmail) ที่ใช้ล็อกอิน *
              <input
                required
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="yourname@gmail.com"
                className="rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              เบอร์โทรศัพท์ติดต่อ *
              <input
                required
                value={form.phone}
                onChange={update("phone")}
                placeholder="08x-xxx-xxxx"
                className="rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              เลขบัตรประจำตัวประชาชน (สำหรับทะเบียนใบประกาศ)
              <input
                value={form.nationalId}
                onChange={update("nationalId")}
                maxLength={13}
                placeholder="เลข 13 หลัก"
                className="rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              อาชีพ / หน่วยงาน / สถานศึกษา
              <input
                value={form.occupation}
                onChange={update("occupation")}
                placeholder="ระบุอาชีพหรือหน่วยงานของคุณ"
                className="rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
              ประสบการณ์หรือเป้าหมายการเรียนรู้
              <textarea
                value={form.experience}
                onChange={update("experience")}
                rows={3}
                placeholder="เล่าให้เราฟังสั้น ๆ ว่าคุณอยากนำความรู้ไปใช้เรื่องใด"
                className="resize-none rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
              ข้อความเพิ่มเติม (ถ้ามี)
              <textarea
                value={form.message}
                onChange={update("message")}
                rows={2}
                placeholder="คำถามหรือข้อมูลเพิ่มเติม เช่น ขอใบกำกับภาษี"
                className="resize-none rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20"
              />
            </label>
          </div>
          <button
            disabled={apply.isPending}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7b1313] px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-[#921a1a] shadow-md disabled:opacity-60"
          >
            {apply.isPending ? (
              <>
                <Loader2 size={17} className="animate-spin" /> กำลังบันทึกข้อมูลผู้เข้าอบรม…
              </>
            ) : (
              <>
                ยืนยันการสมัครเรียน <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
