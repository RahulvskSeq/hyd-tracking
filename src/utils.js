import { MO, CURRENT_MONTH_IDX } from './constants';

export const pct   = (t,a) => (!t?(a>0?null:0):Math.round((a/t)*100));
export const spct  = (t,a) => { const p=pct(t,a); return p===null?'N/T':p+'%'; };
export const pclr  = (p)   => (p===null||p===undefined)?'#6b7280':p>=100?'#34d399':p>=60?'#fbbf24':'#f87171';
export const fcash = (v)   => v?'₹'+Number(v).toLocaleString('en-IN'):'—';
export const num   = (v)   => { if(!v&&v!==0)return 0; const x=parseFloat(String(v).replace(/[^0-9.-]/g,'')); return isNaN(x)?0:Math.round(x); };
export const uid   = ()    => Date.now()+'_'+Math.random().toString(36).slice(2);
export const isoNow= ()    => new Date().toISOString();
export const trendPct = (months) => {
  // months[0] = current month (newest), months[1] = last month etc
  const recent=months.slice(0,3).reduce((a,b)=>a+b,0);
  const prior=months.slice(3,6).reduce((a,b)=>a+b,0);
  if(!prior) return recent>0?100:0;
  return Math.round(((recent-prior)/prior)*100);
};
export const forecast = (months) => Math.round(months.slice(0,3).reduce((a,b)=>a+b,0)/3);

export const storage = {
  async get(key,fallback=null){
    try{ if(typeof window!=='undefined'&&window.storage){ const r=await window.storage.get(key); return r?JSON.parse(r.value):fallback; } }catch(e){}
    return fallback;
  },
  async set(key,value){
    try{ if(typeof window!=='undefined'&&window.storage) await window.storage.set(key,JSON.stringify(value)); }catch(e){}
  },
};

function parseRow(line){
  const r=[];let c='',q=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"')q=!q;
    else if(ch===','&&!q){r.push(c);c='';}
    else c+=ch;
  }
  r.push(c);
  return r.map(s=>s.trim().replace(/^"+|"+$/g,''));
}

// ── MAIN CSV PARSER ───────────────────────────────────────────────────────────
// Handles TWO sheet formats:
//
// FORMAT A — One row per dealer (simple):
//   Dealer Name | Status | Zone | City | State | Main Category | Sub Category | Target | Jul-25 | Aug-25 | ... | May-26
//
// FORMAT B — Multiple rows per dealer (one row per category/sub-category):
//   Dealer Name | Status | Zone | City | State | Main Category | Sub Category | Target | Jul-25 | ... | May-26
//   HEDA PLYWOODS | ACTIVE | West | Mumbai | MH | LAMINATE       | 1 MM          | 40     | 22    | ... | 30
//   HEDA PLYWOODS | ACTIVE | West | Mumbai | MH | POLYMENT SHEET | GAG           | 15     | 5     | ... | 7
//   HEDA PLYWOODS | ACTIVE | West | Mumbai | MH | ROLLS          | NATURAL CANE  | 5      | 0     | ... | 1
//   → These get merged into ONE dealer with months summed and categoryBreakdown map built

