# Lifelong-Learning-

ระบบบริหารจัดการหลักสูตรฝึกอบรมระยะสั้นและยานยนต์ไฟฟ้า (EV Training Portal)  
**มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา เชียงราย Lifelong Learning**  
🌐 **Live Website:** [https://rmutlcr-academy.vercel.app](https://rmutlcr-academy.vercel.app)

---

## 🚀 คุณสมบัติเด่น (Features)

- **ระบบหลักสูตรอบรม (Courses)**:
  - การติดตั้งตู้ชาร์จรถไฟฟ้า (EV Charger Installation) 3 วัน 24 ชั่วโมง
  - หลักสูตรช่างซ่อมรถไฟฟ้า (EV Repair & Maintenance Program) 5 วัน 30 ชั่วโมง
  - คู่มือผู้ใช้รถไฟฟ้าที่สมบูรณ์ (EV Masterclass for Users) 1 วัน 6 ชั่วโมง
  - หลักสูตร Digital Transformation, Creative Communication, Data Literacy
- **ระบบเข้าสู่ระบบ (Authentication & Student Portal)**:
  - เข้าสู่ระบบด้วย Google (Google Sign-In / OAuth 2.0)
  - รองรับการเชื่อมต่อยืนยันตัวตน ThaiD
  - หน้าต่างข้อกำหนดและเงื่อนไขการสมัครสมาชิกตามมาตรฐาน มหาวิทยาลัย
- **แดชบอร์ดผู้เรียน (Student Dashboard)**:
  - ติดตามสถานะหลักสูตรที่กำลังอบรม (Active Enrollment & Progress Bar)
  - ประวัติและสถานะการสมัครเรียน (Application Tracking)
  - ปฏิทินกำหนดการอบรมและกิจกรรม (Upcoming Schedule)

---

## 🛠️ วิธีการติดตั้งและรันในเครื่อง (Run Locally)

1. **ติดตั้ง Dependencies**:
   ```bash
   pnpm install
   ```

2. **สร้างไฟล์ Environment (`.env`)**:
   คัดลอกไฟล์ `.env.example` ไปเป็น `.env`:
   ```bash
   cp .env.example .env
   ```

3. **รัน Dev Server**:
   ```bash
   node node_modules/tsx/dist/cli.mjs server/_core/index.ts
   ```
   หรือ
   ```bash
   pnpm dev
   ```

4. เปิดใช้งานผ่านเบราว์เซอร์ที่: **`http://localhost:3000`**

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

- `client/`: ส่วนติดต่อผู้ใช้ พัฒนาด้วย React 19, Vite, Tailwind CSS, และ Wouter
- `server/`: Backend API พัฒนาด้วย Express, tRPC, Drizzle ORM
- `shared/`: Type definitions และ Constants ที่แชร์ระหว่าง Frontend และ Backend
- `data/`: ข้อมูลหลักสูตร (Courses) และกิจกรรม (Events) ในรูปแบบ JSON
- `assets/ev-training/`: รูปภาพแบนเนอร์และภาพบรรยากาศการอบรมยานยนต์ไฟฟ้า

---

© 2567 มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา เชียงราย Lifelong Learning. All rights reserved.
