import { trpc } from "@/lib/trpc";
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "เร็ว ๆ นี้";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function CoursesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const { data, isLoading } = trpc.courses.list.useQuery();
  const categories = useMemo(() => ["ทั้งหมด", ...Array.from(new Set((data ?? []).map(course => course.category)))], [data]);
  const courses = useMemo(() => (data ?? []).filter(course => (category === "ทั้งหมด" || course.category === category) && `${course.title} ${course.shortDescription}`.toLowerCase().includes(search.toLowerCase())), [category, data, search]);

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#11243d]">
      <header className="border-b bg-white">
        <div className="container flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/rmutl-logo.jpg" alt="Logo" className="h-11 w-auto object-contain" />
            <div>
              <div className="font-serif text-xl font-bold text-[#7b1313]">มทร.ล้านนา เชียงราย</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#c0392b]">Lifelong Learning Platform</div>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-[#7b1313] hover:text-[#c0392b]">
              เข้าสู่ระบบ
            </Link>
            <Link href="/dashboard" className="text-sm font-semibold text-slate-700 hover:text-[#7b1313]">
              แดชบอร์ดผู้เรียน <ArrowRight size={15} className="ml-1 inline" />
            </Link>
          </div>
        </div>
      </header>
      <main className="container py-14">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c0392b]">ค้นหาเส้นทางของคุณ</p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-bold text-[#7b1313]">หลักสูตรทั้งหมด</h1>
          <p className="mt-5 leading-8 text-slate-600">
            เลือกหลักสูตรที่ออกแบบมาเพื่อการเติบโตในแบบของคุณ เรียนรู้จากผู้เชี่ยวชาญและนำไปใช้ได้จริง ทั้งหลักสูตรยานยนต์ไฟฟ้า เทคโนโลยี และการบริหารจัดการ
          </p>
        </div>
        <div className="mt-10 flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm md:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อหลักสูตร หรือทักษะที่สนใจ (เช่น ตู้ชาร์จ, แบตเตอรี่, EV)"
              className="w-full rounded-xl bg-[#f7f8fb] py-3 pl-11 pr-4 text-sm outline-none ring-[#7b1313] focus:ring-2"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <SlidersHorizontal size={17} />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="rounded-xl bg-[#f7f8fb] px-4 py-3 font-medium text-[#7b1313] outline-none"
            >
              {categories.map(item => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? [1, 2, 3].map(item => <div key={item} className="h-96 animate-pulse rounded-2xl bg-slate-200" />)
            : courses.map(course => (
              <article key={course.slug} className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <img
                  src={course.imageUrl ?? "/manus-storage/academy-community_43f6f064.jpg"}
                  alt={course.title}
                  className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="rounded-full bg-[#fdf0f0] px-3 py-1 font-semibold text-[#c0392b]">{course.category}</span>
                    <span className="text-slate-400 font-medium">{course.duration}</span>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold leading-8 text-[#7b1313]">{course.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-7 text-slate-500">{course.shortDescription}</p>
                  <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
                    <span className="text-slate-500">เริ่ม {formatDate(course.nextStartAt)}</span>
                    <Link href={`/courses/${course.slug}`} className="font-bold text-[#7b1313] hover:text-[#c0392b]">
                      รายละเอียด <ArrowRight size={15} className="ml-1 inline" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
        </div>
        {!isLoading && courses.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed p-12 text-center text-slate-500">
            ไม่พบหลักสูตรที่ตรงกับคำค้นหา
          </div>
        )}
      </main>
    </div>
  );
}
