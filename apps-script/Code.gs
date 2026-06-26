/*****************************************************************
 * Belt Stock Dashboard — Google Apps Script Web App (Backend API)
 * -----------------------------------------------------------------
 * ใช้คู่กับ Google Sheet ที่มี 3 แท็บ (ชื่อต้องตรงเป๊ะ):
 *   1) "Stock"        : ขนาด | ดี | เสีย | เก็บกู้ได้
 *   2) "Budget"       : CODE | หมวด | งบประมาณ | ใช้ไป
 *   3) "Transactions" : เวลา | ประเภท | ขนาด | ความยาว | ตำแหน่ง | ผู้บันทึก | หมายเหตุ
 *
 * การติดตั้ง: ดู README.md ขั้นตอนที่ 2–3
 * - doGet()  : ส่งข้อมูลทั้งหมดเป็น JSON ให้ Dashboard (realtime)
 * - doPost() : รับรายการเบิกจ่าย/ตัดสภาพ/รับเข้า → บันทึก + อัปเดตสต็อก
 *****************************************************************/

var SHEET_STOCK = "Stock";
var SHEET_BUDGET = "Budget";
var SHEET_TXN = "Transactions";

function doGet(e) {
  try {
    return json({
      updatedAt: new Date().toISOString(),
      stock: readStock(),
      budget: readBudget(),
      transactions: readTxns(50)
    });
  } catch (err) {
    return json({ error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action === "addTxn") {
      var res = addTransaction(body);
      return json({ ok: true, result: res });
    }
    return json({ ok: false, error: "unknown action" });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* ---------- READ ---------- */
function readStock() {
  var sh = ss().getSheetByName(SHEET_STOCK);
  var v = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < v.length; i++) {
    if (v[i][0] === "" && v[i][1] === "") continue;
    out.push({
      size: String(v[i][0]),
      good: num(v[i][1]),
      damaged: num(v[i][2]),
      recovered: num(v[i][3])
    });
  }
  return out;
}

function readBudget() {
  var sh = ss().getSheetByName(SHEET_BUDGET);
  var v = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < v.length; i++) {
    if (v[i][0] === "") continue;
    out.push({
      code: String(v[i][0]),
      name: String(v[i][1]),
      budget: num(v[i][2]),
      used: num(v[i][3])
    });
  }
  return out;
}

function readTxns(limit) {
  var sh = ss().getSheetByName(SHEET_TXN);
  var v = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < v.length; i++) {
    if (v[i][0] === "") continue;
    out.push({
      timestamp: toIso(v[i][0]),
      type: String(v[i][1]),
      size: String(v[i][2]),
      length: num(v[i][3]),
      location: String(v[i][4]),
      by: String(v[i][5]),
      note: String(v[i][6])
    });
  }
  out.reverse(); // ล่าสุดก่อน
  return limit ? out.slice(0, limit) : out;
}

/* ---------- WRITE ---------- */
function addTransaction(b) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var size = String(b.size);
    var len = num(b.length);
    var type = String(b.type);

    // 1) log transaction
    var tx = ss().getSheetByName(SHEET_TXN);
    tx.appendRow([new Date(), type, size, len, b.location || "", b.by || "", b.note || ""]);

    // 2) update stock snapshot
    var sh = ss().getSheetByName(SHEET_STOCK);
    var v = sh.getDataRange().getValues();
    var row = -1;
    for (var i = 1; i < v.length; i++) {
      if (String(v[i][0]) === size) { row = i + 1; break; }
    }
    if (row === -1) {
      // ขนาดใหม่ที่ยังไม่มี → เพิ่มแถว
      sh.appendRow([size, type === "ตัดสภาพ" ? 0 : len, type === "ตัดสภาพ" ? len : 0, type === "รับเข้า" ? len : 0]);
      return "added new size row";
    }
    var good = num(sh.getRange(row, 2).getValue());
    var dmg = num(sh.getRange(row, 3).getValue());
    var rec = num(sh.getRange(row, 4).getValue());

    if (type === "เบิกจ่าย") {
      good = good - len;                 // นำดีไปใช้
    } else if (type === "ตัดสภาพ") {
      good = good - len; dmg = dmg + len; // ดี → เสีย
    } else if (type === "รับเข้า") {
      good = good + len; rec = rec + len; // เพิ่มดี + นับเก็บกู้
    }
    sh.getRange(row, 2).setValue(good);
    sh.getRange(row, 3).setValue(dmg);
    sh.getRange(row, 4).setValue(rec);
    return "stock updated";
  } finally {
    lock.releaseLock();
  }
}

/* ---------- helpers ---------- */
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function num(x) { var n = parseFloat(String(x).replace(/,/g, "")); return isNaN(n) ? 0 : n; }
function toIso(d) { try { return (d instanceof Date) ? d.toISOString() : String(d); } catch (e) { return String(d); } }
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- ตั้งค่าเริ่มต้น (รันครั้งเดียวเพื่อสร้างหัวตาราง + ข้อมูลตั้งต้น) ---------- */
function setupSheets() {
  var book = ss();
  ensureSheet(book, SHEET_STOCK, ["ขนาด", "ดี (ม.)", "เสีย (ม.)", "เก็บกู้ได้ (ม.)"], [
    ["1800", 2907.2, 7097.0, 6427.9],
    ["2000", 5365.4, 2031.7, 12825.75],
    ["2000 CR", 50, 0, 50],
    ["2200", 7043.6, 3503.85, 8313.85],
    ["2400 CR (DC)", 50, 0, 50],
    ["2400 CR (Fine)", 125, 0, 125]
  ]);
  ensureSheet(book, SHEET_BUDGET, ["CODE", "หมวด", "งบประมาณ", "ใช้ไป"], [
    ["0-101", "Conveyor Equipment", 50480000, 32868045],
    ["4-501", "Lubricant CV", 7827839, 8301519],
    ["6-101", "Spreader", 12894496, 2376005],
    ["6-102", "Bucket Wheel Excv, Belt Wagon, Hopper", 68140580, 25159023],
    ["6-103", "Crusher 5500/1500 TPH", 32360280, 8973680],
    ["6-104", "Conveyor", 51080670, 16979846],
    ["6-105", "Auxiliary CV Equipment", 9617497, 3261118],
    ["6-106", "Service CV Equipment", 6261952, 4086138],
    ["6-111", "General Consume Material CV", 2180000, 2082450],
    ["6-227", "Hydraulic Hose & Fitting", 436000, 0],
    ["7-101", "Service Spreader", 200000, 0],
    ["7-102", "Service Bucket Wheel Excv", 1200000, 0],
    ["7-103", "Service Crusher", 200000, 0],
    ["7-104", "Service Conveyor", 1500000, 82500],
    ["9-111", "General Expense CV", 4001337, 686531],
    ["8-307", "(หมวด 8-307 — กรุณาตรวจชื่อ/ตัวเลข)", 62999349, 51223145]
  ]);
  ensureSheet(book, SHEET_TXN, ["เวลา", "ประเภท", "ขนาด", "ความยาว (ม.)", "ตำแหน่ง", "ผู้บันทึก", "หมายเหตุ"], []);
}

function ensureSheet(book, name, headers, rows) {
  var sh = book.getSheetByName(name);
  if (!sh) sh = book.insertSheet(name);
  else sh.clear();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  if (rows && rows.length) sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sh.setFrozenRows(1);
}
