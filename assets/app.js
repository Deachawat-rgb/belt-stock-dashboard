/* ===================================================================
   Belt Stock Dashboard — โหลดข้อมูล + วาดกราฟ/ตาราง + refresh อัตโนมัติ
   =================================================================== */
const CFG = window.APP_CONFIG || {};
const CUR = CFG.CURRENCY || "฿";
const REFRESH = (CFG.REFRESH_SECONDS || 30) * 1000;
let DATA = null;
const FILT = { year:"ALL", month:"ALL", type:"ALL", loc:"ALL", size:"ALL" };
let activeDrill = null;   // หมวดที่กำลังเปิด drill-down: good / damaged / recovered
const TH_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
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
  renderFilters();
  renderStock();
  renderLocations();
}

/* =================== FILTER BAR =================== */
// เติม option ลง select โดยคงค่าที่เลือกไว้
function fillSelect(id, allLabel, values){
  const sel=$("#"+id); if(!sel) return;
  const cur=sel.value;
  const opts=[`<option value="ALL">${allLabel}</option>`]
    .concat(values.map(v=>`<option value="${v.val}">${v.lab}</option>`));
  sel.innerHTML=opts.join("");
  // คงค่าเดิมถ้ายังมีอยู่
  if([...sel.options].some(o=>o.value===cur)) sel.value=cur;
  sel.closest(".fb-item")?.classList.toggle("changed", sel.value!=="ALL");
}

function renderFilters(){
  const txns=DATA.transactions||[];
  const years=[...new Set(txns.map(x=>{const d=new Date(x.timestamp);return isNaN(d)?null:d.getFullYear();}).filter(Boolean))].sort((a,b)=>b-a);
  const types=[...new Set(txns.map(x=>x.type).filter(Boolean))];
  // จุด: เริ่มจากรายการต้นฉบับ (config) แล้วเติมจุดใหม่ที่โผล่ใน transactions
  const baseLocs = window.LOCATIONS || [];
  const txnLocs = txns.map(x=>x.location).filter(Boolean);
  const locs=[...new Set([...baseLocs, ...txnLocs])];
  const sizes=DATA.stock.map(s=>s.size);

  fillSelect("fYear","ทุกปี", years.map(y=>({val:y, lab:(y+543)})));   // แสดง พ.ศ.
  fillSelect("fMonth","ทุกเดือน", TH_MONTHS.map((m,i)=>({val:i+1, lab:m})));
  fillSelect("fType","ทุกประเภท", types.map(t=>({val:t, lab:t})));
  fillSelect("fLoc","ทุกจุด", locs.map(l=>({val:l, lab:l})));
  fillSelect("fSize","ทุกขนาด", sizes.map(s=>({val:s, lab:s})));

  // ผูก event ครั้งเดียว
  ["fYear","fMonth","fType","fLoc","fSize"].forEach(id=>{
    const sel=$("#"+id);
    if(sel && !sel.dataset.bound){
      sel.dataset.bound="1";
      sel.onchange=()=>{ applyFilterState(); renderStock(); renderLocations(); };
    }
  });
  const rb=$("#fReset");
  if(rb && !rb.dataset.bound){
    rb.dataset.bound="1";
    rb.onclick=()=>{
      ["fYear","fMonth","fType","fLoc","fSize"].forEach(id=>{ const s=$("#"+id); if(s) s.value="ALL"; });
      applyFilterState(); renderStock(); renderLocations();
    };
  }
  applyFilterState();
}

function applyFilterState(){
  FILT.year = $("#fYear")?.value || "ALL";
  FILT.month= $("#fMonth")?.value || "ALL";
  FILT.type = $("#fType")?.value || "ALL";
  FILT.loc  = $("#fLoc")?.value || "ALL";
  FILT.size = $("#fSize")?.value || "ALL";
  ["fYear","fMonth","fType","fLoc","fSize"].forEach(id=>{
    const s=$("#"+id); s?.closest(".fb-item")?.classList.toggle("changed", s.value!=="ALL");
  });
}

/* =================== STOCK =================== */
// สต็อกเป็นภาพรวมปัจจุบัน มีมิติเดียวคือ "ขนาด"
function stockFiltered(){
  return FILT.size==="ALL" ? DATA.stock : DATA.stock.filter(s=>s.size===FILT.size);
}

// รายการเคลื่อนไหว กรองได้ครบทุกมิติ
function txnFiltered(){
  return (DATA.transactions||[]).filter(x=>{
    if(FILT.size!=="ALL" && String(x.size)!==FILT.size) return false;
    if(FILT.type!=="ALL" && x.type!==FILT.type) return false;
    if(FILT.loc!=="ALL"  && x.location!==FILT.loc) return false;
    const d=new Date(x.timestamp);
    if(FILT.year!=="ALL"  && (isNaN(d)||d.getFullYear()!=+FILT.year)) return false;
    if(FILT.month!=="ALL" && (isNaN(d)||(d.getMonth()+1)!=+FILT.month)) return false;
    return true;
  });
}