export function parseCSV(txt, smId){
  const lines = txt.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');

  // ── Find header row ───────────────────────────────────
  let hi = 0;
  for(let i=0;i<Math.min(lines.length,10);i++){
    const l = lines[i].toLowerCase();
    if(l.includes('dealer')||l.includes('name')){hi=i;break;}
  }
  const rawH = parseRow(lines[hi]);
  const hc   = rawH.map(h=>h.toLowerCase().replace(/[^a-z0-9]/g,' ').trim());
  const ci   = (...ks)=>{ for(const k of ks){ const i=hc.findIndex(h=>h.includes(k)); if(i!==-1)return i; } return -1; };

  // ── Column detection ──────────────────────────────────
  // Dealer name — supports "Company Name", "Dealer Name", "Name" etc.
  const CN    = ci('company name','dealer name','dealer','company','name');
  const CT    = ci('target','tgt');
  const CZ    = ci('zone');
  const CS    = ci('status');
  const CA    = ci('6m avg','avg','average');
  const CD    = ci('credit day','credit d');
  const CL    = ci('credit lim','cr limit','limit');
  const CCITY = ci('city');
  const CSTATE= ci('state');
  // Total/Qty column — "Total", "Sum of Qty", "Qty", "Quantity"
  const CQTY  = ci('total','sum of qty','quantity','qty');

  // ── Category column detection ────────────────────────────
  console.log('[CSV] ALL HEADERS:', rawH.map((h,i)=>i+':'+h).join(' | '));

  // CCATTYPE = "type Details" (sub category) — detect FIRST (more specific)
  const CCATTYPE = (()=>{
    for(let i=0;i<rawH.length;i++){
      const r = rawH[i].trim().toLowerCase();
      // Exact: "type Details", "type Detail", "Sub Category", "Cat Type"
      if(r==='type details'||r==='type detail'||r==='sub category'||
         r==='subcat'||r==='sub cat'||r==='category type'||r==='cat type'||
         r==='cattype'||r==='product type') return i;
    }
    // Contains "detail"
    for(let i=0;i<rawH.length;i++){
      if(rawH[i].toLowerCase().includes('detail')) return i;
    }
    // Second col with word "type"
    const tc=[]; rawH.forEach((h,i)=>{ if(h.toLowerCase().includes('type'))tc.push(i); });
    return tc.length>=2 ? tc[1] : -1;
  })();

  // CCAT = "type" (main category)
  const CCAT = (()=>{
    for(let i=0;i<rawH.length;i++){
      const r = rawH[i].trim().toLowerCase();
      if(i===CCATTYPE) continue;
      if(r==='type'||r==='main category'||r==='main cat'||r==='category') return i;
    }
    // Contains "category" (not CCATTYPE)
    for(let i=0;i<rawH.length;i++){
      if(i===CCATTYPE) continue;
      if(rawH[i].toLowerCase().includes('category')) return i;
    }
    // First col with "type" that isn't CCATTYPE
    for(let i=0;i<rawH.length;i++){
      if(i===CCATTYPE) continue;
      if(rawH[i].toLowerCase().includes('type')) return i;
    }
    return -1;
  })();

  console.log('[CSV] CCAT='+CCAT+'("'+(rawH[CCAT]||'none')+'") CCATTYPE='+CCATTYPE+'("'+(rawH[CCATTYPE]||'none')+'")');

  // Per-month achieved columns: detect month names exactly from MO array
  const monthAchCols  = {};  // monthIdx -> colIdx
  const monthTgtCols  = {};  // monthIdx -> colIdx
  MO.forEach((m,idx)=>{
    const mlo = m.toLowerCase(); // e.g. "jul-25"
    const mlo2 = mlo.replace('-',' '); // "jul 25"
    const mlo3 = mlo.slice(0,3); // "jul"
    rawH.forEach((h,i)=>{
      const hl = h.toLowerCase().trim();
      // Exact match preferred: "Jul-25" or "Jul 25"
      const isMonthCol = hl===mlo || hl===mlo2 || 
        (hl.startsWith(mlo3) && (hl.includes('-')||hl.includes(' ')));
      if(!isMonthCol) return;
      if(hl.includes('target')||hl.includes('tgt')) monthTgtCols[idx]=i;
      else monthAchCols[idx]=i;
    });
  });

  // Fallback achieved cols — "achieved", "ach", "total", "qty"
  const achFallback=[];
  hc.forEach((h,i)=>{ if(h.includes('achiev')||h==='ach') achFallback.push(i); });
  // If no explicit "achieved" cols but we have a "Total"/"Qty" col, use that for current month
  const CAch = achFallback[0]!==undefined ? achFallback[0] : (CQTY>=0?CQTY:-1);
  const hist  = [...achFallback.slice(1)].reverse(); // older months, oldest first

  console.log('[CSV] Header:', rawH.slice(0,6).join(' | '));
  console.log('[CSV] monthAchCols:', monthAchCols, 'CAch:', CAch);

  // ── Parse every data row ──────────────────────────────
  // dealer key → merged dealer object
  const dealerMap = {};

  for(let i=hi+1;i<lines.length;i++){
    if(!lines[i].trim()) continue;
    const c = parseRow(lines[i]);
    const nm = (c[CN>=0?CN:0]||'').trim();
    if(!nm||nm.length<2) continue;
    if(/^[\d,. ]+$/.test(nm)) continue;
    const nlc = nm.toLowerCase();
    if(nlc==='name'||nlc==='dealer name'||nlc==='dealer'||nlc.includes('grand total')||nlc.includes('total')) continue;

    // Extract category info for this row
    const cat     = (CCAT>=0    ? c[CCAT]     : '').trim();
    const catType = (CCATTYPE>=0 ? c[CCATTYPE] : '').trim();

    // Build months array for this row
    const rowMonths = new Array(MO.length).fill(0);
    if(Object.keys(monthAchCols).length > 0){
      // Month columns detected — use them
      Object.entries(monthAchCols).forEach(([idx,col])=>{
        rowMonths[Number(idx)] = num(c[col]);
      });
    } else {
      // Fallback: first achFallback col = current month, rest = history
      rowMonths[CURRENT_MONTH_IDX] = CAch>=0 ? num(c[CAch]) : 0;
      for(let m=0;m<10;m++) rowMonths[m] = hist[m]!==undefined ? num(c[hist[m]]) : 0;
    }

    // Target for this row
    const rowTarget = CT>=0 ? num(c[CT]) : 0;
    const rowMTgts  = {};
    Object.entries(monthTgtCols).forEach(([idx,col])=>{ rowMTgts[Number(idx)]=num(c[col]); });

    // Unique key = dealer name (uppercase, trimmed)
    const key = nm.toUpperCase().trim();

    if(!dealerMap[key]){
      // First row for this dealer — create entry
      dealerMap[key] = {
        id          : smId+'_'+i,
        name        : nm,
        salesman    : smId,
        zone        : (CZ>=0     ? c[CZ]     : '').trim(),
        city        : (CCITY>=0  ? c[CCITY]  : '').trim(),
        state       : (CSTATE>=0 ? c[CSTATE] : '').trim(),
        status      : (CS>=0     ? c[CS]     : 'ACTIVE').trim() || 'ACTIVE',
        category    : cat,
        categoryType: catType,
        target      : rowTarget,
        avg6m       : CA>=0 ? num(c[CA]) : 0,
        creditDays  : CD>=0 ? num(c[CD]) : 0,
        creditLimit : CL>=0 ? num(c[CL]) : 0,
        months      : [...rowMonths],
        monthTargets: {...rowMTgts},
        // Full breakdown: { category: { subCategory: [qty x 11 months] } }
        categoryBreakdown: {},
      };
    } else {
      // Subsequent row for SAME dealer — merge (sum months & targets)
      const d = dealerMap[key];
      for(let m=0;m<11;m++) d.months[m] += rowMonths[m];
      d.target += rowTarget;
      Object.entries(rowMTgts).forEach(([idx,v])=>{
        d.monthTargets[Number(idx)] = (d.monthTargets[Number(idx)]||0) + v;
      });
      // Keep first non-empty metadata
      if(!d.zone  && c[CZ>=0?CZ:0])   d.zone   = c[CZ].trim();
      if(!d.city  && CCITY>=0)         d.city   = c[CCITY].trim();
      if(!d.state && CSTATE>=0)        d.state  = c[CSTATE].trim();
    }

    // ── Build category breakdown for drill-down chart ──
    if(cat || catType){
      const d   = dealerMap[key];
      const cKey = cat  || '(No Category)';
      const sKey = catType || '(No Sub)';
      if(!d.categoryBreakdown[cKey]) d.categoryBreakdown[cKey] = {};
      if(!d.categoryBreakdown[cKey][sKey]) d.categoryBreakdown[cKey][sKey] = new Array(MO.length).fill(0);
      for(let m=0;m<11;m++) d.categoryBreakdown[cKey][sKey][m] += rowMonths[m];

      // Update top-level category/categoryType to whichever has most qty this month
      const d2 = dealerMap[key];
      let maxCatQty = -1;
      Object.entries(d2.categoryBreakdown).forEach(([ck,subs])=>{
        const total = Object.values(subs).reduce((s,arr)=>s+(arr[CURRENT_MONTH_IDX]||0),0);
        if(total>maxCatQty){ maxCatQty=total; d2.category=ck==='(No Category)'?'':ck; }
      });
      // Top sub within top category
      const topSubs = d2.categoryBreakdown[d2.category||'(No Category)'] || {};
      let maxSubQty = -1;
      Object.entries(topSubs).forEach(([sk,arr])=>{
        const q = arr[CURRENT_MONTH_IDX]||0;
        if(q>maxSubQty){ maxSubQty=q; d2.categoryType=sk==='(No Sub)'?'':sk; }
      });
    }
  }

  // ── Finalise ──────────────────────────────────────────
  const out = Object.values(dealerMap);
  out.forEach(d=>{ d.achieved = d.months[CURRENT_MONTH_IDX]||0; });
  console.log('[CSV] Raw rows parsed. Dealers after merge:', out.length);
  return out;
}

