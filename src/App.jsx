import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LayoutDashboard, Users, TrendingUp, Settings, LogOut, Bell, GitCompare, Menu, RefreshCw, Map, AlertTriangle } from 'lucide-react';
import { DEFAULT_USERS, MO, CURRENT_MONTH_IDX } from './constants';
import { pct, spct, pclr, uid, isoNow, storage, parseCSV, parseDateBasedCSV, parsePranavCSV, fetchCSV } from './utils';
import { MonthContext } from './context';
import Styles            from './components/Styles';
import { MonthSelectorBar, Avatar, SkeletonLoader } from './components/UI';
import LoginPage         from './components/LoginPage';
import Overview          from './components/Overview';
import DealersList       from './components/DealersList';
import DealerModal       from './components/DealerModal';
import MonthlyTrend      from './components/MonthlyTrend';
import Compare           from './components/Compare';
import FollowupsHub      from './components/FollowupsHub';
import AdminPanel        from './components/AdminPanel';
import UserManagement    from './components/UserManagement';
import AddDealerModal    from './components/AddDealerModal';
import BulkActionModal   from './components/BulkActionModal';
import IndiaMap          from './components/IndiaMap';
import Outstanding      from './components/Outstanding';

// ── Cookie helpers ────────────────────────────────────────
const COOKIE_KEY = 'stp_session';
const setCookie = (val, days=30) => {
  const exp = new Date(Date.now() + days*864e5).toUTCString();
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(JSON.stringify(val))};expires=${exp};path=/;SameSite=Lax`;
};
const getCookie = () => {
  try {
    const match = document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith(COOKIE_KEY+'='));
    return match ? JSON.parse(decodeURIComponent(match.split('=').slice(1).join('='))) : null;
  } catch { return null; }
};
const clearCookie = () => { document.cookie = `${COOKIE_KEY}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`; };

// ── Slug routing helpers ──────────────────────────────────
const VALID_SCREENS = ['overview','dealers','monthly','compare','map','outstanding','followups','admin'];
const getScreenFromUrl = () => {
  const hash = window.location.hash.replace('#/','').split('?')[0];
  return VALID_SCREENS.includes(hash) ? hash : 'overview';
};
const pushScreen = (screen, filterPatch=null) => {
  let url = `#/${screen}`;
  if(filterPatch) {
    const params = new URLSearchParams(filterPatch).toString();
    url += `?${params}`;
  }
  window.history.pushState({screen, filterPatch}, '', url);
};

