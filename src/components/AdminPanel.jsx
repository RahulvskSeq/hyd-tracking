import React, { useState, useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Target, Award, Activity, RefreshCw } from 'lucide-react';
import { MO } from '../constants';
import { pct, spct, pclr } from '../utils';
import { useMonth } from '../context';
import { Avatar, KPI, StatCard } from './UI';
import CategoryDrillChart from './CategoryDrillChart';
import SalesEntry from './SalesEntry';

const AdminPanel=({dealers,users,setUsers,setShowUM,onSync,syncing,lastSync,syncErrs,onNavigate,onOpenDealer,onUpdateDealer,onAddDealer})=>{
  const {selectedMonthIdx}=useMonth();
  const selMoLabel=MO[selectedMonthIdx].slice(0,3);
  const [tab,setTab]=useState('summary');
  const sms=Object.values(users).filter(u=>u.role==='salesman');
  const dealersForMonth=useMemo(()=>dealers.map(d=>({...d,achieved:d.months[selectedMonthIdx]||0,target:(d.monthTargets?.[selectedMonthIdx] ?? d.target)})),[dealers,selectedMonthIdx]);
  const tt=dealersForMonth.reduce((s,x)=>s+x.target,0),ta=dealersForMonth.reduce((s,x)=>s+x.achieved,0);
  const active=dealersForMonth.filter(x=>['ACTIVE','ACHIVERS','KEY ACCOUNT'].includes((x.status||'').toUpperCase())).length;
  const compareData=sms.map(s=>{const sd=dealersForMonth.filter(d=>d.salesman===s.id);return{name:s.name,Target:sd.reduce((a,x)=>a+x.target,0),Achieved:sd.reduce((a,x)=>a+x.achieved,0),smId:s.id,color:s.color};});

  return(
    <div className="fade">
      <div style={{marginBottom:18}}>
        <div style={{fontSize:11,color:'var(--acc)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:2}}>Admin · {MO[selectedMonthIdx]}</div>
        <div className="row">
          <div style={{fontSize:22,fontWeight:700}}>Control Panel</div>
          <div className="spacer"/>
          <button onClick={()=>setShowUM(true)} className="btn" style={{display:'flex',alignItems:'center',gap:6}}><Users size={13}/> Users</button>
          <button onClick={onSync} className="btnp" style={{display:'flex',alignItems:'center',gap:8}} disabled={syncing}><RefreshCw size={13} className={syncing?'spin':''}/> {syncing?'Syncing...':'Sync Sheets'}</button>
        </div>
      </div>
      <div className="tabs">
        <button className={`tab ${tab==='summary'?'active':''}`} onClick={()=>setTab('summary')}>Summary</button>
        <button className={`tab ${tab==='compare'?'active':''}`} onClick={()=>setTab('compare')}>Salesman Compare</button>
        <button className={`tab ${tab==='category'?'active':''}`} onClick={()=>setTab('category')}>Categories</button>
        <button className={`tab ${tab==='entry'?'active':''}`} onClick={()=>setTab('entry')}>➕ Add Entry</button>
      </div>
      {tab==='summary'&&(
        <>
          <div className="stat-grid">
            <StatCard label="Total Dealers" value={dealers.length} sub={`${active} active`} icon={Users}/>
            <StatCard label={`${selMoLabel} Target`} value={tt} icon={Target}/>
            <StatCard label={`${selMoLabel} Achieved`} value={ta} valueColor="#34d399" icon={Award}/>
            <StatCard label="Overall %" value={spct(tt,ta)} valueColor={pclr(pct(tt,ta))} progress={pct(tt,ta)} icon={Activity}/>
          </div>
          <div className="card" style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--t2)',marginBottom:14}}>Target vs Achieved by Salesman — {MO[selectedMonthIdx]}</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={compareData} margin={{top:24,right:20,bottom:5,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)"/>
                <XAxis dataKey="name" tick={{fill:'var(--t3)',fontSize:11}}/><YAxis tick={{fill:'var(--t3)',fontSize:11}}/>
                <Tooltip contentStyle={{background:'var(--bg2)',border:'1px solid var(--b2)',borderRadius:8}}/><Legend wrapperStyle={{fontSize:12}}/>
                <Bar dataKey="Target" fill="#6366f1" radius={[4,4,0,0]} label={{position:'top',fill:'#6366f1',fontSize:11,fontWeight:700}} style={{cursor:'pointer'}} onClick={d=>onNavigate('dealers',{sm:d.smId})}/>
                <Bar dataKey="Achieved" fill="#34d399" radius={[4,4,0,0]} label={{position:'top',fill:'#34d399',fontSize:11,fontWeight:700}} style={{cursor:'pointer'}} onClick={d=>onNavigate('dealers',{sm:d.smId})}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,marginBottom:16}}>
            {sms.map(s=>{
              const sd=dealersForMonth.filter(d=>d.salesman===s.id);
              const st=sd.reduce((a,x)=>a+x.target,0),sa=sd.reduce((a,x)=>a+x.achieved,0),sp=pct(st,sa);
              const mT=MO.map((_,i)=>dealers.filter(d=>d.salesman===s.id).reduce((a,d)=>a+(d.months[i]||0),0));
              return(
                <div key={s.id} className="card" style={{borderColor:s.color+'44',cursor:'pointer',transition:'transform .15s'}}
                  onClick={()=>onNavigate('dealers',{sm:s.id})}
                  onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                  <div className="row" style={{marginBottom:12}}>
                    <Avatar user={s} size={34}/>
                    <div><div style={{fontSize:15,fontWeight:700}}>{s.name}</div><div style={{fontSize:11,color:'var(--t3)'}}>{sd.length} dealers</div></div>
                    <div className="spacer"/>
                    <div style={{fontSize:22,fontWeight:700,color:pclr(sp)}}>{spct(st,sa)}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6,marginBottom:10}}>
                    <KPI label={`${selMoLabel} Target`} value={st}/>
                    <KPI label={`${selMoLabel} Achieved`} value={sa} color="#34d399"/>
                  </div>
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={mT.map((v,i)=>({m:MO[i].slice(0,3),v}))} margin={{top:14,right:0,bottom:0,left:0}}>
                      <XAxis dataKey="m" tick={{fill:'var(--t3)',fontSize:9}} axisLine={false} tickLine={false} interval={0}/>
                      <Bar dataKey="v" radius={[2,2,0,0]} label={{position:'top',fill:s.color,fontSize:9,fontWeight:600}}>
                        {mT.map((_,idx)=>(<Cell key={idx} fill={idx===selectedMonthIdx?'#fbbf24':s.color}/>))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </>
      )}
      {tab==='compare'&&(
        <div className="card">
          <div style={{fontSize:13,fontWeight:600,color:'var(--t2)',marginBottom:14}}>All Salesmen — Month by Month</div>
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Salesman</th>{[...MO].map((_,di)=>{const i=MO.length-1-di;return<th key={i} style={{textAlign:'right',background:i===selectedMonthIdx?'rgba(99,102,241,.08)':'var(--bg1)'}}>{MO[i]}</th>;})}<th style={{textAlign:'right'}}>Tgt</th><th style={{textAlign:'right'}}>Ach</th><th style={{textAlign:'right'}}>%</th></tr>
              </thead>
              <tbody>
                {sms.map(s=>{
                  const sd=dealersForMonth.filter(d=>d.salesman===s.id);
                  const st=sd.reduce((a,x)=>a+x.target,0),sa=sd.reduce((a,x)=>a+x.achieved,0);
                  const mT=MO.map((_,i)=>dealers.filter(d=>d.salesman===s.id).reduce((a,d)=>a+(d.months[i]||0),0));
                  return(
                    <tr key={s.id} onClick={()=>onNavigate('dealers',{sm:s.id})} style={{cursor:'pointer'}}>
                      <td><div style={{display:'flex',alignItems:'center',gap:8}}><Avatar user={s} size={22}/><span style={{fontWeight:600}}>{s.name}</span></div></td>
                      {[...mT].map((_,di)=>{const i=mT.length-1-di;const v=mT[i];return<td key={i} style={{textAlign:'right',color:i===selectedMonthIdx?'#fbbf24':'var(--t2)',fontWeight:i===selectedMonthIdx?700:400,background:i===selectedMonthIdx?'rgba(251,191,36,.05)':'transparent'}}>{v||'—'}</td>;})}
                      <td style={{textAlign:'right'}}>{st}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:'#34d399'}}>{sa}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:pclr(pct(st,sa))}}>{spct(st,sa)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab==='category'&&<CategoryDrillChart dealers={dealers} selectedMonthIdx={selectedMonthIdx} onNavigate={onNavigate}/>}
      {tab==='entry'&&<SalesEntry dealers={dealers} users={users} onUpdateDealer={onUpdateDealer} onAddDealer={onAddDealer}/>}
    </div>
  );
};

export default AdminPanel;