export async function fetchCSV(url){
  const proxies=[url,`https://corsproxy.io/?${encodeURIComponent(url)}`,`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`];
  for(const u of proxies){
    try{
      const r=await fetch(u,{signal:AbortSignal.timeout(14000)});
      if(!r.ok)continue;
      const t=await r.text();
      if(!t||t.length<20||t.trim().startsWith('<'))continue;
      return t;
    }catch(e){continue;}
  }
  throw new Error('Could not fetch');
}

// ── DATE-BASED CSV PARSER ─────────────────────────────────────────────────────
export function parseDateBasedCSV(txt, smId) {
  const lines = txt.split('\n');
  let hi = 0;
  for(let i=0;i<Math.min(lines.length,10);i++){
    const l = lines[i].toLowerCase();
    if(l.includes('date')||l.includes('dealer')){hi=i;break;}
  }
  const rawH = parseRow(lines[hi]);
  const hc = rawH.map(h=>h.toLowerCase().replace(/[^a-z0-9]/g,' ').trim());
  const ci = (...ks)=>{ for(const k of ks){ const idx=hc.findIndex(h=>h.includes(k)); if(idx!==-1)return idx; } return -1; };
  const CDATE=ci('date','month','period'), CN=ci('dealer','company','name');
  const CCAT=ci('main category','main cat','category'), CCTYPE=ci('sub category','sub cat','type details','type');
  const CQTY=ci('qty','quantity','total','units','sum'), CS=ci('status'), CZ=ci('zone');
  const CCITY=ci('city'), CSTATE=ci('state'), CT=ci('target','tgt');
  const parseDateToMonthIdx = (dateStr) => {
    if(!dateStr) return null;
    const d = dateStr.trim().toLowerCase();
    for(let mi=0;mi<MO.length;mi++){
      const m=MO[mi].toLowerCase();
      if(d.includes(m)||d.includes(m.slice(0,3))) return mi;
    }
    try { const p=new Date(dateStr); if(!isNaN(p)){ const diff=(p.getFullYear()-2025)*12+p.getMonth()-6; if(diff>=0&&diff<MO.length)return diff; } }catch(e){}
    return null;
  };
  const dealerMap={};
  for(let i=hi+1;i<lines.length;i++){
    if(!lines[i].trim())continue;
    const c=parseRow(lines[i]);
    const nm=(c[CN>=0?CN:1]||'').trim();
    if(!nm||nm.length<2)continue;
    if(/^[\d,. ]+$/.test(nm))continue;
    if(nm.toLowerCase().includes('total')||nm.toLowerCase()==='name')continue;
    const mIdx=parseDateToMonthIdx(CDATE>=0?c[CDATE]:'');
    if(mIdx===null)continue;
    const qty=num(CQTY>=0?c[CQTY]:'0');
    if(qty===0)continue;
    const cat=(CCAT>=0?c[CCAT]:'').trim(), catType=(CCTYPE>=0?c[CCTYPE]:'').trim();
    const key=nm.toUpperCase().trim();
    if(!dealerMap[key]){ dealerMap[key]={id:smId+'_'+nm.replace(/\W/g,'_'),name:nm,salesman:smId,zone:(CZ>=0?c[CZ]:'').trim(),city:(CCITY>=0?c[CCITY]:'').trim(),state:(CSTATE>=0?c[CSTATE]:'').trim(),status:(CS>=0?c[CS]:'ACTIVE').trim()||'ACTIVE',category:cat,categoryType:catType,target:CT>=0?num(c[CT]):0,avg6m:0,creditDays:0,creditLimit:0,months:new Array(MO.length).fill(0),monthTargets:{},categoryBreakdown:{}}; }
    const d=dealerMap[key];
    d.months[mIdx]+=qty;
    if(!d.zone&&CZ>=0)d.zone=c[CZ].trim();
    if(!d.city&&CCITY>=0)d.city=c[CCITY].trim();
    if(!d.state&&CSTATE>=0)d.state=c[CSTATE].trim();
    if(CT>=0&&num(c[CT])>0)d.target=Math.max(d.target,num(c[CT]));
    if(cat||catType){const ck=cat||'(No Category)',sk=catType||'(No Sub)';if(!d.categoryBreakdown[ck])d.categoryBreakdown[ck]={};if(!d.categoryBreakdown[ck][sk])d.categoryBreakdown[ck][sk]=new Array(MO.length).fill(0);d.categoryBreakdown[ck][sk][mIdx]+=qty;}
  }
  const out=Object.values(dealerMap);
  out.forEach(d=>{d.achieved=d.months[CURRENT_MONTH_IDX]||0;});
  return out;
}

