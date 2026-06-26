/* ===================================================================
   Belt Stock Dashboard — โหลดข้อมูล + วาดกราฟ/ตาราง + refresh อัตโนมัติ
   =================================================================== */
const CFG = window.APP_CONFIG || {};
const CUR = CFG.CURRENCY || "฿";
const REFRESH = (CFG.REFRESH_SECONDS || 30) * 1000;
let DATA = null;
let activeSize = "ALL";
const charts = {};

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const fmt = (n, d = 0) => (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtM = n => CUR + (Number(n) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "M";
const fmtB = n => CUR + fmt(n);
const pct = (a, b) => b ? (a / b * 100) : 0;
const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);

const PALETTE = ["#2563eb","#0ea5e9","#06b6d4","#10b981","#22c55e","#84cc16",
  "#eab308","#f59e0b","#f97316","#ef4444","#ec4899","#a855f7","#8b5cf6","#64748b","#0d9488","#475569"];

function thDate(iso){
  if(!iso) return "—";
  const d = new Date(iso);
  if(isNaN(d)) return iso;
  return d.toLocaleString("th-TH",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

/* ---------- data load ---------- */
async function loadData(){
  setConn("loading");
  if(CFG.API_URL){
    try{
      const r = await fetch(CFG.API_URL + (CFG.API_URL.includes("?")?"&":"?") + "t=" + Date.now());
      if(!r.ok) throw new Error("HTTP "+r.status);
      const j = await r.json();
      DATA = normalize(j);
      setConn("live");
      $("#sampleBanner").classList.add("hide");
      render();
      return;
    }catch(e){
      console.warn("เชื่อม API ไม่ได้ ใช้ข้อมูลตัวอย่างแทน:", e);
    }
  }
  // fallback
  DATA = normalize(window.SAMPLE_DATA);
  setConn("sample");
  $("#sampleBanner").classList.remove("hide");
  render();
}

function normalize(j){
  return {
    updatedAt: j.updatedAt || new Date().toISOString(),
    stock: (j.stock||[]).map(s=>({
      size:String(s.size), good:+s.good||0, damaged:+s.damaged||0, recovered:+s.recovered||0
    })),
    budget: (j.budget||[]).map(b=>({
      code:String(b.code||""), name:b.name||"", budget:+b.budget||0, used:+b.used||0
    })),
    transactions: (j.transactions||[]).slice().sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))
  };
}

function setConn(state){
  const dot=$("#connDot"), t=$("#connText");
  dot.classList.remove("off");
  if(state==="live"){ t.textContent="เชื่อมต่อแล้ว (Realtime)"; }
  else if(state==="loading"){ t.textContent="กำลังโหลด…"; }
  else { t.textContent="โหมดตัวอย่าง"; dot.classList.add("off"); }
}

/* ---------- render root ---------- */
function render(){
  $("#updatedAt").textContent = thDate(DATA.updatedAt);
  $("#refSec").textContent = (REFRESH/1000);
  renderSizeChips();
  renderStock();
  renderBudget();
}

/* =================== STOCK =================== */
function stockFiltered(){
  return activeSize==="ALL" ? DATA.stock : DATA.stock.filter(s=>s.size===activeSize);
}

function renderSizeChips(){
  const box=$("#sizeChips");
  const sizes=["ALL",...DATA.stock.map(s=>s.size)];
  box.innerHTML = sizes.map(sz=>{
    const lab = sz==="ALL" ? "ทุกขนาด" : sz;
    return `<div class="chip ${sz===activeSize?'active':''}" data-size="${sz}">${lab}</div>`;
  }).join("");
  box.querySelectorAll(".chip").forEach(c=>c.onclick=()=>{
    activeSize=c.dataset.size; renderSizeChips(); renderStock();
  });
}

function renderStock(){
  const rows = stockFiltered();
  const tGood=sum(rows,r=>r.good), tDmg=sum(rows,r=>r.damaged), tRec=sum(rows,r=>r.recovered);
  const tAll=tGood+tDmg;

  $("#stockKpis").innerHTML = `
    <div class="kpi feat"><div class="lab">สายพานทั้งหมด</div>
      <div class="val">${fmt(tAll,0)} <span style="font-size:14px">ม.</span></div>
      <div class="sub">${activeSize==="ALL"?DATA.stock.length+" ขนาด":"ขนาด "+activeSize}</div></div>
    <div class="kpi accent-g"><div class="lab">ดี / พร้อมใช้</div>
      <div class="val txt-g">${fmt(tGood,0)}</div>
      <div class="bar"><span style="width:${pct(tGood,tAll)}%;background:var(--green)"></span></div>
      <div class="sub">${fmt(pct(tGood,tAll),1)}% ของทั้งหมด</div></div>
    <div class="kpi accent-r"><div class="lab">เสีย / เสื่อมสภาพ</div>
      <div class="val txt-r">${fmt(tDmg,0)}</div>
      <div class="bar"><span style="width:${pct(tDmg,tAll)}%;background:var(--red)"></span></div>
      <div class="sub">${fmt(pct(tDmg,tAll),1)}% ของทั้งหมด</div></div>
    <div class="kpi accent-t"><div class="lab">เก็บกู้ได้แล้ว (สะสม)</div>
      <div class="val" style="color:var(--teal)">${fmt(tRec,0)}</div>
      <div class="sub">หน่วย: เมตร</div></div>`;

  // table
  const tb=$("#stockTable tbody"); tb.innerHTML="";
  rows.forEach(r=>{
    const all=r.good+r.damaged;
    tb.innerHTML += `<tr>
      <td class="l"><b>${r.size}</b></td>
      <td class="txt-r">${fmt(r.damaged,1)}</td>
      <td class="txt-g">${fmt(r.good,1)}</td>
      <td>${fmt(all,1)}</td>
      <td><span class="pill ${pct(r.good,all)>=50?'p-g':'p-a'}">${fmt(pct(r.good,all),1)}%</span></td>
      <td>${fmt(r.recovered,1)}</td></tr>`;
  });
  $("#stockTable tfoot").innerHTML = `<tr>
    <td class="l">รวมทั้งหมด</td><td>${fmt(tDmg,1)}</td><td>${fmt(tGood,1)}</td>
    <td>${fmt(tAll,1)}</td><td>${fmt(pct(tGood,tAll),1)}%</td><td>${fmt(tRec,1)}</td></tr>`;

  // charts (always full set for context)
  const labels=DATA.stock.map(s=>s.size);
  drawBar("stockBar", labels,
    [{label:"เสีย",data:DATA.stock.map(s=>s.damaged),color:"#dc2626"},
     {label:"ดี / พร้อมใช้",data:DATA.stock.map(s=>s.good),color:"#16a34a"}],
    " ม.");
  drawDonut("stockDonut", labels, DATA.stock.map(s=>s.good), "ดี (ม.)");

  // transactions
  const tt=$("#txnTable tbody"); tt.innerHTML="";
  const txns = (DATA.transactions||[]).slice(0,12);
  if(!txns.length){ tt.innerHTML=`<tr><td colspan="7" class="l" style="color:var(--muted)">— ยังไม่มีรายการ —</td></tr>`; }
  txns.forEach(x=>{
    const cls = x.type==="เบิกจ่าย"?"p-a":(x.type==="ตัดสภาพ"?"p-r":"p-g");
    tt.innerHTML += `<tr>
      <td class="l">${thDate(x.timestamp)}</td>
      <td class="l"><span class="pill ${cls}">${x.type||"-"}</span></td>
      <td class="l">${x.size||"-"}</td>
      <td>${fmt(x.length,1)}</td>
      <td class="l">${x.location||"-"}</td>
      <td class="l">${x.by||"-"}</td>
      <td class="l">${x.note||"-"}</td></tr>`;
  });
}

/* =================== BUDGET =================== */
function renderBudget(){
  const B = DATA.budget.slice().sort((a,b)=>b.budget-a.budget);
  const tBud=sum(B,r=>r.budget), tUsed=sum(B,r=>r.used), tRem=tBud-tUsed;
  const active=B.filter(r=>r.used>0).length;

  $("#budgetKpis").innerHTML = `
    <div class="kpi feat"><div class="lab">งบประมาณรวม</div>
      <div class="val">${fmtM(tBud)}</div><div class="sub">${B.length} หมวด</div></div>
    <div class="kpi accent-t"><div class="lab">ใช้ไปแล้ว</div>
      <div class="val" style="color:var(--teal)">${fmtM(tUsed)}</div>
      <div class="bar"><span style="width:${pct(tUsed,tBud)}%;background:var(--teal)"></span></div>
      <div class="sub">${fmt(pct(tUsed,tBud),1)}% ของงบ</div></div>
    <div class="kpi accent-g"><div class="lab">คงเหลือ</div>
      <div class="val txt-g">${fmtM(tRem)}</div>
      <div class="sub">${fmt(pct(tRem,tBud),1)}% ของงบ</div></div>
    <div class="kpi accent-a"><div class="lab">หมวดที่มีการใช้จ่าย</div>
      <div class="val" style="color:var(--amber)">${active}/${B.length}</div>
      <div class="sub">หมวดที่เริ่มเบิกแล้ว</div></div>`;

  // table
  const tb=$("#budgetTable tbody"); tb.innerHTML="";
  B.forEach(r=>{
    const rem=r.budget-r.used, p=pct(r.used,r.budget);
    const over=p>100;
    tb.innerHTML += `<tr>
      <td class="l"><b>${r.code}</b></td>
      <td class="l">${r.name}</td>
      <td>${fmtB(r.budget)}</td>
      <td>${fmtB(r.used)}</td>
      <td class="${rem<0?'txt-r':''}">${fmtB(rem)}</td>
      <td><span class="pill ${over?'p-r':(p>=80?'p-a':'p-b')}">${fmt(p,1)}%</span></td></tr>`;
  });
  $("#budgetTable tfoot").innerHTML=`<tr>
    <td class="l" colspan="2">รวมทั้งหมด</td>
    <td>${fmtB(tBud)}</td><td>${fmtB(tUsed)}</td><td>${fmtB(tRem)}</td>
    <td>${fmt(pct(tUsed,tBud),1)}%</td></tr>`;

  // charts
  const labels=B.map(r=>r.code);
  drawBar("budgetBar", labels,
    [{label:"ใช้ไป",data:B.map(r=>r.used),color:"#2563eb"},
     {label:"คงเหลือ",data:B.map(r=>Math.max(0,r.budget-r.used)),color:"#cbd5e1"}],
    "", true, true);
  // donut of used by code (skip zero)
  const used=B.filter(r=>r.used>0);
  drawDonut("budgetDonut", used.map(r=>r.code), used.map(r=>r.used), "ใช้ไป", true);
}

/* =================== CHART HELPERS =================== */
Chart.register(ChartDataLabels);
Chart.defaults.font.family = "'Noto Sans Thai','Inter',sans-serif";
Chart.defaults.plugins.datalabels.display = false;

function drawBar(id, labels, series, unit="", stacked=false, money=false){
  if(charts[id]) charts[id].destroy();
  charts[id]=new Chart($("#"+id),{
    type:"bar",
    data:{labels, datasets:series.map(s=>({
      label:s.label, data:s.data, backgroundColor:s.color, borderRadius:4, maxBarThickness:46
    }))},
    options:{
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:"index",intersect:false},
      scales:{
        x:{stacked, grid:{display:false}},
        y:{stacked, beginAtZero:true, ticks:{callback:v=> money? CUR+(v/1e6)+"M" : fmt(v)+unit}}
      },
      plugins:{
        legend:{position:"top",labels:{boxWidth:12,usePointStyle:true,pointStyle:"circle"}},
        datalabels:{display:false},
        tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${money?fmtB(c.raw):fmt(c.raw,1)+unit}`}}
      }
    }
  });
}

function drawDonut(id, labels, data, name="", money=false){
  if(charts[id]) charts[id].destroy();
  const total=data.reduce((s,x)=>s+(+x||0),0);
  charts[id]=new Chart($("#"+id),{
    type:"doughnut",
    data:{labels, datasets:[{data, backgroundColor:labels.map((_,i)=>PALETTE[i%PALETTE.length]),
      borderColor:"#fff", borderWidth:2}]},
    options:{
      responsive:true, maintainAspectRatio:false, cutout:"58%",
      plugins:{
        legend:{position:"right",labels:{boxWidth:11,usePointStyle:true,pointStyle:"circle",font:{size:11},padding:8}},
        datalabels:{
          display:ctx=> (ctx.dataset.data[ctx.dataIndex]/total*100)>=4,
          color:"#fff", font:{weight:"700",size:11},
          formatter:(v)=> (v/total*100>=4) ? (v/total*100).toFixed(1)+"%" : ""
        },
        tooltip:{callbacks:{label:c=>{
          const p=(c.raw/total*100).toFixed(1);
          return ` ${c.label}: ${money?fmtB(c.raw):fmt(c.raw,1)} (${p}%)`;
        }}}
      }
    }
  });
}

/* =================== TABS / EVENTS =================== */
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  t.classList.add("active");
  $("#tab-stock").classList.toggle("hide", t.dataset.tab!=="stock");
  $("#tab-budget").classList.toggle("hide", t.dataset.tab!=="budget");
});

$("#refreshBtn").onclick = function(){
  this.disabled = true;
  loadData().finally(()=> setTimeout(()=> this.disabled=false, 600));
};

/* auto refresh */
loadData();
setInterval(loadData, REFRESH);
