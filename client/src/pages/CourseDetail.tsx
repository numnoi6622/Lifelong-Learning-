import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, WalletCards } from "lucide-react";
import { Link, useParams } from "wouter";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "เร็ว ๆ นี้";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

export default function CourseDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: course, isLoading } = trpc.courses.getBySlug.useQuery({ slug });
  if (isLoading) return <div className="grid min-h-screen place-items-center bg-[#f7f8fb] text-slate-500">กำลังโหลดรายละเอียดหลักสูตร…</div>;
  if (!course) return <div className="grid min-h-screen place-items-center bg-[#f7f8fb]"><div className="text-center"><h1 className="font-serif text-4xl font-bold text-[#7b1313]">ไม่พบหลักสูตร</h1><Link href="/courses" className="mt-5 inline-flex items-center gap-2 font-semibold text-[#c0392b]">กลับไปดูหลักสูตรทั้งหมด <ArrowRight size={16} /></Link></div></div>;

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#11243d]">
      <header className="border-b bg-white">
        <div className="container flex h-20 items-center justify-between">
          <Link href="/courses" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#7b1313]">
            <ArrowLeft size={17} /> หลักสูตรทั้งหมด
          </Link>
          <Link href="/" className="flex items-center gap-3">
            <img src="/rmutl-logo.jpg" alt="Logo" className="h-10 w-auto object-contain" />
            <span className="font-serif text-xl font-bold text-[#7b1313]">มทร.ล้านนา เชียงราย</span>
          </Link>
        </div>
      </header>
      <main>
        <section className="bg-[#7b1313] text-white">
          <div className="container grid gap-10 py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <span className="rounded-full bg-[#f5c842] px-3.5 py-1 text-xs font-bold text-[#4a0000]">
                {course.category}
              </span>
              <h1 className="mt-6 font-serif text-3xl font-bold leading-tight sm:text-5xl">
                {course.title}
              </h1>
              <p className="mt-6 max-w-2xl text-base sm:text-lg leading-8 text-white/80">
                {course.shortDescription}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href={`/apply/${course.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#f5c842] px-6 py-3.5 text-sm font-bold text-[#4a0000] hover:bg-[#fed749] shadow-lg"
                >
                  สมัครเรียนหลักสูตรนี้ <ArrowRight size={17} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  เข้าสู่ระบบผู้เรียน
                </Link>
              </div>
            </div>
            <img
              src={course.imageUrl ?? "/manus-storage/academy-community_43f6f064.jpg"}
              alt={course.title}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-2xl border-2 border-white/20"
            />
          </div>
        </section>

        <section className="container grid gap-12 py-16 lg:grid-cols-[1fr_340px]">
          <article>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c0392b]">
              รายละเอียดหลักสูตร
            </p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-[#7b1313]">
              โครงสร้างและการเรียนรู้
            </h2>
            <div className="mt-6 whitespace-pre-line text-base leading-8 text-slate-700 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
              {course.description}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                "เรียนรู้จากผู้เชี่ยวชาญในสายงานยานยนต์และไฟฟ้า",
                "ลงมือทำผ่านอุปกรณ์และกรณีศึกษาจริง",
                "รับใบประกาศนียบัตรรับรองเมื่อสำเร็จการอบรม",
                "สร้างเครือข่ายความร่วมมือและชุมชนวิชาชีพ",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-[#c0392b]" />
                  <span className="text-sm leading-6 text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </article>

          <aside className="h-fit rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h3 className="font-serif text-2xl font-bold text-[#7b1313]">
              ข้อมูลหลักสูตร
            </h3>
            <div className="mt-6 grid gap-5 text-sm">
              <div className="flex gap-3">
                <CalendarDays size={18} className="text-[#c0392b] shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-400 text-xs">รุ่นถัดไป</div>
                  <div className="mt-1 font-semibold text-slate-800">{formatDate(course.nextStartAt)}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock3 size={18} className="text-[#c0392b] shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-400 text-xs">ระยะเวลา</div>
                  <div className="mt-1 font-semibold text-slate-800">{course.duration}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin size={18} className="text-[#c0392b] shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-400 text-xs">รูปแบบการเรียน</div>
                  <div className="mt-1 font-semibold text-slate-800">{course.mode}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <WalletCards size={18} className="text-[#c0392b] shrink-0 mt-0.5" />
                <div>
                  <div className="text-slate-400 text-xs">ค่าลงทะเบียน</div>
                  <div className="mt-1 font-bold text-lg text-[#7b1313]">
                    {course.tuition === 0 ? "ไม่มีค่าใช้จ่าย (ฟรี)" : `${course.tuition.toLocaleString("th-TH")} บาท`}
                  </div>
                </div>
              </div>
            </div>

            <Link
              href={`/apply/${course.slug}`}
              className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-[#7b1313] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#921a1a] shadow-md transition-colors"
            >
              กรอกใบสมัครเรียน <ArrowRight size={16} />
            </Link>
          </aside>
        </section>
      </main>
    </div>
  );
}