// ── OUTSTANDING SHEET PARSER ──────────────────────────────────────────────────
// Sheet format: Dealer | FEB | MAR | APR | MAY ...
// Values are outstanding amounts (cumulative credit/payment due)
// Month columns are named by month abbreviation (FEB, MAR, APR, MAY, JUN...)

const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function parseOutstandingCSV(txt, smId) {
  const lines = txt.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');

  // Find header row
  let hi = 0;
  for(let i=0;i<Math.min(lines.length,10);i++){
    const l = lines[i].toLowerCase();
    if(l.includes('dealer')||l.includes('name')||l.includes('party')){hi=i;break;}
  }

  const rawH = parseRow(lines[hi]);
  const hc   = rawH.map(h=>h.toLowerCase().replace(/[^a-z0-9]/g,' ').trim());

  // Dealer name column
  const CN = hc.findIndex(h=>h.includes('dealer')||h.includes('name')||h.includes('party')||h==='');

  // Detect month columns — look for month abbreviations in headers
  const monthCols = []; // [{colIdx, monthName, year}]
  rawH.forEach((h, i) => {
    if(i === CN) return;
    const hu = h.toUpperCase().trim();
    // Match patterns: FEB, FEB-25, FEB 25, FEB-2025, FEBRUARY
    const abbr = MONTH_ABBR.find(m => hu.startsWith(m) || hu.includes(m));
    if(abbr) monthCols.push({ colIdx: i, monthName: h.trim(), abbr });
  });

  console.log('[Outstanding] Headers:', rawH);
  console.log('[Outstanding] Month cols:', monthCols.map(m=>m.monthName));

  const out = [];
  for(let i=hi+1;i<lines.length;i++){
    if(!lines[i].trim()) continue;
    const c = parseRow(lines[i]);
    const nm = (c[CN>=0?CN:0]||'').trim();
    if(!nm||nm.length<2) continue;
    if(/^[\d,. ]+$/.test(nm)) continue;
    if(nm.toLowerCase().includes('total')||nm.toLowerCase()==='dealer') continue;

    // Build monthly outstanding object
    const monthlyOutstanding = {};
    monthCols.forEach(({colIdx, monthName, abbr}) => {
      const val = num(c[colIdx]);
      monthlyOutstanding[monthName] = val;
    });

    // Latest outstanding = last month column with value
    const vals = monthCols.map(m => num(c[m.colIdx]));
    const latestOutstanding = vals[vals.length-1] || 0;
    const maxOutstanding    = Math.max(...vals, 0);

    out.push({
      id: smId+'_out_'+i,
      name: nm,
      salesman: smId,
      latestOutstanding,
      maxOutstanding,
      monthlyOutstanding,
      monthCols: monthCols.map(m=>m.monthName),
      // For trend: is outstanding increasing or decreasing?
      trend: vals.length >= 2 ? vals[vals.length-1] - vals[vals.length-2] : 0,
      status: latestOutstanding === 0 ? 'CLEARED' : latestOutstanding > 0 ? 'OUTSTANDING' : 'CREDIT',
    });
  }

  return out.sort((a,b) => b.latestOutstanding - a.latestOutstanding);
}

