import CertificateModal from "@/components/CertificateModal";
import {
  getLocalApplications,
  removeLocalApplication,
  saveLocalApplications,
  upsertLocalApplication,
} from "@/lib/traineeStore";
import { trpc } from "@/lib/trpc";
import {
  Award,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Database,
  ExternalLink,
  FileCheck,
  GraduationCap,
  Home,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function AdminPage() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"trainees" | "certificates" | "supabase">("trainees");
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCertApp, setSelectedCertApp] = useState<any | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // New Trainee Form
  const [newTrainee, setNewTrainee] = useState({
    courseSlug: "ev-charger-installation",
    fullName: "",
    email: "",
    phone: "",
    nationalId: "",
    occupation: "",
  });

  // Supabase Settings Form
  const [supaUrl, setSupaUrl] = useState("");
  const [supaKey, setSupaKey] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");

  const [cachedApps] = useState(() => getLocalApplications());

  const { data, isLoading, refetch } = trpc.admin.listApplications.useQuery({
    cachedApplications: cachedApps,
  });

  const { data: coursesList } = trpc.courses.list.useQuery();
  const { data: supaSettings, refetch: refetchSupa } = trpc.admin.getSupabaseSettings.useQuery();

  useEffect(() => {
    if (data?.items) {
      saveLocalApplications(data.items);
    }
  }, [data?.items]);

  useEffect(() => {
    if (supaSettings) {
      setSupaUrl(supaSettings.url || "");
      setGoogleClientId(supaSettings.googleClientId || "");
    }
  }, [supaSettings]);

  const updateMutation = trpc.admin.updateApplication.useMutation({
    onSuccess: async (res) => {
      if (res.application) {
        upsertLocalApplication(res.application);
      }
      toast.success("อัปเดตสถานะผู้เข้าอบรมเรียบร้อยแล้ว");
      await utils.admin.listApplications.invalidate();
      await utils.dashboard.overview.invalidate();
      refetch();
    },
    onError: (err) => toast.error(err.message || "เกิดข้อผิดพลาด"),
  });

  const approveAllMutation = trpc.admin.approveAllAndIssueCertificate.useMutation({
    onSuccess: async (res) => {
      if (res.application) {
        upsertLocalApplication(res.application);
      }
      toast.success(
        `อนุมัติครบทุกขั้นตอนและออกใบประกาศเลขที่ ${res.application.certificateNo} เรียบร้อยแล้ว!`
      );
      await utils.admin.listApplications.invalidate();
      await utils.dashboard.overview.invalidate();
      refetch();
    },
    onError: (err) => toast.error(err.message || "เกิดข้อผิดพลาด"),
  });

  const createTraineeMutation = trpc.admin.createTrainee.useMutation({
    onSuccess: async (res) => {
      if (res.application) {
        upsertLocalApplication(res.application);
      }
      toast.success("เพิ่มข้อมูลผู้เข้าอบรมเรียบร้อยแล้ว");
      setAddModalOpen(false);
      setNewTrainee({
        courseSlug: "ev-charger-installation",
        fullName: "",
        email: "",
        phone: "",
        nationalId: "",
        occupation: "",
      });
      await utils.admin.listApplications.invalidate();
      await utils.dashboard.overview.invalidate();
      refetch();
    },
    onError: (err) => toast.error(err.message || "ไม่สามารถเพิ่มข้อมูลได้"),
  });

  const deleteMutation = trpc.admin.deleteApplication.useMutation({
    onSuccess: async (_, vars) => {
      removeLocalApplication(vars.id);
      toast.success("ลบรายการเรียบร้อยแล้ว");
      await utils.admin.listApplications.invalidate();
      await utils.dashboard.overview.invalidate();
      refetch();
    },
  });

  const saveSupaMutation = trpc.admin.saveSupabaseSettings.useMutation({
    onSuccess: (res) => {
      if (res.status.connected) {
        toast.success(res.status.message);
      } else {
        toast.warning(res.status.message);
      }
      refetchSupa();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const syncSupaMutation = trpc.admin.syncToSupabase.useMutation({
    onSuccess: (res) => {
      if (res.connected) {
        toast.success(`ซิงค์ข้อมูลผู้เข้าอบรม ${res.synced} รายการขึ้น Supabase สำเร็จ!`);
      } else {
        toast.error("ยังไม่ได้เชื่อมต่อ Supabase หรือยังไม่ได้สร้างตาราง");
      }
      refetchSupa();
    },
  });

  const items = data?.items ?? [];
  const stats = data?.stats ?? {
    total: 0,
    pendingApproval: 0,
    accepted: 0,
    paid: 0,
    pendingPayment: 0,
    completedAttendance: 0,
    certificatesIssued: 0,
  };

  const filteredItems = items.filter((item) => {
    const matchSearch =
      !searchQuery ||
      item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery) ||
      (item.certificateNo && item.certificateNo.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCourse = courseFilter === "all" || item.courseSlug === courseFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && item.status === "pending") ||
      (statusFilter === "accepted" && item.status === "accepted") ||
      (statusFilter === "paid" && item.paymentStatus === "paid") ||
      (statusFilter === "certified" && item.certificateIssued);
    return matchSearch && matchCourse && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-[#11243d]">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-30 border-b bg-[#7b1313] text-white shadow-md">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/rmutl-logo.jpg"
              alt="Logo"
              className="h-11 w-11 rounded-xl bg-white p-1 object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#f5c842] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#7b1313]">
                  Admin Backoffice
                </span>
                <span className="text-xs text-white/80">
                  มทร.ล้านนา เชียงราย Lifelong Learning
                </span>
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold">
                ระบบบริหารจัดการผู้เข้าอบรมและออกใบประกาศนียบัตรออนไลน์
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/25"
            >
              <Users size={15} /> หน้าแดชบอร์ดสมาชิก
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-xl bg-[#f5c842] px-3.5 py-2 text-xs font-bold text-[#7b1313] hover:bg-[#eab825]"
            >
              <Home size={15} /> หน้าหลักเว็บไซต์
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Summary KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>ผู้สมัครเข้าอบรมทั้งหมด</span>
              <Users size={18} className="text-[#7b1313]" />
            </div>
            <div className="mt-3 font-serif text-3xl font-bold text-slate-900">{stats.total}</div>
            <div className="mt-1 text-xs text-amber-600 font-medium">
              รอยืนยันการสมัคร {stats.pendingApproval} รายการ
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>ยืนยันการสมัครแล้ว</span>
              <UserCheck size={18} className="text-emerald-600" />
            </div>
            <div className="mt-3 font-serif text-3xl font-bold text-emerald-700">
              {stats.accepted}
            </div>
            <div className="mt-1 text-xs text-slate-400">ผ่านการคัดเลือกเข้าอบรม</div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>ยืนยันชำระเงินแล้ว</span>
              <CreditCard size={18} className="text-blue-600" />
            </div>
            <div className="mt-3 font-serif text-3xl font-bold text-blue-700">{stats.paid}</div>
            <div className="mt-1 text-xs text-amber-600 font-medium">
              รอตรวจสอบสลิป {stats.pendingPayment} รายการ
            </div>
          </div>

          <div className="rounded-2xl border border-[#e5c158] bg-gradient-to-br from-[#fffdf6] to-[#fef6db] p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900">
              <span>ออกใบประกาศออนไลน์แล้ว</span>
              <Award size={20} className="text-[#b8860b]" />
            </div>
            <div className="mt-3 font-serif text-3xl font-bold text-[#7b1313]">
              {stats.certificatesIssued}
            </div>
            <div className="mt-1 text-xs text-amber-800">
              เข้าเรียนครบ 100% ({stats.completedAttendance} คน)
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("trainees")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "trainees"
                  ? "bg-[#7b1313] text-white shadow"
                  : "bg-white text-slate-600 hover:bg-slate-100 border"
              }`}
            >
              <Users size={16} /> 1. จัดการผู้เข้าอบรม & อนุมัติ 4 ขั้นตอน ({items.length})
            </button>

            <button
              onClick={() => setActiveTab("certificates")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "certificates"
                  ? "bg-[#7b1313] text-white shadow"
                  : "bg-white text-slate-600 hover:bg-slate-100 border"
              }`}
            >
              <Award size={16} /> 2. ทะเบียนใบประกาศนียบัตร ({stats.certificatesIssued})
            </button>

            <button
              onClick={() => setActiveTab("supabase")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "supabase"
                  ? "bg-[#7b1313] text-white shadow"
                  : "bg-white text-slate-600 hover:bg-slate-100 border"
              }`}
            >
              <Database size={16} /> 3. ตั้งค่าฐานข้อมูล Supabase
              <span
                className={`h-2 w-2 rounded-full ${
                  data?.supabaseStatus?.connected ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
            >
              <Plus size={15} /> เพิ่มข้อมูลผู้เข้าอบรมใหม่
            </button>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={14} /> รีเฟรชข้อมูล
            </button>
          </div>
        </div>

        {/* TAB 1: TRAINEE MANAGEMENT */}
        {activeTab === "trainees" && (
          <div className="space-y-4">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="relative flex-1 min-w-[240px]">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ-นามสกุล, อีเมล Gmail, เบอร์โทร หรือเลขทะเบียนใบประกาศ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2 text-xs sm:text-sm outline-none focus:border-[#7b1313] focus:bg-white"
                />
              </div>

              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="all">ทุกหลักสูตรอบรม</option>
                {(coursesList ?? []).map((c: any) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="pending">รอยืนยันการสมัคร</option>
                <option value="accepted">ยืนยันการสมัครแล้ว</option>
                <option value="paid">ชำระเงินแล้ว</option>
                <option value="certified">ออกใบประกาศแล้ว</option>
              </select>
            </div>

            {/* Trainees List */}
            {isLoading ? (
              <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">
                กำลังโหลดข้อมูลผู้เข้าอบรม...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">
                ไม่พบข้อมูลผู้เข้าอบรมตามเงื่อนไขที่ค้นหา
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Top Row: Trainee Info & Quick One-Click Approve */}
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-[#fdf0f0] px-2.5 py-0.5 font-mono text-xs font-bold text-[#7b1313]">
                            รหัส #{item.id}
                          </span>
                          <span className="font-serif text-lg font-bold text-slate-900">
                            {item.fullName}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-600">
                            {item.email}
                          </span>
                          <span className="text-xs text-slate-500">โทร: {item.phone}</span>
                        </div>
                        <div className="mt-1.5 text-xs sm:text-sm font-semibold text-[#7b1313]">
                          หลักสูตร: {item.courseTitle}{" "}
                          <span className="font-normal text-slate-500">
                            ({item.courseDuration} · ค่าลงทะเบียน{" "}
                            {item.courseTuition.toLocaleString("th-TH")} บาท)
                          </span>
                        </div>
                        {(item.occupation || item.nationalId || item.paymentRef) && (
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            {item.nationalId && <span>เลขบัตรประชาชน: {item.nationalId}</span>}
                            {item.occupation && <span>หน่วยงาน/อาชีพ: {item.occupation}</span>}
                            {item.paymentRef && (
                              <span className="font-semibold text-amber-700">
                                หลักฐานโอนเงิน: {item.paymentRef}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!item.certificateIssued ? (
                          <button
                            onClick={() =>
                              approveAllMutation.mutate({ id: item.id, fallbackRecord: item })
                            }
                            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7b1313] to-[#a91d1d] px-3.5 py-2 text-xs font-bold text-[#f5c842] shadow hover:opacity-95"
                          >
                            <Sparkles size={14} /> อนุมัติครบทุกขั้นตอน + ออกใบประกาศทันที
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedCertApp(item)}
                            className="flex items-center gap-1.5 rounded-xl bg-amber-100 border border-amber-300 px-3.5 py-2 text-xs font-bold text-[#7b1313] hover:bg-amber-200"
                          >
                            <Award size={15} /> ดูใบประกาศ ({item.certificateNo})
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`ต้องการลบข้อมูลของ ${item.fullName} หรือไม่?`)) {
                              deleteMutation.mutate({ id: item.id });
                            }
                          }}
                          className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          title="ลบรายการ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* 4-Step Admin Control Grid */}
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Step 1: Confirm Application */}
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                          <span>1. ยืนยันการสมัคร</span>
                          {item.status === "accepted" ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 size={14} /> อนุมัติแล้ว
                            </span>
                          ) : (
                            <span className="text-amber-600">รอตรวจสอบ</span>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              updateMutation.mutate({
                                id: item.id,
                                status: "accepted",
                                fallbackRecord: item,
                              })
                            }
                            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                              item.status === "accepted"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50"
                            }`}
                          >
                            ✓ ยืนยันการสมัคร
                          </button>
                          <button
                            onClick={() =>
                              updateMutation.mutate({
                                id: item.id,
                                status: "pending",
                                fallbackRecord: item,
                              })
                            }
                            className={`rounded-xl px-2.5 py-2 text-xs font-semibold ${
                              item.status === "pending"
                                ? "bg-amber-500 text-white"
                                : "bg-white border border-slate-200 text-slate-500"
                            }`}
                          >
                            รอตรวจ
                          </button>
                        </div>
                      </div>

                      {/* Step 2: Confirm Payment Status */}
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                          <span>2. สถานะชำระเงิน</span>
                          {item.paymentStatus === "paid" ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 size={14} /> ชำระแล้ว
                            </span>
                          ) : item.paymentStatus === "pending_verification" ? (
                            <span className="text-amber-600">แจ้งโอนแล้ว</span>
                          ) : (
                            <span className="text-rose-600">ยังไม่ชำระ</span>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              updateMutation.mutate({
                                id: item.id,
                                paymentStatus: "paid",
                                fallbackRecord: item,
                              })
                            }
                            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                              item.paymentStatus === "paid"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-blue-50"
                            }`}
                          >
                            ✓ ยืนยันชำระเงิน
                          </button>
                          <button
                            onClick={() =>
                              updateMutation.mutate({
                                id: item.id,
                                paymentStatus: "unpaid",
                                fallbackRecord: item,
                              })
                            }
                            className={`rounded-xl px-2.5 py-2 text-xs font-semibold ${
                              item.paymentStatus === "unpaid"
                                ? "bg-rose-500 text-white"
                                : "bg-white border border-slate-200 text-slate-500"
                            }`}
                          >
                            ยังไม่ชำระ
                          </button>
                        </div>
                      </div>

                      {/* Step 3: Confirm Attendance Progress */}
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                          <span>3. ยืนยันการเข้าเรียน</span>
                          <span className="font-bold text-[#7b1313]">
                            {item.attendanceProgress}%
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[0, 50, 80, 100].map((pct) => (
                            <button
                              key={pct}
                              onClick={() =>
                                updateMutation.mutate({
                                  id: item.id,
                                  attendanceProgress: pct,
                                  attendanceStatus:
                                    pct === 100 ? "completed" : pct > 0 ? "studying" : "not_started",
                                  fallbackRecord: item,
                                })
                              }
                              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                                item.attendanceProgress === pct
                                  ? "bg-[#7b1313] text-white shadow-sm"
                                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {pct === 100 ? "ครบ 100%" : `${pct}%`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Step 4: Issue Online Certificate */}
                      <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-3.5">
                        <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-2">
                          <span>4. ออกใบประกาศออนไลน์</span>
                          {item.certificateIssued ? (
                            <span className="text-emerald-700 font-bold">ออกแล้ว</span>
                          ) : (
                            <span className="text-slate-400">ยังไม่ออก</span>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              updateMutation.mutate({
                                id: item.id,
                                certificateIssued: !item.certificateIssued,
                                fallbackRecord: item,
                              })
                            }
                            className={`flex-1 flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-all ${
                              item.certificateIssued
                                ? "bg-emerald-700 text-white shadow-sm"
                                : "bg-[#7b1313] text-[#f5c842] shadow hover:bg-[#921a1a]"
                            }`}
                          >
                            <Award size={14} />
                            {item.certificateIssued ? "ออกใบประกาศแล้ว (คลิกเพื่อยกเลิก)" : "ออกใบประกาศให้สมาชิก"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CERTIFICATES REGISTRY */}
        {activeTab === "certificates" && (
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-[#7b1313]">
              ทะเบียนผู้ได้รับใบประกาศนียบัตรออนไลน์ (e-Certificate Registry)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              รายชื่อผู้เข้าอบรมที่ผ่านการยืนยันการเรียนครบหลักสูตรและได้รับอนุมัติใบประกาศนียบัตรออนไลน์แล้ว
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {items
                .filter((i) => i.certificateIssued)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e5c158] bg-[#fffdf7] p-5 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#a17b37]">
                          {item.certificateNo}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          แสดงบนหน้าสมาชิกแล้ว
                        </span>
                      </div>
                      <div className="mt-2 font-serif text-xl font-bold text-slate-900">
                        {item.fullName}
                      </div>
                      <div className="text-xs text-slate-500">{item.email}</div>
                      <div className="mt-2 text-xs font-semibold text-[#7b1313]">
                        หลักสูตร: {item.courseTitle} ({item.courseDuration})
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCertApp(item)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#7b1313] py-2.5 text-xs font-bold text-[#f5c842] hover:bg-[#921a1a]"
                    >
                      <Award size={15} /> เปิดดู / พิมพ์ใบประกาศนียบัตร
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: SUPABASE INTEGRATION */}
        {activeTab === "supabase" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border bg-white p-6 sm:p-7 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Database size={24} />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#7b1313]">
                    เชื่อมต่อฐานข้อมูล Supabase
                  </h2>
                  <p className="text-xs text-slate-500">
                    เก็บข้อมูลผู้เข้าอบรม การชำระเงิน และใบประกาศไว้บน https://supabase.com/
                  </p>
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 text-xs font-medium ${
                  supaSettings?.status?.connected
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <div className="font-bold text-sm mb-1">
                  สถานะปัจจุบัน:{" "}
                  {supaSettings?.status?.connected
                    ? "✅ เชื่อมต่อ Supabase สำเร็จแล้ว"
                    : "⚡ กำลังใช้ฐานข้อมูลในระบบ (พร้อมเชื่อมต่อ Supabase)"}
                </div>
                <div>{supaSettings?.status?.message}</div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    1. Supabase Project URL (จากหน้า Project Settings &gt; API)
                  </label>
                  <input
                    type="url"
                    value={supaUrl}
                    onChange={(e) => setSupaUrl(e.target.value)}
                    placeholder="เช่น https://abcdefghijklm.supabase.co"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#7b1313]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">
                    2. Supabase API Key (anon public หรือ service_role secret)
                  </label>
                  <input
                    type="password"
                    value={supaKey}
                    onChange={(e) => setSupaKey(e.target.value)}
                    placeholder={
                      supaSettings?.hasKey
                        ? `ตั้งค่าไว้แล้ว (${supaSettings.anonKeyPreview}) — กรอกใหม่หากต้องการเปลี่ยน`
                        : "วางค่า anon หรือ service_role key ที่นี่"
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#7b1313]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">
                    3. Google OAuth Client ID (ไม่บังคับ — หากตั้งค่า Google Auth ใน Supabase แล้วจะใช้ของ Supabase อัตโนมัติ)
                  </label>
                  <input
                    type="text"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    placeholder="เช่น 123456789-xxx.apps.googleusercontent.com"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#7b1313]"
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    disabled={saveSupaMutation.isPending}
                    onClick={() =>
                      saveSupaMutation.mutate({
                        url: supaUrl,
                        anonKey: supaKey || undefined,
                        googleClientId,
                      })
                    }
                    className="flex items-center gap-2 rounded-xl bg-[#7b1313] px-5 py-3 text-xs font-bold text-white shadow hover:bg-[#921a1a]"
                  >
                    <ShieldCheck size={16} /> บันทึกและทดสอบการเชื่อมต่อ Supabase
                  </button>

                  <button
                    disabled={syncSupaMutation.isPending}
                    onClick={() => syncSupaMutation.mutate()}
                    className="flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    <RefreshCw size={15} /> ซิงค์ข้อมูลทั้งหมดขึ้น Supabase
                  </button>
                </div>
              </div>
            </div>

            {/* SQL Schema Box */}
            <div className="rounded-3xl border bg-white p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#7b1313]">
                    คำสั่ง SQL สำหรับสร้างตารางใน Supabase
                  </h3>
                  <p className="text-xs text-slate-500">
                    คัดลอกโค้ดนี้ไปรันในเมนู <strong>SQL Editor</strong> บนเว็บ{" "}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#c0392b] underline"
                    >
                      supabase.com/dashboard
                    </a>
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(supaSettings?.sqlSchema || "");
                    toast.success("คัดลอกคำสั่ง SQL เรียบร้อยแล้ว!");
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <Copy size={14} /> คัดลอก SQL
                </button>
              </div>

              <pre className="max-h-[380px] overflow-auto rounded-2xl bg-slate-900 p-4 font-mono text-xs text-emerald-300 leading-relaxed">
                {supaSettings?.sqlSchema || "กำลังโหลด SQL Schema..."}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Add New Trainee by Admin */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-xl font-bold text-[#7b1313]">
                เพิ่มข้อมูลผู้เข้าอบรมใหม่
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">เลือกหลักสูตรอบรม *</label>
                <select
                  value={newTrainee.courseSlug}
                  onChange={(e) =>
                    setNewTrainee((prev) => ({ ...prev, courseSlug: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"
                >
                  {(coursesList ?? []).map((c: any) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">ชื่อ-นามสกุลผู้เข้าอบรม *</label>
                <input
                  type="text"
                  placeholder="เช่น นายสมชาย ใจดี"
                  value={newTrainee.fullName}
                  onChange={(e) =>
                    setNewTrainee((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">
                  อีเมล Google (ที่ใช้ล็อกอินหน้าสมาชิก) *
                </label>
                <input
                  type="email"
                  placeholder="somchai.rmutl@gmail.com"
                  value={newTrainee.email}
                  onChange={(e) =>
                    setNewTrainee((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">เบอร์โทรศัพท์ *</label>
                <input
                  type="text"
                  placeholder="08x-xxx-xxxx"
                  value={newTrainee.phone}
                  onChange={(e) =>
                    setNewTrainee((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">หน่วยงาน / อาชีพ</label>
                <input
                  type="text"
                  placeholder="ระบุหน่วยงานหรืออาชีพ"
                  value={newTrainee.occupation}
                  onChange={(e) =>
                    setNewTrainee((prev) => ({ ...prev, occupation: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setAddModalOpen(false)}
                className="rounded-xl border px-4 py-2.5 text-xs font-semibold text-slate-600"
              >
                ยกเลิก
              </button>
              <button
                disabled={
                  !newTrainee.fullName ||
                  !newTrainee.email ||
                  !newTrainee.phone ||
                  createTraineeMutation.isPending
                }
                onClick={() => createTraineeMutation.mutate(newTrainee)}
                className="rounded-xl bg-[#7b1313] px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-[#921a1a] disabled:opacity-50"
              >
                บันทึกผู้เข้าอบรม
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal Preview */}
      {selectedCertApp && (
        <CertificateModal
          application={selectedCertApp}
          onClose={() => setSelectedCertApp(null)}
        />
      )}
    </div>
  );
}