function renderStock(){
  const rows = stockFiltered();
  const tGood=sum(rows,r=>r.good), tDmg=sum(rows,r=>r.damaged), tRec=sum(rows,r=>r.recovered);
  const tAll=tGood+tDmg;

  $("#stockKpis").innerHTML = `
    <div class="kpi feat"><div class="lab">สายพานทั้งหมด</div>
      <div class="val">${fmt(tAll,0)} <span style="font-size:14px">ม.</span></div>
      <div class="sub">${FILT.size==="ALL"?DATA.stock.length+" ขนาด":"ขนาด "+FILT.size}</div></div>
    <div class="kpi accent-g clickable" data-cat="good"><div class="lab">ดี / พร้อมใช้</div>
      <div class="val txt-g">${fmt(tGood,0)}</div>
      <div class="bar"><span style="width:${pct(tGood,tAll)}%;background:var(--green)"></span></div>
      <div class="sub">${fmt(pct(tGood,tAll),1)}% ของทั้งหมด</div>
      <div class="hint">▾ คลิกดูแยกตามจุด</div></div>
    <div class="kpi accent-r clickable" data-cat="damaged"><div class="lab">เสีย / เสื่อมสภาพ</div>
      <div class="val txt-r">${fmt(tDmg,0)}</div>
      <div class="bar"><span style="width:${pct(tDmg,tAll)}%;background:var(--red)"></span></div>
      <div class="sub">${fmt(pct(tDmg,tAll),1)}% ของทั้งหมด</div>
      <div class="hint">▾ คลิกดูแยกตามจุด</div></div>
    <div class="kpi accent-t clickable" data-cat="recovered"><div class="lab">เก็บกู้ได้แล้ว (สะสม)</div>
      <div class="val" style="color:var(--teal)">${fmt(tRec,0)}</div>
      <div class="sub">หน่วย: เมตร</div>
      <div class="hint">▾ คลิกดูแยกตามจุด</div></div>`;

  // ผูกคลิกการ์ด → เปิด drill-down รายจุด
  $("#stockKpis").querySelectorAll(".kpi[data-cat]").forEach(c=>{
    c.onclick=()=> openDrill(c.dataset.cat);
    if(c.dataset.cat===activeDrill) c.classList.add("active");
  });
  if(activeDrill) renderDrill(activeDrill);

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

  // charts — กรองตามขนาดที่เลือก (เหมือน KPI/ตาราง)
  const labels=rows.map(s=>s.size);
  drawBar("stockBar", labels,
    [{label:"เสีย",data:rows.map(s=>s.damaged),color:"#dc2626"},
     {label:"ดี / พร้อมใช้",data:rows.map(s=>s.good),color:"#16a34a"}],
    " ม.");
  drawDonut("stockDonut", labels, rows.map(s=>s.good), "ดี (ม.)");

  // transactions
  const tt=$("#txnTable tbody"); tt.innerHTML="";
  const txns = txnFiltered().slice(0,20);
  if(!txns.length){ tt.innerHTML=`<tr><td colspan="7" class="l" style="color:var(--muted)">— ไม่มีรายการตามตัวกรอง —</td></tr>`; }
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

/* =================== DRILL-DOWN: ดี/เสีย/เก็บกู้ แยกตามจุด =================== */
const DRILL_META = {
  good:      {title:"ดี / พร้อมใช้",        color:"#16a34a", unit:"ม."},
  damaged:   {title:"เสีย / เสื่อมสภาพ",    color:"#dc2626", unit:"ม."},
  recovered: {title:"เก็บกู้ได้ (จากทะเบียน)", color:"#0d9488", unit:"ม."}
};

function openDrill(cat){
  // คลิกซ้ำการ์ดเดิม = ปิด
  activeDrill = (activeDrill===cat) ? null : cat;
  $("#stockKpis").querySelectorAll(".kpi[data-cat]").forEach(c=>
    c.classList.toggle("active", c.dataset.cat===activeDrill));
  if(activeDrill){
    renderDrill(activeDrill);
    $("#drillPanel").scrollIntoView({behavior:"smooth", block:"nearest"});
  }else{
    $("#drillPanel").classList.add("hide");
  }
}

function renderDrill(cat){
  const meta = DRILL_META[cat]; if(!meta) return;
  const data = ((window.LOCATION_DETAIL||{})[cat]||[]).slice().sort((a,b)=>b.m-a.m);
  const total = sum(data,r=>r.m);
  $("#drillPanel").classList.remove("hide");
  $("#drillTitle").innerHTML =
    `📍 <span style="color:${meta.color}">${meta.title}</span> — กระจายตามจุด
     <span class="h3-note">(รวม ${fmt(total,1)} ม. · ${data.length} จุด)</span>`;

  // chart
  drawLocBar("drillBar", data.map(r=>r.loc),
    [{label:"ความยาว (ม.)", data:data.map(r=>r.m),
      backgroundColor:meta.color, borderRadius:3, maxBarThickness:22}]);

  // table
  const tb=$("#drillTable tbody"); tb.innerHTML="";
  if(!data.length){ tb.innerHTML=`<tr><td colspan="4" class="l" style="color:var(--muted)">— ไม่มีข้อมูล —</td></tr>`; }
  data.forEach(r=>{
    const p=pct(r.m,total);
    tb.innerHTML += `<tr>
      <td class="l"><b>${r.loc}</b></td>
      <td>${fmt(r.m,1)}</td>
      <td>${r.smu>0?fmt(r.smu,0):"—"}</td>
      <td><div class="minibar"><span style="width:${p}%;background:${meta.color}"></span></div></td></tr>`;
  });
  const tSmu=sum(data,r=>r.smu);
  $("#drillTable tfoot").innerHTML=`<tr>
    <td class="l">รวมทั้งหมด (${data.length} จุด)</td>
    <td>${fmt(total,1)}</td><td>${fmt(tSmu,0)}</td><td></td></tr>`;
}

/* =================== LOCATIONS (รายจุด) =================== */
const SIZE_COLORS = {"1800":"#2563eb","2000":"#0ea5e9","2200":"#10b981","2400":"#f59e0b"};
const SIZE_ORDER  = ["1800","2000","2200","2400"];
// ตัวกรองขนาดเป็นชื่อเต็ม (เช่น "2400 CR (DC)") — ข้อมูลรายจุดเก็บตามความกว้างฐาน
const baseWidth = sz => { const m=String(sz).match(/\d+/); return m?m[0]:String(sz); };

function locFiltered(){
  const target = FILT.size==="ALL" ? null : baseWidth(FILT.size);
  return (window.LOCATION_STOCK||[]).map(r=>{
    const bySize={}; let total=0;
    Object.keys(r.bySize||{}).forEach(k=>{
      if(target && k!==target) return;
      bySize[k]=r.bySize[k]; total+=r.bySize[k];
    });
    return {loc:r.loc, bySize, total};
  }).filter(r=>r.total>0).sort((a,b)=>b.total-a.total);
}

function renderLocations(){
  const rows = locFiltered();
  const grand = sum(rows,r=>r.total);
  const labels = rows.map(r=>r.loc);
  const sizesPresent = SIZE_ORDER.filter(sz=> rows.some(r=>r.bySize[sz]>0));
  const datasets = sizesPresent.map(sz=>({
    label: "ขนาด "+sz, data: rows.map(r=>r.bySize[sz]||0),
    backgroundColor: SIZE_COLORS[sz]||"#64748b", borderRadius:3, maxBarThickness:22
  }));
  drawLocBar("locBar", labels, datasets);

  const tb=$("#locTable tbody"); tb.innerHTML="";
  if(!rows.length){ tb.innerHTML=`<tr><td colspan="4" class="l" style="color:var(--muted)">— ไม่มีข้อมูลตามตัวกรอง —</td></tr>`; }
  rows.forEach(r=>{
    const szs = SIZE_ORDER.filter(s=>r.bySize[s]>0).join(", ");
    const p = pct(r.total, grand);
    tb.innerHTML += `<tr>
      <td class="l"><b>${r.loc}</b></td>
      <td class="l">${szs}</td>
      <td>${fmt(r.total,1)}</td>
      <td><div class="minibar"><span style="width:${p}%"></span></div></td></tr>`;
  });
  $("#locTable tfoot").innerHTML = `<tr>
    <td class="l" colspan="2">รวมทั้งหมด (${rows.length} จุด)</td>
    <td>${fmt(grand,1)}</td><td></td></tr>`;
}

function drawLocBar(id, labels, datasets){
  if(charts[id]) charts[id].destroy();
  charts[id]=new Chart($("#"+id),{
    type:"bar",
    data:{labels, datasets},
    options:{
      indexAxis:"y",
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:"index",intersect:false},
      scales:{
        x:{stacked:true, beginAtZero:true, grid:{color:"#f1f5f9"},
           ticks:{callback:v=>fmt(v)}, title:{display:true,text:"ความยาว (เมตร)"}},
        y:{stacked:true, grid:{display:false}, ticks:{font:{size:11}}}
      },
      plugins:{
        legend:{position:"top",labels:{boxWidth:12,usePointStyle:true,pointStyle:"circle"}},
        datalabels:{display:false},
        tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${fmt(c.raw,1)} ม.`}}
      }
    }
  });
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

/* =================== EVENTS =================== */
$("#drillClose").onclick = ()=>{ activeDrill=null;
  $("#drillPanel").classList.add("hide");
  $("#stockKpis").querySelectorAll(".kpi[data-cat]").forEach(c=>c.classList.remove("active"));
};

$("#refreshBtn").onclick = function(){
  this.disabled = true;
  loadData().finally(()=> setTimeout(()=> this.disabled=false, 600));
};

/* auto refresh */
loadData();
setInterval(loadData, REFRESH);