// ── PRANAV-FORMAT PARSER ─────────────────────────────────────────────────────
// EXACT column positions (from your sheet):
// Row 0: Group headers (August 2026, July 2026 ...)
// Row 1: Detail headers (Dealers Name, Target, Achieved, Ach%, Zone, Status...)
// Row 2: TOTALS row - skip
// Row 3: blank - skip
// Row 4+: dealer data
//
// Col 0=Name, 1=City, 2=State
// Aug-26: tgt=3,  ach=4,  zone=6,  status=7
// Jul-26: tgt=9,  ach=10, zone=12, status=13
// Jun-26: tgt=15, ach=16, zone=18, status=19
// May-26: tgt=21, ach=22, zone=24, status=25
// Apr-26: tgt=27, ach=28, zone=30, status=31
// Mar-26: tgt=33, ach=34, zone=36, status=37
// Feb-26: tgt=39, ach=40, zone=42, status=43
// Jan-26: tgt=45, ach=46, zone=48, status=49
// Dec-24: ach=51, Nov-24: ach=52, Oct-24: ach=53
// Sep-24: ach=54, Aug-24: ach=55, Jul-24: ach=56
// 6m Avg=57, Credit Days=59, Credit Limit=60
// Category Type=61, Sub Category=62

const PRANAV_COLS = [
  {moIdx:0,  tgt:3,  ach:4,  zone:6,  status:7},   // Aug-26
  {moIdx:1,  tgt:9,  ach:10, zone:12, status:13},   // Jul-26
  {moIdx:2,  tgt:15, ach:16, zone:18, status:19},   // Jun-26
  {moIdx:3,  tgt:21, ach:22, zone:24, status:25},   // May-26
  {moIdx:4,  tgt:27, ach:28, zone:30, status:31},   // Apr-26
  {moIdx:5,  tgt:33, ach:34, zone:36, status:37},   // Mar-26
  {moIdx:6,  tgt:39, ach:40, zone:42, status:43},   // Feb-26
  {moIdx:7,  tgt:45, ach:46, zone:48, status:49},   // Jan-26
  {moIdx:8,  tgt:-1, ach:51, zone:-1, status:-1},   // Dec-24
  {moIdx:9,  tgt:-1, ach:52, zone:-1, status:-1},   // Nov-24
  {moIdx:10, tgt:-1, ach:53, zone:-1, status:-1},   // Oct-24
  {moIdx:11, tgt:-1, ach:54, zone:-1, status:-1},   // Sep-24
  {moIdx:12, tgt:-1, ach:55, zone:-1, status:-1},   // Aug-24
  {moIdx:13, tgt:-1, ach:56, zone:-1, status:-1},   // Jul-24
];

