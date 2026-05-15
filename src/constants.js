export const DEFAULT_USERS = {
  admin:  { id:'admin',  name:'Admin',   pass:'admin@hyd',  role:'admin',    color:'#a78bfa', ini:'AD', url:null, url2:null, url_outstanding:null },
  pranav: { id:'hyd', name:'Hyd',  pass:'hyd@123', role:'salesman', color:'#818cf8', ini:'PR',
    url:'https://docs.google.com/spreadsheets/d/e/2PACX-1vTWXoueg29sm1JU6nqbX4kFRRqJsUxDp_M6eqOBBQnvVDVSmox4mwQxVSywsmlsDqrAe0279hdKQiAx/pub?gid=76669755&single=true&output=csv',
    url2:null, url_outstanding:null,
  },
  // udai:    { id:'udai',    name:'Udai',           pass:'udai123',    role:'salesman', color:'#34d399', ini:'UD', url:'', url2:null, url_outstanding:null },
  // ratish:  { id:'ratish',  name:'Ratish',         pass:'ratish123',  role:'salesman', color:'#f472b6', ini:'RT', url:'', url2:null, url_outstanding:null },
  // joseph:  { id:'joseph',  name:'Joseph',         pass:'joseph123',  role:'salesman', color:'#fb923c', ini:'JO', url:'', url2:null, url_outstanding:null },
  // senthil: { id:'senthil', name:'Senthil',        pass:'senthil123', role:'salesman', color:'#fbbf24', ini:'SE', url:'', url2:null, url_outstanding:null },
  // sahil:   { id:'sahil',   name:'Sahil',          pass:'sahil123',   role:'salesman', color:'#22d3ee', ini:'SH', url:'', url2:null, url_outstanding:null },
  // rakesh:  { id:'rakesh',  name:'Rakesh Boriwal', pass:'rakesh123',  role:'salesman', color:'#e879f9', ini:'RB', url:'', url2:null, url_outstanding:null },
  // shivraj: { id:'shivraj', name:'Shivraj',        pass:'shivraj123', role:'salesman', color:'#f87171', ini:'SJ', url:'', url2:null, url_outstanding:null },
};

// ── MONTHS (newest first, col order in sheet) ─────────────────────────────
// Your sheet: Aug-26 is newest (current), going back to Jul-25
// Cols in sheet: Aug-26 | Jul-26 | Jun-26 | May-26 | Apr-26 | Mar-26 | Feb-26 | Jan-26 | Dec-25 | Nov-25 | Oct-25 | Sep-25 | Aug-25 | Jul-25
//
// TO ADD NEXT MONTH: add to FRONT of MO, keep CURRENT_MONTH_IDX = 0
// Sep-26: ['Sep-26','Aug-26','Jul-26',...]
export const MO = [
  'Aug-26',  // 0 ← CURRENT (col 3-8 in sheet)
  'Jul-26',  // 1
  'Jun-26',  // 2
  'May-26',  // 3
  'Apr-26',  // 4
  'Mar-26',  // 5
  'Feb-26',  // 6
  'Jan-26',  // 7
  'Dec-25',  // 8
  'Nov-25',  // 9
  'Oct-25',  // 10
  'Sep-25',  // 11
  'Aug-25',  // 12
  'Jul-25',  // 13
];
export const CURRENT_MONTH_IDX   = 0;
export const CURRENT_MONTH_LABEL = 'August 2026';
export const CURRENT_MONTH_SHORT = 'Aug';
