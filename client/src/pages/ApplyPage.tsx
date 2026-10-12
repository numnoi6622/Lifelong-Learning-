import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function ApplyPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: course, isLoading } = trpc.courses.getBySlug.useQuery({ slug });
  const apply = trpc.applications.create.useMutation({ onSuccess: () => setSubmitted(true), onError: error => toast.error(error.message || "ส่งใบสมัครไม่สำเร็จ") });
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", occupation: "", experience: "", message: "" });
  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(previous => ({ ...previous, [field]: event.target.value }));
  const submit = (event: FormEvent) => { event.preventDefault(); if (!course) return; apply.mutate({ ...form, courseSlug: course.slug }); };

  if (isLoading) return <div className="grid min-h-screen place-items-center bg-[#f7f8fb] text-slate-500">กำลังเตรียมแบบฟอร์ม…</div>;
  if (!course) return <div className="grid min-h-screen place-items-center bg-[#f7f8fb]"><Link href="/courses" className="font-semibold text-[#a17b37]">กลับไปดูหลักสูตรทั้งหมด</Link></div>;
  if (submitted) return <div className="grid min-h-screen place-items-center bg-[#f7f8fb] px-6"><div className="max-w-lg rounded-3xl border bg-white p-10 text-center shadow-xl"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={34} /></div><h1 className="mt-6 font-serif text-3xl font-bold text-[#7b1313]">ส่งใบสมัครเรียบร้อย</h1><p className="mt-4 leading-7 text-slate-600">ทีมงาน มทร.ล้านนา เชียงราย ได้รับข้อมูลของคุณแล้ว เราจะติดต่อกลับเพื่อยืนยันรายละเอียดและขั้นตอนถัดไป</p><div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"><Link href={`/courses/${course.slug}`} className="rounded-full border px-5 py-3 text-sm font-semibold text-[#7b1313]">กลับไปดูหลักสูตร</Link><Link href="/dashboard" className="rounded-full bg-[#7b1313] px-5 py-3 text-sm font-semibold text-white hover:bg-[#921a1a]">ไปแดชบอร์ด</Link></div></div></div>;

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#11243d]">
      <header className="border-b bg-white">
        <div className="container flex h-20 items-center justify-between">
          <Link href={`/courses/${course.slug}`} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#7b1313]">
            <ArrowLeft size={17} /> กลับรายละเอียดหลักสูตร
          </Link>
          <Link href="/" className="flex items-center gap-3">
            <img src="/rmutl-logo.jpg" alt="Logo" className="h-10 w-auto object-contain" />
            <span className="font-serif text-lg font-bold text-[#7b1313]">มทร.ล้านนา เชียงราย</span>
          </Link>
        </div>
      </header>
      <main className="container grid gap-10 py-14 lg:grid-cols-[.75fr_1.25fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c0392b]">Application form</p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-bold leading-tight text-[#7b1313]">
            สมัครเรียน<br />กับเรา
          </h1>
          <p className="mt-6 leading-8 text-slate-600">
            กรอกข้อมูลเบื้องต้นเพื่อให้ทีมงานติดต่อกลับและแนะนำขั้นตอนการสมัครที่เหมาะกับคุณ
          </p>
          <div className="mt-8 rounded-3xl bg-[#7b1313] p-7 text-white shadow-lg">
            <div className="text-xs uppercase tracking-[0.16em] text-[#f5c842]">หลักสูตรที่เลือก</div>
            <div className="mt-3 font-serif text-2xl font-bold">{course.title}</div>
            <div className="mt-3 text-sm text-white/75">{course.duration} · {course.mode}</div>
            <div className="mt-4 pt-4 border-t border-white/15 text-sm font-semibold text-[#f5c842]">
              ค่าลงทะเบียน: {course.tuition === 0 ? "ฟรี" : `${course.tuition.toLocaleString("th-TH")} บาท`}
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-3xl border bg-white p-6 shadow-sm sm:p-9">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
              ชื่อ-นามสกุล
              <input required value={form.fullName} onChange={update("fullName")} placeholder="เช่น สมชาย ใจดี" className="rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              อีเมล
              <input required type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" className="rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              เบอร์โทรศัพท์
              <input required value={form.phone} onChange={update("phone")} placeholder="08x-xxx-xxxx" className="rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
              อาชีพ / หน่วยงาน
              <input value={form.occupation} onChange={update("occupation")} placeholder="ระบุอาชีพหรือหน่วยงานของคุณ" className="rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
              ประสบการณ์หรือเป้าหมายการเรียนรู้
              <textarea value={form.experience} onChange={update("experience")} rows={3} placeholder="เล่าให้เราฟังสั้น ๆ ว่าคุณอยากนำความรู้ไปใช้เรื่องใด" className="resize-none rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
              ข้อความเพิ่มเติม (ถ้ามี)
              <textarea value={form.message} onChange={update("message")} rows={3} placeholder="คำถามหรือข้อมูลเพิ่มเติม" className="resize-none rounded-xl border bg-[#fbfcfe] px-4 py-3 font-normal outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20" />
            </label>
          </div>
          <button disabled={apply.isPending} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7b1313] px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-[#921a1a] shadow-md disabled:opacity-60">
            {apply.isPending ? <><Loader2 size={17} className="animate-spin" /> กำลังส่งข้อมูล…</> : <>ส่งใบสมัคร <ArrowRight size={17} /></>}
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-slate-400">
            ข้อมูลของคุณจะถูกใช้เพื่อการติดต่อเกี่ยวกับหลักสูตรนี้เท่านั้น
          </p>
        </form>
      </main>
    </div>
  );
}