export default function App(){
  const [theme,setTheme]=useState('dark');
  const [users,setUsers]=useState(DEFAULT_USERS);
  const [currentUser,setCurrentUser]=useState(null);
  const [dealers,setDealers]=useState([]);
  const [bootedFromSheets,setBootedFromSheets]=useState(false);
  const [notes,setNotes]=useState([]);
  const [activityLog,setActivityLog]=useState([]);
  const [screen,setScreen]=useState(getScreenFromUrl());
  const [editingId,setEditingId]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [showUM,setShowUM]=useState(false);
  const [selected,setSelected]=useState([]);
  const [bulkAction,setBulkAction]=useState(null);
  const [sidebarOpen,setSidebarOpen]=useState(typeof window!=='undefined'&&window.innerWidth>768);
  const [syncing,setSyncing]=useState(false);
  const [lastSync,setLastSync]=useState(null);
  const [syncErrs,setSyncErrs]=useState([]);
  const [outstandingData,setOutstandingData]=useState([]);
  const [selectedMonthIdx,setSelectedMonthIdx]=useState(CURRENT_MONTH_IDX);
  const [pendingFilters,setPendingFilters]=useState(null);

  // ── Boot: load storage + restore cookie session ──────────
  useEffect(()=>{
    (async()=>{
      const [u,d,n,l,t]=await Promise.all([
        storage.get('users'),storage.get('dealers'),
        storage.get('notes',[]),storage.get('activityLog',[]),storage.get('theme','dark')
      ]);
      if(u)setUsers(u); if(d)setDealers(d); if(n)setNotes(n); if(l)setActivityLog(l); if(t)setTheme(t);

      // Restore session from cookie
      const session = getCookie();
      if(session?.userId){
        const allUsers = u || DEFAULT_USERS;
        const user = allUsers[session.userId];
        if(user && user.pass === session.passHash) setCurrentUser(user);
      }
    })();
  },[]);

  // ── Persist ───────────────────────────────────────────────
  useEffect(()=>{storage.set('users',users);},[users]);
  useEffect(()=>{storage.set('dealers',dealers);},[dealers]);
  useEffect(()=>{storage.set('notes',notes);},[notes]);
  useEffect(()=>{storage.set('activityLog',activityLog);},[activityLog]);
  useEffect(()=>{storage.set('theme',theme);document.documentElement.setAttribute('data-theme',theme);},[theme]);
  useEffect(()=>{
    const onResize=()=>{if(window.innerWidth>768)setSidebarOpen(true);};
    window.addEventListener('resize',onResize);
    return()=>window.removeEventListener('resize',onResize);
  },[]);

  // ── Browser back/forward ──────────────────────────────────
  useEffect(()=>{
    const onPop = (e) => {
      const s = e.state?.screen || getScreenFromUrl();
      if(VALID_SCREENS.includes(s)) setScreen(s);
      if(e.state?.filterPatch) setPendingFilters({...e.state.filterPatch, _ts: Date.now()});
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  },[]);

  // ── Auth ──────────────────────────────────────────────────
  const handleLogin = useCallback((user) => {
    setCurrentUser(user);
    setCookie({ userId: user.id, passHash: user.pass });
    // push current screen to history
    pushScreen(screen);
  },[screen]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    clearCookie();
    setScreen('overview');
    window.history.replaceState({screen:'overview'}, '', '#/overview');
  },[]);

  const toggleTheme=()=>setTheme(t=>t==='dark'?'light':'dark');

  const navigate=useCallback((target, filterPatch=null)=>{
    setScreen(target);
    pushScreen(target, filterPatch);
    if(filterPatch) setPendingFilters({...filterPatch, _ts: Date.now()});
    if(window.innerWidth<=768) setSidebarOpen(false);
  },[]);

  const addLog=useCallback((action,detail)=>{
    setActivityLog(l=>[{id:uid(),action,detail,by:currentUser?.id,at:isoNow()},...l].slice(0,200));
  },[currentUser]);

  const myDealers=useMemo(()=>{
    if(!currentUser)return[];
    return currentUser.role==='admin'?dealers:dealers.filter(d=>d.salesman===currentUser.id);
  },[dealers,currentUser]);

  const myNotes=useMemo(()=>{
    if(!currentUser)return[];
    if(currentUser.role==='admin')return notes;
    const myIds=new Set(myDealers.map(d=>d.id));
    return notes.filter(n=>myIds.has(n.dealerId));
  },[notes,myDealers,currentUser]);

  const syncSheets=useCallback(async()=>{
    setSyncing(true); const errs=[],live=[];
    for(const s of Object.values(users).filter(u=>u.role==='salesman')){
      // Fetch Sheet 1 (url)
      if(s.url){
        try{
          const csv=await fetchCSV(s.url);
          // Auto-detect format: "Dealers Name" header = Pranav multi-month format
          const firstLines = csv.split('\n').slice(0,5).join(' ').toLowerCase();
          const isPranavFormat = firstLines.includes('dealers name') || firstLines.includes('achived till') || firstLines.includes('august target');
          const rows = isPranavFormat ? parsePranavCSV(csv,s.id) : parseCSV(csv,s.id);
          if(!rows.length) throw new Error('0 rows');
          live.push(...rows);
        } catch(e){ errs.push(s.name+' Sheet1: '+e.message); }
      }
      // Fetch Sheet 2 (url2) — date-based format, merge with Sheet 1
      if(s.url2){
        try{
          const csv2=await fetchCSV(s.url2);
          // Auto-detect: if sheet has 'date' column use date parser, else normal
          const hasDate=csv2.split('\n').slice(0,3).some(l=>l.toLowerCase().includes('date'));
          const rows2=hasDate?parseDateBasedCSV(csv2,s.id):parseCSV(csv2,s.id);
          if(!rows2.length) throw new Error('0 rows');
          // Merge: if dealer name already exists from Sheet1, update category breakdown
          // If new dealer, add them
          rows2.forEach(r2=>{
            const existing=live.find(d=>d.salesman===s.id&&d.name.toUpperCase().trim()===r2.name.toUpperCase().trim());
            if(existing){
              // Merge category breakdown from sheet2 into existing dealer
              if(r2.categoryBreakdown){
                if(!existing.categoryBreakdown) existing.categoryBreakdown={};
                Object.entries(r2.categoryBreakdown).forEach(([cat,subs])=>{
                  if(!existing.categoryBreakdown[cat]) existing.categoryBreakdown[cat]={};
                  Object.entries(subs).forEach(([sub,months])=>{
                    if(!existing.categoryBreakdown[cat][sub]) existing.categoryBreakdown[cat][sub]=new Array(11).fill(0);
                    for(let m=0;m<11;m++) existing.categoryBreakdown[cat][sub][m]+=months[m]||0;
                  });
                });
              }
              // Update category/categoryType if sheet2 has more info
              if(r2.category&&!existing.category) existing.category=r2.category;
              if(r2.categoryType&&!existing.categoryType) existing.categoryType=r2.categoryType;
            } else {
              // New dealer only in sheet2 — add them
              live.push(r2);
            }
          });
        } catch(e){ errs.push(s.name+' Sheet2: '+e.message); }
      }
    }
    // Merge: keep manually-added entries (_new_), merge with sheet data
    setDealers(prev => {
      if(!live.length) return prev; // sync failed — keep existing
      const manualEntries = prev.filter(d => String(d.id).includes('_new_'));
      const merged = [...live];
      manualEntries.forEach(manual => {
        const match = merged.find(d =>
          d.salesman === manual.salesman &&
          d.name.toUpperCase().trim() === manual.name.toUpperCase().trim()
        );
        if(match){
          for(let m=0;m<11;m++) match.months[m] = (match.months[m]||0) + (manual.months[m]||0);
          match.achieved = match.months[CURRENT_MONTH_IDX]||0;
          if(manual.category&&!match.category) match.category = manual.category;
          if(manual.categoryType&&!match.categoryType) match.categoryType = manual.categoryType;
        } else {
          merged.push(manual);
        }
      });
      return merged;
    });
    setLastSync(new Date().toLocaleTimeString('en-IN'));
    setSyncErrs(errs);setSyncing(false);setBootedFromSheets(true);
    if(currentUser)addLog('sync',`Synced · ${live.length} dealers · ${errs.length} errors`);
  },[users,currentUser,addLog]);

  useEffect(()=>{ if(currentUser&&!lastSync)syncSheets(); },[currentUser,syncSheets,lastSync]);

  const saveDealer  = d=>setDealers(ds=>ds.map(x=>x.id===d.id?d:x));
  const updateDealerFields = (id,patch)=>setDealers(ds=>ds.map(x=>x.id===id?{...x,...patch}:x));
  const deleteDealer= id=>{ if(!confirm('Delete this dealer?'))return; const d=dealers.find(x=>x.id===id); setDealers(ds=>ds.filter(x=>x.id!==id)); setNotes(ns=>ns.filter(n=>n.dealerId!==id)); addLog('delete',`Deleted: ${d?.name}`); };
  const addDealer   = d=>{ setDealers(ds=>[...ds,d]); addLog('add',`Added: ${d.name}`); };
  const addNote     = n=>setNotes(ns=>[...ns,n]);
  const updateNote  = (id,patch)=>setNotes(ns=>ns.map(n=>n.id===id?{...n,...patch}:n));
  const deleteNote  = id=>setNotes(ns=>ns.filter(n=>n.id!==id));

  const applyBulk=action=>{
    if(action.type==='delete'){setDealers(ds=>ds.filter(d=>!selected.includes(d.id)));setNotes(ns=>ns.filter(n=>!selected.includes(n.dealerId)));addLog('bulk',`Deleted ${selected.length}`);}
    else if(action.type==='status'){setDealers(ds=>ds.map(d=>selected.includes(d.id)?{...d,status:action.value}:d));addLog('bulk',`Status → ${action.value} for ${selected.length}`);}
    else if(action.type==='salesman'){setDealers(ds=>ds.map(d=>selected.includes(d.id)?{...d,salesman:action.value}:d));addLog('bulk',`Reassigned ${selected.length}`);}
    setSelected([]);setBulkAction(null);
  };

  // ── Derived values (MUST be before any early return) ────────
  const ttSnap=myDealers.reduce((s,x)=>s+(x.monthTargets?.[selectedMonthIdx]??x.target),0);
  const taSnap=myDealers.reduce((s,x)=>s+(x.months[selectedMonthIdx]||0),0);
  const sbP=pct(ttSnap,taSnap);
  const overdueCount=myNotes.filter(n=>n.type==='followup'&&!n.completed&&new Date(n.dueDate)<new Date()).length;
  const editing=editingId?dealers.find(x=>x.id===editingId):null;

  if(!currentUser){
    return(<><Styles theme={theme}/><LoginPage users={users} onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme}/></>);
  }

  // All status counts for territory bar (plain derivation, no hook)
  const allStatuses = (() => { const map={}; myDealers.forEach(d=>{ const s=(d.status||'OTHER').trim()||'OTHER'; map[s]=(map[s]||0)+1; }); return map; })();
  const activeCount = (allStatuses['ACTIVE']||0)+(allStatuses['ACHIVERS']||0)+(allStatuses['ACHIEVERS']||0)+(allStatuses['KEY ACCOUNT']||0);
  const inactiveCount = (allStatuses['INACTIVE']||0)+(allStatuses['RECENTLY INACTIVE']||0);
  const deadCount = allStatuses['DEAD']||0;

  const navItems=[
    {id:'overview',label:'Overview',icon:LayoutDashboard},
    {id:'dealers',label:'All Dealers',icon:Users},
    {id:'monthly',label:'Monthly Trend',icon:TrendingUp},
    {id:'compare',label:'Compare',icon:GitCompare},
    {id:'map',label:'India Map',icon:Map},
    {id:'outstanding',label:'Outstanding',icon:AlertTriangle},
    {id:'followups',label:'Follow-ups',icon:Bell,badge:overdueCount},
    ...(currentUser.role==='admin'?[{id:'admin',label:'Admin Panel',icon:Settings}]:[]),
  ];

  return(
    <MonthContext.Provider value={{selectedMonthIdx,setSelectedMonthIdx}}>
      <>
        <Styles theme={theme}/>
        <div id="app" style={{display:'flex',flexDirection:'column',height:'100vh'}}>

          {/* ── Topbar ── */}
          <div id="topbar">
            {/* ── Hamburger ── always visible */}
            <button onClick={()=>setSidebarOpen(s=>!s)} className="btn"
              style={{padding:'6px 8px',border:'none',background:'none',color:'var(--t3)',flexShrink:0}}>
              <Menu size={18}/>
            </button>

            {/* ── Brand — hide on very small ── */}
            <div className="topbar-brand" style={{fontFamily:'"JetBrains Mono",monospace',fontSize:11,color:'var(--acc)',letterSpacing:3,fontWeight:500,flexShrink:0,whiteSpace:'nowrap'}}>
              ▸ STP
            </div>

            {/* ── Territory bar — hidden on mobile via CSS ── */}
            <div className="territory-bar" style={{display:'flex',alignItems:'center',gap:10,padding:'4px 12px',background:'var(--bg2)',borderRadius:8,border:'1px solid var(--b2)',fontSize:11,flexShrink:0}}>
              <span style={{color:'var(--t3)',fontSize:10,textTransform:'uppercase',letterSpacing:'.08em'}}>{MO[selectedMonthIdx].slice(0,3)}</span>
              <span style={{color:'#34d399',fontWeight:700}}>{taSnap}<span style={{color:'var(--t3)',fontWeight:400,marginLeft:2}}>/{ttSnap}</span></span>
              <span style={{color:pclr(sbP),fontWeight:700}}>{spct(ttSnap,taSnap)}</span>
              <span style={{width:1,height:12,background:'var(--b2)',flexShrink:0}}/>
              <span style={{color:'#34d399',fontSize:11}} title="Active">●{activeCount}</span>
              <span style={{color:'#fbbf24',fontSize:11}} title="Inactive">◑{inactiveCount}</span>
              <span style={{color:'#f87171',fontSize:11}} title="Dead">○{deadCount}</span>
            </div>

            <div className="spacer"/>

            {/* ── Sync status dot — always visible ── */}
            {lastSync&&(
              <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                <span style={{width:7,height:7,borderRadius:'50%',background:syncErrs.length?'var(--red)':'var(--grn)',flexShrink:0}}/>
                <span className="hide-sm" style={{fontSize:10,color:'var(--t3)',whiteSpace:'nowrap'}}>{lastSync}</span>
              </div>
            )}

            {/* ── Sync button — icon only on mobile ── */}
            <button onClick={syncSheets} disabled={syncing} className="btn"
              style={{fontSize:11,display:'flex',alignItems:'center',gap:4,padding:'6px 8px',flexShrink:0}}>
              <RefreshCw size={13} className={syncing?'spin':''}/>
              <span className="hide-sm">{syncing?'Syncing':'Sync'}</span>
            </button>

            {/* ── Divider ── */}
            <div className="hide-sm" style={{width:1,height:18,background:'var(--b1)',flexShrink:0}}/>

            {/* ── Theme toggle ── */}
            <div className="theme-toggle" onClick={toggleTheme} title="Toggle theme" style={{flexShrink:0}}/>

            {/* ── Divider ── */}
            <div className="hide-sm" style={{width:1,height:18,background:'var(--b1)',flexShrink:0}}/>

            {/* ── Avatar + name ── */}
            <Avatar user={currentUser} size={26}/>
            <div className="hide-sm" style={{display:'flex',flexDirection:'column'}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--t1)',lineHeight:1.1,whiteSpace:'nowrap'}}>{currentUser.name}</div>
              <div style={{fontSize:10,color:'var(--t3)'}}>{currentUser.role==='admin'?'Admin':'Sales'}</div>
            </div>

            {/* ── Sign out — always visible, icon + text on desktop ── */}
            <button onClick={handleLogout} className="btn"
              style={{padding:'6px 8px',fontSize:11,color:'var(--t3)',display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
              <LogOut size={13}/>
              <span className="hide-sm">Sign out</span>
            </button>
          </div>

          <MonthSelectorBar selectedMonthIdx={selectedMonthIdx} setSelectedMonthIdx={setSelectedMonthIdx}/>

          <div id="body">
            {sidebarOpen&&window.innerWidth<=768&&<div id="sb-overlay" className="open" onClick={()=>setSidebarOpen(false)}/>}
            <div id="sidebar" className={sidebarOpen?'open':'closed'}>
              <div className="nav-sec">Navigation</div>
              {navItems.map(n=>{const Icon=n.icon;return(
                <div key={n.id} className={`nav-item ${screen===n.id?'active':''}`} onClick={()=>navigate(n.id)}>
                  <Icon size={14}/><span style={{flex:1}}>{n.label}</span>
                  {n.badge>0&&<span style={{background:'var(--red)',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:10,fontWeight:700}}>{n.badge}</span>}
                </div>
              );})}
              <div style={{flex:1}}/>
              {/* Sidebar snapshot */}
              <div style={{padding:'14px 16px',borderTop:'1px solid var(--b1)'}}>
                <div style={{fontSize:9,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:4}}>{MO[selectedMonthIdx]} Snapshot</div>
                {selectedMonthIdx!==CURRENT_MONTH_IDX&&<div style={{fontSize:9,color:'#fbbf24',marginBottom:4}}>HISTORICAL</div>}
                <div style={{fontSize:22,fontWeight:700,color:pclr(sbP)}}>{taSnap} units</div>
                <div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>{taSnap} / {ttSnap} · {spct(ttSnap,taSnap)}</div>
                <div className="prog-bar"><div className="prog-fill" style={{width:`${Math.min(sbP||0,100)}%`,background:pclr(sbP)}}/></div>
                <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:3}}>
                  {Object.entries(allStatuses).sort((a,b)=>b[1]-a[1]).map(([s,c])=>{
                    const statusColors={'ACTIVE':'#34d399','ACHIVERS':'#34d399','ACHIEVERS':'#34d399','KEY ACCOUNT':'#a78bfa','INACTIVE':'#fbbf24','RECENTLY INACTIVE':'#fb923c','DEAD':'#f87171'};
                    const cl=statusColors[s.toUpperCase()]||'#55546a';
                    return(<div key={s} style={{display:'flex',justifyContent:'space-between',fontSize:10}}>
                      <span style={{color:cl,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:110}}>{s}</span>
                      <span style={{color:'var(--t2)',fontWeight:600}}>{c}</span>
                    </div>);
                  })}
                </div>
              </div>
            </div>

            <div id="main">
              {(syncing&&!bootedFromSheets)?<SkeletonLoader/>:(
                <>
                  {screen==='overview'  &&<Overview dealers={myDealers} currentUser={currentUser} users={users} notes={myNotes} onOpenDealer={setEditingId} onNavigate={navigate}/>}
                  {screen==='dealers'   &&<DealersList dealers={myDealers} currentUser={currentUser} users={users} onEdit={setEditingId} onDelete={deleteDealer} onAdd={()=>setShowAdd(true)} selected={selected} setSelected={setSelected} onBulkAction={setBulkAction} notes={myNotes} pendingFilters={pendingFilters} clearPending={()=>setPendingFilters(null)} onUpdateDealer={updateDealerFields}/>}
                  {screen==='monthly'   &&<MonthlyTrend dealers={myDealers} currentUser={currentUser} users={users} onOpenDealer={setEditingId}/>}
                  {screen==='compare'   &&<Compare dealers={myDealers} onOpenDealer={setEditingId}/>}
                  {screen==='map'       &&<IndiaMap dealers={myDealers} users={users} onOpenDealer={setEditingId}/>}
                  {screen==='outstanding'&&<Outstanding dealers={myDealers} users={users} onOpenDealer={setEditingId} currentUser={currentUser} outstandingData={outstandingData} setOutstandingData={setOutstandingData}/>}
                  {screen==='followups' &&<FollowupsHub notes={myNotes} dealers={myDealers} users={users} onUpdateNote={updateNote} onDeleteNote={deleteNote} onOpenDealer={setEditingId}/>}
                  {screen==='admin'&&currentUser.role==='admin'&&<AdminPanel dealers={dealers} users={users} setUsers={setUsers} setShowUM={setShowUM} onSync={syncSheets} syncing={syncing} lastSync={lastSync} syncErrs={syncErrs} onNavigate={navigate} onOpenDealer={setEditingId} onUpdateDealer={updateDealerFields} onAddDealer={addDealer}/>}
                </>
              )}
            </div>
          </div>
        </div>

        {editing&&<DealerModal dealer={editing} users={users} currentUser={currentUser} onSave={saveDealer} onDelete={deleteDealer} onClose={()=>setEditingId(null)} notes={notes} onAddNote={addNote} onUpdateNote={updateNote} onDeleteNote={deleteNote} onLog={addLog} outstandingData={outstandingData}/>}
        {showAdd&&<AddDealerModal users={users} currentUser={currentUser} onAdd={addDealer} onClose={()=>setShowAdd(false)}/>}
        {showUM&&<UserManagement users={users} setUsers={setUsers} onClose={()=>setShowUM(false)}/>}
        {bulkAction&&<BulkActionModal action={bulkAction} selected={selected} dealers={dealers} users={users} onApply={applyBulk} onClose={()=>setBulkAction(null)}/>}
      </>
    </MonthContext.Provider>
  );
}
