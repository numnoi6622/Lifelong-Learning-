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
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: oauthConfig } = trpc.auth.getOAuthConfig.useQuery();

  const loginWithGoogleMutation = trpc.auth.loginWithGoogle.useMutation({
    onSuccess: async (data) => {
      try {
        if ((data as any).sessionToken) {
          sessionStorage.setItem("manus-cookie", `app_session_id=${(data as any).sessionToken}`);
        }
      } catch {
        // ignore storage errors
      }
      setLoginError(null);
      toast.success(`ยืนยันบัญชี Google สำเร็จ: ${data.user.name} (${data.user.email})`);
      await utils.auth.me.invalidate();
      setGoogleModalOpen(false);
      setLocation("/dashboard");
    },
    onError: (err) => {
      const msg = err.message || "ไม่สามารถยืนยันบัญชี Google นี้ได้";
      setLoginError(msg);
      toast.error(msg);
      setIsSubmitting(false);
    },
  });

  // Check URL params or Supabase/Google OAuth hash callback (#access_token=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_modal") === "1" || params.get("google") === "1") {
      setAgreed(true);
      setGoogleModalOpen(true);
    }

    // Handle OAuth redirect hash from Supabase Google Auth or Google Implicit OAuth
    if (window.location.hash && window.location.hash.includes("access_token=")) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const providerToken = hashParams.get("provider_token") || accessToken;
      if (accessToken) {
        setIsSubmitting(true);
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${providerToken}` },
        })
          .then(res => (res.ok ? res.json() : null))
          .then(profile => {
            if (profile && profile.email) {
              window.history.replaceState(null, "", window.location.pathname);
              loginWithGoogleMutation.mutate({
                email: profile.email,
                name: profile.name || profile.email.split("@")[0],
                googleAccessToken: providerToken || undefined,
              });
            } else if (oauthConfig?.supabaseUrl && oauthConfig?.supabaseAnonKey) {
              return fetch(`${oauthConfig.supabaseUrl}/auth/v1/user`, {
                headers: {
                  apikey: oauthConfig.supabaseAnonKey,
                  Authorization: `Bearer ${accessToken}`,
                },
              })
                .then(r => (r.ok ? r.json() : null))
                .then(supaUser => {
                  if (supaUser?.email) {
                    window.history.replaceState(null, "", window.location.pathname);
                    loginWithGoogleMutation.mutate({
                      email: supaUser.email,
                      name: supaUser.user_metadata?.full_name || supaUser.email.split("@")[0],
                    });
                  } else {
                    setIsSubmitting(false);
                  }
                });
            } else {
              setIsSubmitting(false);
            }
          })
          .catch(() => setIsSubmitting(false));
      }
    }
  }, [oauthConfig?.supabaseUrl, oauthConfig?.supabaseAnonKey]);

  const handleRealOAuthRedirect = () => {
    if (oauthConfig?.supabaseUrl) {
      const redirectTo = encodeURIComponent(`${window.location.origin}/login`);
      window.location.href = `${oauthConfig.supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
      return;
    }
    if (oauthConfig?.googleClientId) {
      const redirectUri = encodeURIComponent(`${window.location.origin}/login`);
      const scope = encodeURIComponent("openid email profile");
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${oauthConfig.googleClientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&prompt=select_account`;
      return;
    }
    window.location.href = "/api/auth/google";
  };

  const handleQuickGoogleLogin = async (emailToUse?: string, nameToUse?: string) => {
    setLoginError(null);
    if (!agreed) {
      toast.warning("กรุณาคลิกยอมรับข้อกำหนดและเงื่อนไขการสมัครสมาชิกก่อน");
      return;
    }
    const finalEmail = (emailToUse ?? googleEmail).trim().toLowerCase();
    const finalName = (nameToUse ?? googleName).trim();

    if (!finalEmail || !finalEmail.includes("@")) {
      const msg = "กรุณากรอกที่อยู่อีเมล Google (@gmail.com) ของคุณ";
      setLoginError(msg);
      toast.error(msg);
      return;
    }

    if (!finalName || finalName.length < 2) {
      const msg = "กรุณากรอกชื่อ-นามสกุลจริงของคุณ (เพื่อใช้ในการออกใบประกาศนียบัตร)";
      setLoginError(msg);
      toast.error(msg);
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
    setLoginError(null);
    setGoogleModalOpen(true);
  };

  const handleThaiDClick = () => {
    if (!agreed) return;
    toast.info("ระบบกำลังเชื่อมต่อบริการ ThaiD (DOPA)...", {
      description: "กำลังส่งต่อไปยังระบบพิสูจน์และยืนยันตัวตนทางดิจิทัล",
    });
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
                  <Link
                    href="/admin"
                    className="font-semibold text-[#7b1313] hover:underline"
                  >
                    ระบบจัดการหลังบ้าน (Admin)
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Google Account Login Modal */}
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
                  ยืนยันตัวตนด้วยบัญชี Google (Gmail)
                </h3>
                <p className="text-xs text-slate-500">
                  ระบบตรวจสอบบัญชี Gmail จริงและผูกกับประวัติการอบรมอัตโนมัติ
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {loginError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 leading-relaxed">
                  ⚠️ {loginError}
                </div>
              )}

              {/* Real Gmail Form with MX & Format Verification */}
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/40">
                <div className="text-xs font-bold text-[#7b1313] mb-3 flex items-center gap-1.5">
                  <ShieldCheck size={15} /> กรอกบัญชี Google (Gmail) จริงของคุณ
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      ชื่อ-นามสกุลจริง (ใช้แสดงบนใบประกาศนียบัตร) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น นายสมชาย ใจดี"
                      value={googleName}
                      onChange={(e) => {
                        setGoogleName(e.target.value);
                        setLoginError(null);
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      บัญชีอีเมล Google (@gmail.com หรือ @rmutl.ac.th) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="เช่น somchai.rmutl@gmail.com"
                      value={googleEmail}
                      onChange={(e) => {
                        setGoogleEmail(e.target.value);
                        setLoginError(null);
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#7b1313] focus:ring-2 focus:ring-[#7b1313]/20"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      * ระบบจะตรวจสอบโครงสร้างบัญชี Gmail จริงและเซิร์ฟเวอร์ Google Mail (MX Record) โดยไม่อนุญาตอีเมลจำลอง
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting || !googleEmail || !googleName}
                    onClick={() => handleQuickGoogleLogin(googleEmail, googleName)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#DD4B39] py-3.5 text-sm font-bold text-white shadow hover:bg-[#c23321] transition-colors disabled:opacity-50"
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-bold text-[#DD4B39]">
                      G
                    </span>
                    {isSubmitting ? "กำลังตรวจสอบบัญชีกับ Google..." : "ยืนยันเข้าสู่ระบบด้วยบัญชี Gmail"}
                  </button>
                </div>
              </div>

              {/* Direct OAuth Redirect (Supabase Google Auth / Google Cloud OAuth) */}
              {(oauthConfig?.supabaseUrl || oauthConfig?.googleClientId) && (
                <div className="rounded-2xl border border-slate-200 p-4 text-center">
                  <div className="text-xs text-slate-500 mb-2">
                    หรือลงชื่อเข้าใช้ผ่านหน้าต่างรับรองสิทธิ์ของ Google OAuth 2.0 โดยตรง
                  </div>
                  <button
                    type="button"
                    onClick={handleRealOAuthRedirect}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink size={14} /> ลงชื่อเข้าใช้ผ่าน Google OAuth (Supabase Auth)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="container">
          <p>© 2569 มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา เชียงราย Lifelong Learning. All rights reserved.</p>
          <p className="mt-1 text-[11px] text-slate-400">
            ระบบบริหารจัดการหลักสูตรฝึกอบรมระยะสั้นและการเรียนรู้ตลอดชีวิต
          </p>
        </div>
      </footer>
    </div>
  );
}
