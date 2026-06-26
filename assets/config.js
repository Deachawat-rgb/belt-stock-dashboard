// ===================================================================
//  ตั้งค่าการเชื่อมต่อ Google Apps Script Web App
//  วิธีหา URL: ดู README.md ขั้นตอนที่ 3 (Deploy > New deployment > Web app)
//  วาง URL ที่ได้ (ขึ้นต้น https://script.google.com/macros/s/..../exec)
//  ถ้ายังไม่ตั้ง ปล่อยว่างไว้ได้ — เว็บจะใช้ "ข้อมูลตัวอย่าง" แสดงผลก่อน
// ===================================================================
window.APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzORg_dcPu25E69KFZJHzxaUrV7wv7r_V-XhyF5XAKpYeGdg5ccD7GP_Jl8Si6XTzgwDA/exec",
  REFRESH_SECONDS: 30,         // รอบ refresh อัตโนมัติ (วินาที)
  CURRENCY: "฿"
};
