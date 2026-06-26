# Belt Stock Dashboard

Interactive Dashboard สำหรับ **สต็อกสายพาน** (แยกขนาด) และ **งบประมาณจัดซื้อ** (แยก CODE)
อัปเดต **Realtime** จาก Google Sheet ผ่าน Google Apps Script + Deploy บน **GitHub Pages**

```
belt-dashboard/
├── index.html            ← หน้า Dashboard หลัก (2 แท็บ: สต็อก / งบประมาณ)
├── entry.html            ← หน้าบันทึก เบิกจ่าย / ตัดสภาพ / รับเข้า
├── assets/
│   ├── config.js         ← ★ ใส่ API_URL ตรงนี้
│   ├── styles.css
│   ├── app.js
│   └── sample-data.js    ← ข้อมูลตัวอย่าง (ใช้ตอนยังไม่เชื่อม API)
└── apps-script/
    └── Code.gs           ← โค้ดหลังบ้าน (วางใน Apps Script)
```

> เปิด `index.html` ได้เลยตอนนี้ จะเห็น Dashboard ทำงานด้วย **ข้อมูลตัวอย่าง** ก่อน
> เมื่อทำขั้นตอนข้างล่างเสร็จ มันจะดึงข้อมูลจริงแบบ realtime

---

## ขั้นตอนที่ 1 — สร้าง Google Sheet
1. ไปที่ <https://sheets.new> สร้างไฟล์ใหม่ ตั้งชื่อเช่น `Belt Stock Data`

## ขั้นตอนที่ 2 — ใส่โค้ดหลังบ้าน (Apps Script)
1. ในไฟล์ Sheet เมนู **ส่วนขยาย (Extensions) → Apps Script**
2. ลบโค้ดเดิมทิ้ง แล้ว **คัดลอกทั้งหมดจาก `apps-script/Code.gs`** มาวาง → กด 💾 บันทึก
3. เลือกฟังก์ชัน **`setupSheets`** ที่แถบบน แล้วกด **▶ Run** หนึ่งครั้ง
   - ครั้งแรกจะขออนุญาต → Review permissions → เลือกบัญชี → Advanced → Go to ... → Allow
   - เสร็จแล้วกลับไปดู Sheet จะมี 3 แท็บ: `Stock`, `Budget`, `Transactions` พร้อมข้อมูลตั้งต้น
   - ✏️ แก้ตัวเลข/หมวด `8-307` และข้อมูลอื่นให้ตรงจริงได้เลยในแท็บ

## ขั้นตอนที่ 3 — Deploy เป็น Web App (ได้ URL สำหรับ realtime)
1. ใน Apps Script กด **Deploy → New deployment**
2. ไอคอนเฟือง ⚙️ → เลือก **Web app**
3. ตั้งค่า:
   - **Execute as:** Me (อีเมลคุณ)
   - **Who has access:** **Anyone** ← สำคัญ! (เพื่อให้เว็บดึงข้อมูลได้)
4. กด **Deploy** → คัดลอก **Web app URL** (ขึ้นต้น `https://script.google.com/macros/s/.../exec`)

## ขั้นตอนที่ 4 — ผูก URL เข้ากับ Dashboard
1. เปิด `assets/config.js`
2. วาง URL ที่ได้:
   ```js
   API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
   ```
3. บันทึก → เปิด `index.html` ใหม่ มุมขวาบนจะขึ้น **"เชื่อมต่อแล้ว (Realtime)"** จุดเขียว

---

## ขั้นตอนที่ 5 — ขึ้น GitHub Pages
1. สร้าง repo ใหม่บน GitHub เช่น `belt-dashboard` (Public)
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ (ลาก-วางในหน้า repo หรือใช้ git — ดูข้างล่าง)
3. ไปที่ **Settings → Pages → Source: Deploy from a branch → Branch: `main` / root** → Save
4. รอ ~1 นาที จะได้ลิงก์ `https://<username>.github.io/belt-dashboard/`

### ขึ้นด้วย git (ถ้าถนัด command line)
```bash
cd belt-dashboard
git init
git add .
git commit -m "Belt Stock Dashboard"
git branch -M main
git remote add origin https://github.com/<username>/belt-dashboard.git
git push -u origin main
```

---

## การใช้งานประจำวัน
- **ดูภาพรวม:** เปิดลิงก์ GitHub Pages → สลับแท็บ *สต็อกสายพาน / งบประมาณจัดซื้อ* → กรองตามขนาดด้วยชิปด้านบน
- **บันทึกเบิกจ่าย/ตัดสภาพ:** กดปุ่ม *➕ บันทึกเบิกจ่าย/ตัดสภาพ* → กรอกฟอร์ม → บันทึก
  - ระบบจะลงรายการในแท็บ `Transactions` และปรับตัวเลขในแท็บ `Stock` อัตโนมัติ
  - Dashboard รีเฟรชเองทุก 30 วินาที (หรือกดปุ่ม ↻ รีเฟรช)

### ตรรกะการปรับสต็อก
| ประเภท | ผลต่อสต็อก |
|---|---|
| **เบิกจ่าย** | ลด "ดี" ตามความยาวที่ใช้ |
| **ตัดสภาพ** | ย้าย "ดี" → "เสีย" |
| **รับเข้า** | เพิ่ม "ดี" + นับ "เก็บกู้ได้" |

---

## แก้ปัญหาที่พบบ่อย
- **ขึ้น "โหมดตัวอย่าง" (จุดเหลือง):** ยังไม่ได้ใส่ `API_URL` หรือ URL ผิด/ยังไม่ Deploy
- **กดบันทึกแล้ว error เชื่อมต่อไม่ได้:** ตอน Deploy ต้องตั้ง *Who has access = Anyone*
- **แก้โค้ด Apps Script แล้วไม่อัปเดต:** ต้อง **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (URL เดิมใช้ต่อได้)
- **อยากเพิ่มขนาดสายพานใหม่:** พิมพ์แถวใหม่ในแท็บ `Stock` ได้เลย Dashboard จะแสดงให้เอง
