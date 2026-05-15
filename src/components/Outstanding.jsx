import React, { useState, useMemo } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Search, X, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { MO } from '../constants';
import { num, fcash, fetchCSV, parseOutstandingCSV } from '../utils';
import { useMonth } from '../context';
import { Avatar, MultiSelect, StatusBadge } from './UI';

const fmt = v => v ? '₹' + Number(v).toLocaleString('en-IN') : '—';

export default function Outstanding({ dealers, users, onOpenDealer, currentUser, outstandingData=[], setOutstandingData }) {
  const { selectedMonthIdx } = useMonth();
  const isAdmin = currentUser?.role === 'admin';

  // outstandingData & setOutstandingData come from App.jsx (shared with DealerModal)
  const [loading, setLoading] = useState(false);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [smFilter, setSmFilter] = useState([]);
  const [sortCol, setSortCol]   = useState('latest');
  const [sortDir, setSortDir]   = useState(-1);
  const [expanded, setExpanded] = useState({});
  const [tab, setTab]           = useState('outstanding'); // 'outstanding' | 'cleared' | 'all'

  // Load outstanding — one sheet covers ALL dealers (not per-salesman)
  // Use the first url_outstanding found (usually admin or any salesman)
  const loadOutstanding = async () => {
    setLoading(true); setError('');
    try {
      // Find first available outstanding URL (admin first, then any salesman)
      const allUsers = Object.values(users);
      const adminUser = allUsers.find(u => u.role === 'admin' && u.url_outstanding);
      const anyUser   = allUsers.find(u => u.url_outstanding);
      const source    = adminUser || anyUser;

      if(!source) {
        setError('No outstanding sheet URL configured. Add url_outstanding to constants.js');
        setLoading(false);
        return;
      }

      const csv  = await fetchCSV(source.url_outstanding);
      const rows = parseOutstandingCSV(csv, source.id);
      if(setOutstandingData) setOutstandingData(rows);
      setLoading(false);
    } catch(e) {
      setError('Failed to load: ' + e.message);
      setLoading(false);
    }
  };

  // Also compute outstanding from dealer creditLimit data as fallback
  const dealerOutstanding = useMemo(() => {
    return dealers
      .filter(d => d.creditLimit > 0 || d.creditDays > 0)
      .map(d => ({
        id: d.id,
        name: d.name,
        salesman: d.salesman,
        latestOutstanding: d.creditLimit || 0,
        maxOutstanding: d.creditLimit || 0,
        monthlyOutstanding: {},
        monthCols: [],
        trend: 0,
        status: d.creditLimit > 0 ? 'OUTSTANDING' : 'CLEARED',
        creditDays: d.creditDays,
        fromDealerData: true,
      }))
      .sort((a,b) => b.latestOutstanding - a.latestOutstanding);
  }, [dealers]);

  // Use sheet data if loaded, else dealer data
  const sourceData = outstandingData.length > 0 ? outstandingData : dealerOutstanding;

  // Get all month columns from data
  const allMonthCols = useMemo(() => {
    const cols = new Set();
    sourceData.forEach(d => d.monthCols?.forEach(m => cols.add(m)));
    return [...cols];
  }, [sourceData]);

  const filtered = useMemo(() => {
    let d = sourceData;
    if(tab === 'outstanding') d = d.filter(x => x.latestOutstanding > 0);
    if(tab === 'cleared')     d = d.filter(x => x.latestOutstanding === 0);
    if(search) d = d.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));
    if(isAdmin && smFilter.length > 0) d = d.filter(x => smFilter.includes(x.salesman));
    return [...d].sort((a,b) => {
      const av = sortCol === 'latest' ? a.latestOutstanding : sortCol === 'max' ? a.maxOutstanding : a.trend;
      const bv = sortCol === 'latest' ? b.latestOutstanding : sortCol === 'max' ? b.maxOutstanding : b.trend;
      return sortDir * (bv - av);
    });
  }, [sourceData, tab, search, smFilter, sortCol, sortDir, isAdmin]);

  const totalOutstanding = filtered.reduce((s,d) => s + d.latestOutstanding, 0);
  const countOutstanding = sourceData.filter(d=>d.latestOutstanding>0).length;
  const countCleared     = sourceData.filter(d=>d.latestOutstanding===0).length;

  const toggle = id => setExpanded(e=>({...e,[id]:!e[id]}));
  const sort   = col => { if(sortCol===col) setSortDir(d=>-d); else { setSortCol(col); setSortDir(-1); } };

  const smOptions = Object.values(users).filter(u=>u.role==='salesman').map(s=>s.id);

  const hasUrlConfigured = Object.values(users).some(u => u.url_outstanding);
  const configuredUrl = (Object.values(users).find(u=>u.role==='admin'&&u.url_outstanding)||Object.values(users).find(u=>u.url_outstanding))?.url_outstanding;

  return (
    <div className="fade">
      {/* Header */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,color:'var(--acc)',textTransform:'uppercase',letterSpacing:'.15em',marginBottom:4}}>Payments</div>
        <div style={{fontSize:22,fontWeight:700}}>Outstanding</div>
      </div>

      {/* Setup notice if no URLs configured */}
      {!hasUrlConfigured && outstandingData.length === 0 && (
        <div className="card" style={{marginBottom:14,background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)'}}>
          <div style={{fontSize:13,fontWeight:600,color:'var(--acc)',marginBottom:8}}>📋 Setup Outstanding Sheet</div>
          <div style={{fontSize:12,color:'var(--t2)',marginBottom:10}}>
            Create a Google Sheet with your dealer outstanding amounts:
          </div>
          <div style={{background:'var(--bg2)',borderRadius:8,padding:12,fontFamily:'monospace',fontSize:11,color:'#34d399',marginBottom:10}}>
            Dealer Name | FEB | MAR | APR | MAY<br/>
            AADINATH PLYWOOD | 36000 | 100625 | 169650 | 200000<br/>
            BHATTAD PLYWOODS | 51125 | 56625 | 60875 | 65000
          </div>
          <div style={{fontSize:12,color:'var(--t3)'}}>
            Then publish as CSV and add the URL to <code style={{background:'var(--bg2)',padding:'1px 5px',borderRadius:3}}>url_outstanding</code> in <code style={{background:'var(--bg2)',padding:'1px 5px',borderRadius:3}}>constants.js</code>
          </div>
        </div>
      )}

      {/* Load button */}
      {hasUrlConfigured && (
        <div style={{marginBottom:14,display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={loadOutstanding} disabled={loading} className="btnp" style={{display:'flex',alignItems:'center',gap:6}}>
            <RefreshCw size={13} className={loading?'spin':''}/> {loading?'Loading...':'Load Outstanding Data'}
          </button>
          {outstandingData.length>0&&<span style={{fontSize:12,color:'var(--t3)'}}>{outstandingData.length} dealers loaded</span>}
          {loading&&<span style={{fontSize:12,color:'var(--t3)'}}>Fetching from sheet...</span>}
          {error&&<span style={{fontSize:11,color:'var(--red)'}}>{error}</span>}
        </div>
      )}

      {/* Summary cards */}
      {sourceData.length > 0 && (
        <div className="stat-grid" style={{marginBottom:14}}>
          <div className="stat-card">
            <div style={{fontSize:10,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Total Outstanding</div>
            <div style={{fontSize:22,fontWeight:700,color:'#f87171'}}>{fmt(totalOutstanding)}</div>
            <div style={{fontSize:11,color:'var(--t3)',marginTop:4}}>{countOutstanding} dealers pending</div>
          </div>
          <div className="stat-card">
            <div style={{fontSize:10,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Cleared</div>
            <div style={{fontSize:22,fontWeight:700,color:'#34d399'}}>{countCleared}</div>
            <div style={{fontSize:11,color:'var(--t3)',marginTop:4}}>dealers fully paid</div>
          </div>
          <div className="stat-card">
            <div style={{fontSize:10,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Avg Outstanding</div>
            <div style={{fontSize:22,fontWeight:700,color:'#fbbf24'}}>{fmt(countOutstanding?Math.round(totalOutstanding/countOutstanding):0)}</div>
            <div style={{fontSize:11,color:'var(--t3)',marginTop:4}}>per dealer</div>
          </div>
          <div className="stat-card">
            <div style={{fontSize:10,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Total Dealers</div>
            <div style={{fontSize:22,fontWeight:700,color:'var(--acc)'}}>{sourceData.length}</div>
            <div style={{fontSize:11,color:'var(--t3)',marginTop:4}}>in sheet</div>
          </div>
        </div>
      )}

      {/* Month-wise trend table */}
      {allMonthCols.length > 0 && (
        <div className="card" style={{marginBottom:14,padding:0,overflow:'hidden'}}>
          <div style={{padding:'12px 14px',borderBottom:'1px solid var(--b1)',fontSize:12,fontWeight:600,color:'var(--t2)'}}>
            Month-wise Outstanding Summary
          </div>
          <div style={{overflowX:'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{textAlign:'right'}}>Total Outstanding</th>
                  <th style={{textAlign:'right'}}>Dealers with Due</th>
                  <th style={{textAlign:'right'}}>Highest Single</th>
                  <th style={{textAlign:'right'}}>Avg per Dealer</th>
                  <th style={{textAlign:'right'}}>Change</th>
                </tr>
              </thead>
              <tbody>
                {allMonthCols.map((month, mi) => {
                  const vals = sourceData.map(d => d.monthlyOutstanding[month]||0);
                  const total = vals.reduce((a,b)=>a+b,0);
                  const withDue = vals.filter(v=>v>0).length;
                  const highest = Math.max(...vals,0);
                  const avg = withDue ? Math.round(total/withDue) : 0;
                  const prevMonth = allMonthCols[mi-1];
                  const prevTotal = prevMonth ? sourceData.map(d=>d.monthlyOutstanding[prevMonth]||0).reduce((a,b)=>a+b,0) : 0;
                  const change = mi > 0 ? total - prevTotal : 0;
                  return(
                    <tr key={month}>
                      <td style={{fontWeight:600,color:'var(--t1)'}}>{month}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:total>0?'#f87171':'#34d399'}}>{fmt(total)}</td>
                      <td style={{textAlign:'right',color:'var(--t2)'}}>{withDue}</td>
                      <td style={{textAlign:'right',color:'#fbbf24'}}>{fmt(highest)}</td>
                      <td style={{textAlign:'right',color:'var(--t3)'}}>{fmt(avg)}</td>
                      <td style={{textAlign:'right',color:change>0?'#f87171':change<0?'#34d399':'var(--t3)',fontWeight:600}}>
                        {change!==0?(change>0?'▲':'▼')+fmt(Math.abs(change)):'—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dealer list */}
      {sourceData.length > 0 && (
        <>
          {/* Tabs */}
          <div className="tabs">
            {[
              {id:'outstanding',label:`Outstanding (${countOutstanding})`},
              {id:'cleared',    label:`Cleared (${countCleared})`},
              {id:'all',        label:`All (${sourceData.length})`},
            ].map(t=>(
              <button key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {/* Filters */}
          <div className="row" style={{marginBottom:12,flexWrap:'wrap',gap:8}}>
            <div style={{position:'relative'}}>
              <Search size={13} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--t3)'}}/>
              <input className="inp" style={{width:200,paddingLeft:30,fontSize:12}} placeholder="Search dealer..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            {isAdmin&&<MultiSelect options={smOptions} selected={smFilter} onChange={setSmFilter} placeholder="All Salesmen"
              renderOption={id=>{const s=users[id];return s?<div style={{display:'flex',alignItems:'center',gap:6}}><Avatar user={s} size={16}/><span style={{fontSize:12}}>{s.name}</span></div>:<span>{id}</span>;}}/>}
            {(search||smFilter.length>0)&&<button onClick={()=>{setSearch('');setSmFilter([]);}} className="btn" style={{fontSize:11,color:'var(--red)'}}><X size={11}/> Clear</button>}
            <div style={{flex:1}}/>
            <span style={{fontSize:12,color:'var(--t3)'}}>{filtered.length} dealers · {fmt(filtered.reduce((s,d)=>s+d.latestOutstanding,0))}</span>
          </div>

          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{overflowX:'auto',maxHeight:'60vh',overflowY:'auto'}}>
              <table>
                <thead>
                  <tr>
                    <th style={{width:30}}>#</th>
                    <th>Dealer Name</th>
                    {isAdmin&&<th>Salesman</th>}
                    {/* Month columns */}
                    {allMonthCols.map(m=>(
                      <th key={m} style={{textAlign:'right',cursor:'pointer'}} onClick={()=>sort(m)}>{m}</th>
                    ))}
                    <th style={{textAlign:'right',cursor:'pointer'}} onClick={()=>sort('latest')}>
                      Latest {sortCol==='latest'?(sortDir>0?'↑':'↓'):''}
                    </th>
                    <th style={{textAlign:'right'}}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d,i)=>{
                    const sm = users[d.salesman];
                    const isOpen = expanded[d.id];
                    const isCleared = d.latestOutstanding === 0;
                    return(
                      <React.Fragment key={d.id}>
                        <tr style={{cursor:'pointer',background:isCleared?'rgba(52,211,153,0.04)':'transparent'}}
                          onClick={()=>toggle(d.id)}>
                          <td style={{color:'var(--t3)',fontSize:11}}>{i+1}</td>
                          <td>
                            <div style={{fontWeight:600,color:'var(--t1)',maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</div>
                            {isCleared&&<span style={{fontSize:9,background:'rgba(52,211,153,0.15)',color:'#34d399',padding:'1px 5px',borderRadius:3,marginTop:2,display:'inline-block'}}>CLEARED</span>}
                          </td>
                          {isAdmin&&<td>{sm?<div style={{display:'flex',alignItems:'center',gap:4}}><Avatar user={sm} size={18}/><span style={{fontSize:11}}>{sm.name}</span></div>:'—'}</td>}
                          {allMonthCols.map(m=>{
                            const v = d.monthlyOutstanding[m]||0;
                            const prev = allMonthCols[allMonthCols.indexOf(m)-1];
                            const prevV = prev?(d.monthlyOutstanding[prev]||0):v;
                            const went_up = v > prevV;
                            return(
                              <td key={m} style={{textAlign:'right',color:v===0?'#34d399':went_up?'#f87171':'#fbbf24',fontWeight:v>0?600:400,fontSize:12}}>
                                {v>0?fmt(v):'—'}
                              </td>
                            );
                          })}
                          <td style={{textAlign:'right',fontWeight:700,color:d.latestOutstanding===0?'#34d399':'#f87171',fontSize:13}}>
                            {d.latestOutstanding>0?fmt(d.latestOutstanding):'✓ Nil'}
                          </td>
                          <td style={{textAlign:'right'}}>
                            {d.trend>0?<span style={{color:'#f87171',fontSize:11}}>▲{fmt(d.trend)}</span>
                            :d.trend<0?<span style={{color:'#34d399',fontSize:11}}>▼{fmt(Math.abs(d.trend))}</span>
                            :<span style={{color:'var(--t3)',fontSize:11}}>—</span>}
                          </td>
                        </tr>
                        {isOpen&&(
                          <tr>
                            <td colSpan={99} style={{background:'var(--bg2)',padding:'10px 14px'}}>
                              {/* Mini bar chart of monthly outstanding */}
                              {allMonthCols.length>0&&(
                                <div style={{marginBottom:10}}>
                                  <div style={{fontSize:10,color:'var(--t3)',marginBottom:6}}>Outstanding Trend</div>
                                  <div style={{display:'flex',gap:4,alignItems:'flex-end',height:40}}>
                                    {allMonthCols.map(m=>{
                                      const v=d.monthlyOutstanding[m]||0;
                                      const mx=Math.max(...allMonthCols.map(mc=>d.monthlyOutstanding[mc]||0),1);
                                      return(
                                        <div key={m} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                                          <div style={{width:'100%',height:Math.max((v/mx)*36,v>0?3:1),background:v===0?'var(--b1)':'#f87171',borderRadius:'2px 2px 0 0',minHeight:1}}/>
                                          <div style={{fontSize:7,color:'var(--t3)'}}>{m}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {!d.fromDealerData&&(
                                <button className="btnp" style={{fontSize:11,padding:'5px 12px'}} onClick={()=>onOpenDealer&&dealers.find(x=>x.name.toUpperCase().trim()===d.name.toUpperCase().trim())&&onOpenDealer(dealers.find(x=>x.name.toUpperCase().trim()===d.name.toUpperCase().trim()).id)}>
                                  View Dealer Details
                                </button>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filtered.length===0&&(
                    <tr><td colSpan={99} style={{textAlign:'center',padding:30,color:'var(--t3)'}}>No records found</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={isAdmin?3:2} style={{fontWeight:700,color:'var(--t1)'}}>TOTAL</td>
                    {allMonthCols.map(m=>{
                      const t=filtered.reduce((s,d)=>s+(d.monthlyOutstanding[m]||0),0);
                      return<td key={m} style={{textAlign:'right',fontWeight:700,color:'#f87171'}}>{t>0?fmt(t):'—'}</td>;
                    })}
                    <td style={{textAlign:'right',fontWeight:700,color:'#f87171'}}>{fmt(filtered.reduce((s,d)=>s+d.latestOutstanding,0))}</td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
