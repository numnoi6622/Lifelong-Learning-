import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  HelpCircle,
  LogOut,
  Menu,
  ShieldCheck,
  User as UserIcon,
  X,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, loading, logout } = useAuth();
  const utils = trpc.useUtils();

  // Agreement state like training.ubu.ac.th/login.php
  const [agreed, setAgreed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [guideMenuOpen, setGuideMenuOpen] = useState(false);

  // Google Sign-In Dialog
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check URL params for direct modal trigger
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("google_modal") === "1" || params.get("google") === "1") {
        setAgreed(true);
        setGoogleModalOpen(true);
      }
    }
  }, []);

  const loginWithGoogleMutation = trpc.auth.loginWithGoogle.useMutation({
    onSuccess: async (data) => {
      toast.success(`เข้าสู่ระบบสำเร็จในชื่อ ${data.user.name} (${data.user.email})`);
      await utils.auth.me.invalidate();
      setGoogleModalOpen(false);
      setLocation("/dashboard");
    },
    onError: (err) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      setIsSubmitting(false);
    },
  });

  const handleQuickGoogleLogin = async (emailToUse?: string, nameToUse?: string) => {
    if (!agreed) {
      toast.warning("กรุณาคลิกยอมรับข้อกำหนดและเงื่อนไขการสมัครสมาชิกก่อน");
      return;
    }
    const finalEmail = (emailToUse || googleEmail || "user@gmail.com").trim();
    const finalName = (nameToUse || googleName || finalEmail.split("@")[0]).trim();

    if (!finalEmail.includes("@")) {
      toast.error("กรุณากรอกอีเมล Google ให้ถูกต้อง");
      return;
    }

    setIsSubmitting(true);
    loginWithGoogleMutation.mutate({
      email: finalEmail,
      name: finalName,
    });
  };

  const handleGoogleButtonClick = () => {
    if (!agreed) return;
    setGoogleModalOpen(true);
  };

  const handleThaiDClick = () => {
    if (!agreed) return;
    toast.info("ระบบกำลังเชื่อมต่อบริการ ThaiD (DOPA)...", {
      description: "กำลังส่งต่อไปยังระบบพิสูจน์และยืนยันตัวตนทางดิจิทัล",
    });
    // In production this connects to https://training.ubu.ac.th/thd/oauth.php
    setTimeout(() => {
      window.open("https://www.ubu.ac.th/web/kmubu/km/content-392/", "_blank");
    }, 1200);
  };

  // If already logged in, show student dashboard card
  if (user) {
    return (
      <div className="min-h-screen bg-[#f5f6f9] text-[#11243d]">
        <header className="border-b bg-white shadow-sm">
          <div className="container flex h-20 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src="/rmutl-logo.jpg" alt="Logo" className="h-12 w-auto object-contain" />
              <div>
                <div className="font-serif text-lg font-bold text-[#7b1313]">มทร.ล้านนา เชียงราย</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Lifelong Learning</div>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm font-semibold text-[#7b1313] hover:underline">
                แดชบอร์ดผู้เรียน
              </Link>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <LogOut size={14} /> ออกจากระบบ
              </button>
            </div>
          </div>
        </header>

        <main className="container grid min-h-[calc(100vh-160px)] place-items-center py-12">
          <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl sm:p-10">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#fdf0f0] text-3xl font-bold text-[#7b1313]">
              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={36} />}
            </div>
            <h1 className="mt-6 font-serif text-3xl font-bold text-[#7b1313]">ยินดีต้อนรับกลับ</h1>
            <p className="mt-2 text-sm text-slate-600">คุณเข้าสู่ระบบในชื่อ</p>
            <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">
              {user.name || "ผู้ใช้งาน"}
              {user.email && <div className="text-xs font-normal text-slate-500">{user.email}</div>}
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7b1313] py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#921a1a]"
              >
                ไปยังแดชบอร์ดผู้เรียน <ArrowRight size={16} />
              </Link>
              <Link
                href="/courses"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                สำรวจหลักสูตรอบรม
              </Link>
              <button
                onClick={() => logout()}
                className="mt-2 text-xs text-slate-400 hover:text-red-600"
              >
                ออกจากระบบบัญชีนี้
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#11243d]">
      {/* Top Notification Bar */}
      <div className="bg-[#7b1313] py-2 text-xs text-white">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded bg-white/20 px-2 py-0.5 font-bold uppercase tracking-wider text-[10px]">Portal</span>
            <span>ระบบบริการผู้เข้าอบรม มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา เชียงราย</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-white/80">
            <a href="https://training.ubu.ac.th/privacy_notice.pdf" target="_blank" rel="noreferrer" className="hover:text-white hover:underline">
              ประกาศนโยบายความเป็นส่วนตัว
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Header matching training.ubu.ac.th */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="container flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <img src="/rmutl-logo.jpg" alt="Logo" className="h-12 w-auto object-contain" />
            <div>
              <div className="font-serif text-lg font-bold text-[#7b1313]">มทร.ล้านนา เชียงราย</div>
              <div className="text-[10px] uppercase tracking-widest text-[#c0392b]">Lifelong Learning</div>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-700">
            <Link href="/" className="hover:text-[#7b1313] transition-colors">
              หน้าแรก
            </Link>
            <Link href="/courses" className="hover:text-[#7b1313] transition-colors">
              หลักสูตรอบรม
            </Link>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdFe8KpeTNFoMBQUnolRo1MyLY-EHTqySVuJgVBW6HMvrGW4w/viewform"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-[#7b1313] transition-colors"
            >
              แบบประเมินความพึงพอใจ <ExternalLink size={12} className="text-slate-400" />
            </a>

            {/* Manual dropdown */}
            <div className="relative">
              <button
                onClick={() => setGuideMenuOpen(!guideMenuOpen)}
                onBlur={() => setTimeout(() => setGuideMenuOpen(false), 200)}
                className="flex items-center gap-1 hover:text-[#7b1313] transition-colors"
              >
                คู่มือการใช้งาน <ChevronDown size={14} className={`transition-transform ${guideMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {guideMenuOpen && (
                <div className="absolute left-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                  <a
                    href="https://docs.google.com/document/d/1i6tnMW7gL_Jo3NiXBco0jKQIJgTqhuiQmDczmVWj_Y4/edit?usp=sharing"
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#fdf0f0] hover:text-[#7b1313]"
                  >
                    • สำหรับผู้เข้าอบรม
                  </a>
                  <a
                    href="https://docs.google.com/document/d/1gVFlLFkz-fxbu65HyvvHie9OzBDBns5RnF3xhDRgySM/edit?usp=sharing"
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#fdf0f0] hover:text-[#7b1313]"
                  >
                    • สำหรับผู้ดูแลระบบ
                  </a>
                </div>
              )}
            </div>

            <Link href="/login" className="font-bold text-[#7b1313] border-b-2 border-[#7b1313] pb-0.5">
              เข้าสู่ระบบ
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Toggle Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Nav menu */}
        {menuOpen && (
          <div className="lg:hidden border-t bg-white px-6 py-4 shadow-lg">
            <nav className="grid gap-2 text-sm">
              <Link onClick={() => setMenuOpen(false)} href="/" className="rounded-lg p-2 hover:bg-slate-50">
                หน้าแรก
              </Link>
              <Link onClick={() => setMenuOpen(false)} href="/courses" className="rounded-lg p-2 hover:bg-slate-50">
                หลักสูตรอบรม
              </Link>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSdFe8KpeTNFoMBQUnolRo1MyLY-EHTqySVuJgVBW6HMvrGW4w/viewform"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50"
              >
                แบบประเมินความพึงพอใจ <ExternalLink size={14} />
              </a>
              <a
                href="https://docs.google.com/document/d/1i6tnMW7gL_Jo3NiXBco0jKQIJgTqhuiQmDczmVWj_Y4/edit?usp=sharing"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-50"
              >
                คู่มือ: สำหรับผู้เข้าอบรม
              </a>
              <a
                href="https://docs.google.com/document/d/1gVFlLFkz-fxbu65HyvvHie9OzBDBns5RnF3xhDRgySM/edit?usp=sharing"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-50"
              >
                คู่มือ: สำหรับผู้ดูแลระบบ
              </a>
            </nav>
          </div>
        )}
      </header>

      {/* Main Login Content */}
      <main className="container flex min-h-[calc(100vh-220px)] items-center justify-center py-12">
        <div className="w-full max-w-lg">
          {/* Card exactly reproducing training.ubu.ac.th/login.php layout */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl">
            {/* Top decorative stripe */}
            <div className="h-2 w-full bg-gradient-to-r from-[#7b1313] via-[#c0392b] to-[#f5c842]" />

            <div className="p-8 sm:p-10 text-center">
              {/* Institution emblem */}
              <div className="mx-auto mb-5 flex justify-center">
                <img src="/rmutl-logo.jpg" alt="Logo" className="h-16 w-auto object-contain drop-shadow" />
              </div>

              {/* Title exactly as in https://training.ubu.ac.th/login.php */}
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#11243d]">
                กรุณาเลือกวิธีการ Login ก่อนเข้าใช้งาน
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-500">
                เข้าสู่ระบบผู้เข้าอบรมเพื่อติดตามผลการสมัคร ประกาศนียบัตร และการประเมินผล
              </p>

              {/* Checkbox Agreement - identical to training.ubu.ac.th */}
              <div className="mt-7 rounded-2xl border border-slate-200 bg-[#fdfcfb] p-4 text-left shadow-inner">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="checkbox2"
                    name="checkbox2"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-[#7b1313] focus:ring-[#7b1313]"
                  />
                  <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    ข้าพเจ้ายอมรับ{" "}
                    <a
                      href="https://www.ubu.ac.th/web/files_up/00133f2022053119114872.pdf"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#c0392b] underline hover:text-[#7b1313]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      ข้อกำหนดและเงื่อนไขการสมัครสมาชิก
                    </a>
                  </span>
                </label>
              </div>

              {/* Login Action Buttons */}
              <div className="mt-8 flex flex-col items-center gap-4">
                {/* 1. Login with Google Button */}
                <button
                  type="button"
                  id="google"
                  onClick={handleGoogleButtonClick}
                  disabled={!agreed}
                  style={{
                    backgroundColor: agreed ? "#DD4B39" : "#999999",
                  }}
                  className={`relative flex h-14 w-full max-w-[320px] items-center justify-center gap-3 rounded-2xl text-base font-bold text-white shadow-md transition-all ${
                    agreed
                      ? "hover:bg-[#c23321] hover:shadow-lg active:scale-[0.98] cursor-pointer"
                      : "cursor-not-allowed opacity-80"
                  }`}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-base font-bold text-[#DD4B39] shadow-sm">
                    G
                  </span>
                  <span>Login ด้วย Google</span>
                </button>

                {/* 2. Login with ThaiD Button */}
                <button
                  type="button"
                  id="thaid"
                  onClick={handleThaiDClick}
                  disabled={!agreed}
                  style={{
                    backgroundColor: agreed ? "#1a365d" : "#999999",
                  }}
                  className={`relative flex h-14 w-full max-w-[320px] items-center justify-center gap-3 rounded-2xl text-base font-bold text-white shadow-md transition-all ${
                    agreed
                      ? "hover:bg-[#234575] hover:shadow-lg active:scale-[0.98] cursor-pointer"
                      : "cursor-not-allowed opacity-80"
                  }`}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-bold text-[#1a365d] shadow-sm">
                    ID
                  </span>
                  <span>Login ด้วย ThaiD</span>
                </button>

                {/* ThaiD Guide Link */}
                <a
                  href="https://www.ubu.ac.th/web/kmubu/km/content-392/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#7b1313] hover:underline"
                >
                  <HelpCircle size={14} /> วิธีการใช้งาน ThaiD
                </a>
              </div>

              {!agreed && (
                <p className="mt-4 text-xs text-amber-700 bg-amber-50 rounded-xl py-2 px-3 border border-amber-200/60">
                  ⚠️ กรุณาติ๊กยอมรับข้อกำหนดและเงื่อนไขด้านบน เพื่อเปิดใช้งานปุ่มเข้าสู่ระบบ
                </p>
              )}

              {/* Bottom Policy links exactly as in training.ubu.ac.th */}
              <div className="mt-10 border-t border-slate-100 pt-6">
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
                  <a
                    href="https://training.ubu.ac.th/privacy_notice.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#7b1313] hover:underline"
                  >
                    ข้อกำหนดและเงื่อนไขการสมัครสมาชิก
                  </a>
                  <span className="text-slate-300">•</span>
                  <a
                    href="https://training.ubu.ac.th/privacy_policy.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#7b1313] hover:underline"
                  >
                    นโยบายความเป็นส่วนตัว
                  </a>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
                  <a
                    href="https://docs.google.com/document/d/1i6tnMW7gL_Jo3NiXBco0jKQIJgTqhuiQmDczmVWj_Y4/edit?usp=sharing"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-slate-600 underline"
                  >
                    คู่มือผู้เข้าอบรม
                  </a>
                  <span>|</span>
                  <a
                    href="https://docs.google.com/document/d/1gVFlLFkz-fxbu65HyvvHie9OzBDBns5RnF3xhDRgySM/edit?usp=sharing"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-slate-600 underline"
                  >
                    คู่มือผู้ดูแลระบบ
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Google Account Login Modal ("เข้าระบบ ด้วย google ของฉัน") */}
      {googleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl border border-slate-100">
            <button
              onClick={() => setGoogleModalOpen(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            {/* Google Brand Header */}
            <div className="flex items-center gap-3 border-b pb-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-xl font-bold text-[#DD4B39]">
                G
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-slate-900">
                  ลงชื่อเข้าใช้ด้วย Google
                </h3>
                <p className="text-xs text-slate-500">
                  ดำเนินการต่อด้วยบัญชี Google ของคุณ
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {/* Option A: One-click fast login */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  ตัวเลือกที่ 1: เข้าสู่ระบบด่วน
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickGoogleLogin("mygoogle@gmail.com", "ผู้เรียน มทร.ล้านนา เชียงราย")}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#DD4B39] py-3 text-sm font-bold text-white shadow hover:bg-[#c23321] transition-all disabled:opacity-50"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold text-[#DD4B39]">
                    G
                  </span>
                  {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วยบัญชี Google ของฉัน"}
                </button>
              </div>

              {/* Option B: Enter custom Google email */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  ตัวเลือกที่ 2: ระบุอีเมล Google / Gmail ของคุณ
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">อีเมล Google (Gmail)</label>
                    <input
                      type="email"
                      placeholder="เช่น yourname@gmail.com"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">ชื่อ-นามสกุล (ไม่บังคับ)</label>
                    <input
                      type="text"
                      placeholder="เช่น สมชาย ใจดี"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting || !googleEmail}
                    onClick={() => handleQuickGoogleLogin(googleEmail, googleName)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    ยืนยันเข้าสู่ระบบด้วยอีเมลนี้ <ArrowRight size={15} />
                  </button>
                </div>
              </div>

              {/* Option C: Direct OAuth Link */}
              <div className="pt-2 text-center">
                <a
                  href="/api/auth/google"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#7b1313] hover:underline"
                >
                  <ShieldCheck size={14} /> หรือเชื่อมต่อผ่าน Google OAuth Portal (API)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="container">
          <p>© 2567 มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา เชียงราย Lifelong Learning. All rights reserved.</p>
          <p className="mt-1 text-[11px] text-slate-400">
            ระบบบริหารจัดการหลักสูตรฝึกอบรมระยะสั้นและการเรียนรู้ตลอดชีวิต
          </p>
        </div>
      </footer>
    </div>
  );
}
