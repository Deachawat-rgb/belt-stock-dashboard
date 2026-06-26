// ข้อมูลตัวอย่าง (fallback) — ใช้แสดงผลเมื่อยังไม่ได้ตั้ง API_URL หรือเชื่อมต่อไม่ได้
// โครงสร้างนี้ตรงกับ JSON ที่ Apps Script จะส่งกลับมา
window.SAMPLE_DATA = {
  updatedAt: "2026-06-26T10:00:00+07:00",
  stock: [
    { size: "1800",         good: 2907.2, damaged: 7097.0,  recovered: 6427.9  },
    { size: "2000",         good: 5365.4, damaged: 2031.7,  recovered: 12825.75 },
    { size: "2000 CR",      good: 50.0,   damaged: 0.0,     recovered: 50.0    },
    { size: "2200",         good: 7043.6, damaged: 3503.85, recovered: 8313.85 },
    { size: "2400 CR (DC)", good: 50.0,   damaged: 0.0,     recovered: 50.0    },
    { size: "2400 CR (Fine)", good: 125.0, damaged: 0.0,    recovered: 125.0   }
  ],
  budget: [
    { code: "0-101", name: "Conveyor Equipment",            budget: 50480000, used: 32868045 },
    { code: "4-501", name: "Lubricant CV",                  budget: 7827839,  used: 8301519  },
    { code: "6-101", name: "Spreader",                      budget: 12894496, used: 2376005  },
    { code: "6-102", name: "Bucket Wheel Excv, Belt Wagon, Hopper", budget: 68140580, used: 25159023 },
    { code: "6-103", name: "Crusher 5500/1500 TPH",         budget: 32360280, used: 8973680  },
    { code: "6-104", name: "Conveyor",                      budget: 51080670, used: 16979846 },
    { code: "6-105", name: "Auxiliary CV Equipment",        budget: 9617497,  used: 3261118  },
    { code: "6-106", name: "Service CV Equipment",          budget: 6261952,  used: 4086138  },
    { code: "6-111", name: "General Consume Material CV",   budget: 2180000,  used: 2082450  },
    { code: "6-227", name: "Hydraulic Hose & Fitting",      budget: 436000,   used: 0        },
    { code: "7-101", name: "Service Spreader",              budget: 200000,   used: 0        },
    { code: "7-102", name: "Service Bucket Wheel Excv",     budget: 1200000,  used: 0        },
    { code: "7-103", name: "Service Crusher",               budget: 200000,   used: 0        },
    { code: "7-104", name: "Service Conveyor",              budget: 1500000,  used: 82500    },
    { code: "9-111", name: "General Expense CV",            budget: 4001337,  used: 686531   },
    { code: "8-307", name: "(หมวด 8-307 — กรุณาตรวจชื่อ/ตัวเลข)", budget: 62999349, used: 51223145 }
  ],
  transactions: [
    { timestamp: "2026-06-25T09:12:00+07:00", type: "เบิกจ่าย",  size: "2000", length: 247.6, location: "N4 กอง4", by: "ช่างประจำไลน์", note: "เปลี่ยนสายพานจุดตัด" },
    { timestamp: "2026-06-24T14:30:00+07:00", type: "ตัดสภาพ",  size: "1800", length: 120.0, location: "N8",       by: "หัวหน้ากะ",      note: "ยางร่อน เสียสภาพ" },
    { timestamp: "2026-06-23T08:05:00+07:00", type: "รับเข้า",   size: "2200", length: 247.6, location: "ลานเก็บ",  by: "คลัง",          note: "สายพานใหม่ Pre-joint" }
  ]
};