export function parsePranavCSV(txt, smId) {
  const lines = txt.split('\n').map(l => l.replace(/\r$/, ''));

  // Find the data header row (has "Dealers Name" in col 0 AND "Target" in col 3)
  // Your sheet: row 0 = group headers, row 1 = detail headers, row 2 = TOTALS, row 3 = blank
  let dataStart = 0;
  for(let i=0; i<Math.min(lines.length,8); i++){
    const cols = parseRow(lines[i]);
    const r0 = (cols[0]||'').toLowerCase().trim();
    const r3 = (cols[3]||'').toLowerCase().trim();
    if(r0.includes('dealers') && (r3.includes('target')||r3.includes('august')||r3.includes('aug'))){
      dataStart = i+1; // data starts after this row
      // Skip TOTALS and blank rows
      while(dataStart < lines.length){
        const fc = (parseRow(lines[dataStart])[0]||'').trim().toLowerCase();
        if(fc==='totals'||fc===''||fc==='dealers name') dataStart++;
        else break;
      }
      break;
    }
  }

  // If two header rows (row0=group, row1=detail), dataStart needs +1 more
  // Check if row at dataStart-1 has "Target" in col 3
  // Check if row at dataStart-2 has "August" in col 3
  // That means we found row1, dataStart already skips row1
  // But we need to also skip the TOTALS row

  console.log('[PranavCSV] Data starts at row', dataStart, '- first dealer:', (parseRow(lines[dataStart]||'')[0]||'').trim());

  const out = [];
  for(let i=dataStart; i<lines.length; i++){
    if(!lines[i].trim()) continue;
    const c = parseRow(lines[i]);
    if(c.length < 5) continue;

    const nm = (c[0]||'').trim();
    if(!nm || nm.length < 2) continue;
    if(/^[\d,. %#]+$/.test(nm)) continue;
    const nlc = nm.toLowerCase();
    if(nlc==='dealers name'||nlc==='dealer'||nlc==='totals'||nlc==='name') continue;

    const months = new Array(MO.length).fill(0);
    const monthTargets = {};

    PRANAV_COLS.forEach(({moIdx, tgt, ach}) => {
      if(moIdx >= MO.length) return;
      if(ach >= 0 && ach < c.length) months[moIdx] = num(c[ach]);
      if(tgt >= 0 && tgt < c.length && num(c[tgt]) > 0) monthTargets[moIdx] = num(c[tgt]);
    });

    // Status/Zone from current month (Aug-26 = block 0)
    const status = (c[7]||'ACTIVE').trim()||'ACTIVE';
    const zone   = (c[6]||'').trim();
    const avg6m  = num(c[57]||0);
    const creditDays  = num(c[59]||0);
    const creditLimit = num(c[60]||0);
    const category    = (c[61]||'').trim();
    const categoryType= (c[62]||'').trim();
    const target      = monthTargets[0] || num(c[3]||0);

    const categoryBreakdown = {};
    if(category || categoryType){
      const ck = category||'(No Cat)', sk = categoryType||'(No Sub)';
      categoryBreakdown[ck] = {};
      categoryBreakdown[ck][sk] = [...months];
    }

    out.push({
      id: smId+'_'+i, name: nm, salesman: smId,
      city:  (c[1]||'').trim(),
      state: (c[2]||'').trim(),
      zone, status, category, categoryType,
      target, avg6m, creditDays, creditLimit,
      months, monthTargets,
      achieved: months[0]||0,
      categoryBreakdown,
    });
  }

  console.log('[PranavCSV] Parsed', out.length, 'dealers');
  if(out.length > 0){
    const s = out[0];
    console.log('[PranavCSV] Sample:', s.name,
      '| cat='+s.category+'/'+s.categoryType,
      '| Aug-26 tgt='+s.monthTargets[0],'ach='+s.months[0],
      '| Apr-26 tgt='+s.monthTargets[4],'ach='+s.months[4]);
  }
  return out;
}
