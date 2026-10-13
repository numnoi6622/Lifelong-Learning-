import { Award, CheckCircle2, Download, Printer, ShieldCheck, X } from "lucide-react";

interface CertificateModalProps {
  application: {
    id: number;
    fullName: string;
    email: string;
    courseTitle: string;
    courseDuration: string;
    certificateNo?: string | null;
    certificateIssuedAt?: string | null;
    completedAt?: string | null;
  };
  onClose: () => void;
}

function formatThaiFullDate(dateStr?: string | null) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export default function CertificateModal({ application, onClose }: CertificateModalProps) {
  const certNo =
    application.certificateNo || `RMUTLCR-EV-2569-${String(application.id).padStart(4, "0")}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto print:bg-white print:p-0">
      <div className="relative my-8 w-full max-w-4xl rounded-3xl bg-white p-4 sm:p-6 shadow-2xl print:my-0 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#fdf0f0] text-[#7b1313]">
              <Award size={22} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#7b1313]">
                ใบประกาศนียบัตรออนไลน์ (e-Certificate)
              </h3>
              <p className="text-xs text-slate-500">
                เลขที่ทะเบียน: <span className="font-mono font-semibold text-slate-700">{certNo}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-[#7b1313] px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-[#921a1a]"
            >
              <Printer size={15} /> พิมพ์ / ดาวน์โหลด PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Certificate Canvas */}
        <div
          id="certificate-print-area"
          className="relative overflow-hidden rounded-2xl border-[10px] border-double border-[#c59b27] bg-gradient-to-br from-[#fffdf7] via-white to-[#fcf8ec] p-8 sm:p-14 text-center shadow-inner"
        >
          {/* Decorative Corner Accents */}
          <div className="pointer-events-none absolute left-3 top-3 h-16 w-16 border-l-4 border-t-4 border-[#7b1313]/40" />
          <div className="pointer-events-none absolute right-3 top-3 h-16 w-16 border-r-4 border-t-4 border-[#7b1313]/40" />
          <div className="pointer-events-none absolute bottom-3 left-3 h-16 w-16 border-b-4 border-l-4 border-[#7b1313]/40" />
          <div className="pointer-events-none absolute bottom-3 right-3 h-16 w-16 border-b-4 border-r-4 border-[#7b1313]/40" />

          {/* Header Logo & University Name */}
          <div className="relative z-10 flex flex-col items-center">
            <img
              src="/rmutl-logo.jpg"
              alt="RMUTL Logo"
              className="h-24 w-auto object-contain drop-shadow-sm"
            />
            <div className="mt-4 font-serif text-2xl sm:text-3xl font-bold tracking-wide text-[#7b1313]">
              มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา เชียงราย
            </div>
            <div className="mt-1 text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] text-[#a17b37]">
              Rajamangala University of Technology Lanna Chiang Rai · Lifelong Learning
            </div>

            <div className="mt-7 text-sm sm:text-base text-slate-600">
              ขอมอบใบประกาศนียบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า
            </div>

            {/* Recipient Name */}
            <div className="my-5 inline-block border-b-2 border-[#c59b27]/60 px-8 pb-2 font-serif text-3xl sm:text-4xl font-bold text-[#11243d]">
              {application.fullName}
            </div>

            <div className="max-w-2xl text-sm sm:text-base leading-relaxed text-slate-700">
              ได้ผ่านการฝึกอบรมและประเมินผลสมรรถนะครบตามเกณฑ์มาตรฐานของหลักสูตร
            </div>

            {/* Course Title */}
            <div className="mt-4 rounded-2xl bg-[#7b1313]/5 px-6 py-3 font-serif text-xl sm:text-2xl font-bold text-[#7b1313] border border-[#7b1313]/15">
              “{application.courseTitle}”
            </div>

            <div className="mt-3 text-xs sm:text-sm font-semibold text-slate-600">
              ระยะเวลาการฝึกอบรมรวม {application.courseDuration}
            </div>

            <div className="mt-6 text-xs sm:text-sm text-slate-600">
              ให้ไว้ ณ วันที่ {formatThaiFullDate(application.certificateIssuedAt || application.completedAt)}
            </div>

            {/* Signatures & Verification Footer */}
            <div className="mt-10 grid w-full max-w-2xl gap-6 pt-6 border-t border-[#c59b27]/30 sm:grid-cols-2 items-end">
              <div className="text-center">
                <div className="mx-auto w-44 border-b border-slate-400 pb-1 font-serif italic text-slate-700 text-sm">
                  มทร.ล้านนา เชียงราย
                </div>
                <div className="mt-2 text-xs font-bold text-slate-800">
                  ผู้บริหารโครงการ Lifelong Learning
                </div>
                <div className="text-[11px] text-slate-500">
                  มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา เชียงราย
                </div>
              </div>

              <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-700">
                  <ShieldCheck size={14} /> ตรวจสอบรับรองออนไลน์แล้ว (Verified)
                </div>
                <div className="mt-1.5 font-mono text-xs font-bold text-[#7b1313]">
                  Certificate No: {certNo}
                </div>
                <div className="text-[10px] text-slate-400">
                  ตรวจสอบที่: rmutlcr-academy.vercel.app
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
