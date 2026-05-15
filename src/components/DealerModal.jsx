import React, { useState } from 'react';
import { ComposedChart, Bar, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Trash2, Save, Bell, CheckSquare, Square, MapPin, Camera, Share2 } from 'lucide-react';
import { MO, CURRENT_MONTH_IDX, CURRENT_MONTH_SHORT } from '../constants';
import { pct, spct, pclr, fcash, num, uid, isoNow, trendPct, forecast } from '../utils';
import { useMonth } from '../context';
import { StatusBadge, Avatar, KPI } from './UI';
import { downloadDealerCard, shareDealerCard } from './dealerCard';
import { Layers } from 'lucide-react';

const DealerModal=({dealer,users,currentUser,onSave,onDelete,onClose,notes,onAddNote,onUpdateNote,onDeleteNote,onLog,outstandingData=[]})=>{
  const {selectedMonthIdx}=useMonth();
  const selMoLabel=MO[selectedMonthIdx].slice(0,3);
  const isAdmin=currentUser.role==='admin';
  const [tab,setTab]=useState('overview');
  const [edit,setEdit]=useState({
    name:dealer.name,zone:dealer.zone,status:dealer.status,salesman:dealer.salesman,
    target:dealer.target,achieved:dealer.months[CURRENT_MONTH_IDX]||0,
    creditDays:dealer.creditDays,creditLimit:dealer.creditLimit,
    city:dealer.city||'',state:dealer.state||'',
    category:dealer.category||'',categoryType:dealer.categoryType||'',
  });
  const [newNote,setNewNote]=useState('');
  const [noteType,setNoteType]=useState('note');
  const [dueDate,setDueDate]=useState('');

  const dealerNotes=notes.filter(n=>n.dealerId===dealer.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  // Find outstanding record matching this dealer by name
  const outRecord = outstandingData.find(o=>o.name.toUpperCase().trim()===dealer.name.toUpperCase().trim());
  const followups=dealerNotes.filter(n=>n.type==='followup');
  const regularNotes=dealerNotes.filter(n=>n.type!=='followup');

  const viewAchieved=dealer.months[selectedMonthIdx]||0;
  const viewTarget=dealer.monthTargets?.[selectedMonthIdx]??dealer.target;
  const p=viewTarget?pct(viewTarget,viewAchieved):(viewAchieved>0?null:0);
  const tp=trendPct(dealer.months);
  const fc=forecast(dealer.months);

  const chartData=dealer.months.map((v,i)=>({
    month:MO[i].slice(0,3),units:v,
    target:(dealer.monthTargets?.[i] ?? dealer.target) || null,
    isSelected:i===selectedMonthIdx
  }));

  const save=()=>{
    const newMonths=[...dealer.months];
    newMonths[CURRENT_MONTH_IDX]=num(edit.achieved);
    onSave({...dealer,name:edit.name,zone:edit.zone,status:edit.status,salesman:edit.salesman,
      target:num(edit.target),achieved:num(edit.achieved),
      creditDays:num(edit.creditDays),creditLimit:num(edit.creditLimit),
      city:edit.city.trim(),state:edit.state.trim(),
      category:edit.category.trim(),categoryType:edit.categoryType.trim(),
      months:newMonths});
    onLog('edit',`Updated dealer: ${edit.name}`);
    onClose();
  };

  const addNote=()=>{
    if(!newNote.trim())return;
    onAddNote({id:uid(),dealerId:dealer.id,content:newNote.trim(),type:noteType,dueDate:noteType==='followup'?dueDate:null,completed:false,createdAt:isoNow(),createdBy:currentUser.id});
    setNewNote('');setDueDate('');
  };

  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:860,width:'95vw'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18,flexWrap:'wrap',gap:10}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontSize:20,fontWeight:700,marginBottom:6}}>{dealer.name}</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              <StatusBadge status={dealer.status}/>
              {dealer.zone&&<span className="chip">{dealer.zone}</span>}
              {(dealer.city||dealer.state)&&<span className="chip" style={{display:'inline-flex',alignItems:'center',gap:4}}><MapPin size={10}/> {[dealer.city,dealer.state].filter(Boolean).join(', ')}</span>}
              {dealer.category&&<span className="chip" style={{color:'#818cf8',borderColor:'#818cf844'}}><Layers size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}}/>{dealer.category}{dealer.categoryType?` / ${dealer.categoryType}`:''}</span>}
              {isAdmin&&<span style={{fontSize:11,color:'var(--t3)'}}>· {users[dealer.salesman]?.name||dealer.salesman}</span>}
              {selectedMonthIdx!==CURRENT_MONTH_IDX&&<span style={{fontSize:10,background:'rgba(251,191,36,0.15)',color:'#fbbf24',padding:'2px 8px',borderRadius:4}}>Viewing {MO[selectedMonthIdx]}</span>}
            </div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
            <button className="btn" title="Download full dealer card as PNG" onClick={()=>downloadDealerCard(dealer,users,selectedMonthIdx)} style={{display:'flex',alignItems:'center',gap:5,fontSize:12}}><Camera size={13}/> Download</button>
            <button className="btn" title="Share dealer info" onClick={()=>shareDealerCard(dealer,users,selectedMonthIdx)} style={{display:'flex',alignItems:'center',gap:5,fontSize:12}}><Share2 size={13}/> Share</button>
            {isAdmin&&<button className="btnd" onClick={()=>{onDelete(dealer.id);onClose();}}><Trash2 size={12}/> Delete</button>}
            <button className="btn" onClick={onClose}><X size={14}/></button>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab==='overview'?'active':''}`} onClick={()=>setTab('overview')}>Overview</button>
          <button className={`tab ${tab==='monthly'?'active':''}`} onClick={()=>setTab('monthly')}>Monthly Detail</button>
          <button className={`tab ${tab==='edit'?'active':''}`} onClick={()=>setTab('edit')}>Edit</button>
          <button className={`tab ${tab==='notes'?'active':''}`} onClick={()=>setTab('notes')}>
            Notes & Follow-ups {dealerNotes.length>0&&<span style={{background:'var(--acc)',color:'#fff',borderRadius:8,padding:'1px 6px',fontSize:10,marginLeft:4}}>{dealerNotes.length}</span>}
          </button>
          <button className={`tab ${tab==='outstanding'?'active':''}`} onClick={()=>setTab('outstanding')}>
            Outstanding {outRecord&&outRecord.latestOutstanding>0&&<span style={{background:'#f87171',color:'#fff',borderRadius:8,padding:'1px 6px',fontSize:10,marginLeft:4}}>!</span>}
          </button>
        </div>

        {tab==='overview'&&(
          <div>
            {/* Full KPI grid */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8,marginBottom:18}}>
              <KPI label={`${selMoLabel} Target`} value={viewTarget||'—'}/>
              <KPI label={`${selMoLabel} Achieved`} value={viewAchieved} color="#34d399"/>
              <KPI label="Achievement" value={p!==null?spct(viewTarget,viewAchieved):'N/T'} color={pclr(p)}/>
              <KPI label="6-mo Avg" value={dealer.avg6m||'—'}/>
              <KPI label="Forecast" value={fc} color="var(--acc)" sub="next month"/>
              <KPI label="Trend" value={(tp>0?'+':'')+tp+'%'} color={tp>0?'#34d399':tp<0?'#f87171':'var(--t3)'} sub="3m vs 3m"/>
              <KPI label="Credit Days" value={dealer.creditDays?dealer.creditDays+'d':'—'}/>
              <KPI label="Credit Limit" value={fcash(dealer.creditLimit)}/>
              <KPI label="11-mo Total" value={dealer.months.reduce((a,b)=>a+b,0)}/>
              <KPI label="11-mo High" value={Math.max(...dealer.months)}/>
              <KPI label="Active Months" value={dealer.months.filter(v=>v>0).length+'/11'}/>
              {dealer.category&&<KPI label="Category" value={dealer.category} color="#818cf8"/>}
              {dealer.categoryType&&<KPI label="Cat Type" value={dealer.categoryType} color="#818cf8"/>}
              {dealer.city&&<KPI label="City" value={dealer.city}/>}
              {dealer.state&&<KPI label="State" value={dealer.state}/>}
              {dealer.zone&&<KPI label="Zone" value={dealer.zone}/>}
            </div>

            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>
                11-Month Performance {dealer.target>0&&<span style={{color:'#34d399',marginLeft:8}}>— dashed = target</span>}
                {selectedMonthIdx!==CURRENT_MONTH_IDX&&<span style={{color:'#fbbf24',marginLeft:8}}>(yellow bar = selected: {MO[selectedMonthIdx]})</span>}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData} margin={{top:18,right:10,bottom:5,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)"/>
                  <XAxis dataKey="month" tick={{fill:'var(--t3)',fontSize:11}}/>
                  <YAxis tick={{fill:'var(--t3)',fontSize:11}}/>
                  <Tooltip contentStyle={{background:'var(--bg2)',border:'1px solid var(--b2)',borderRadius:8}} formatter={(value,name)=>[value,name==='units'?'Achieved':'Target']}/>
                  <Bar dataKey="units" radius={[3,3,0,0]} label={{position:'top',fill:'var(--t2)',fontSize:10,fontWeight:600}}>
                    {chartData.map((entry,index)=>(<Cell key={index} fill={entry.isSelected?'#fbbf24':'#6366f1'}/>))}
                  </Bar>
                  {dealer.target>0&&<Line type="monotone" dataKey="target" stroke="#34d399" strokeWidth={1.5} strokeDasharray="4 4" dot={false}/>}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab==='monthly'&&(
          <div>
            <div style={{fontSize:11,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Month-by-Month Breakdown — Full Detail</div>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th style={{textAlign:'right'}}>Achieved</th>
                    <th style={{textAlign:'right'}}>Target</th>
                    <th style={{textAlign:'right'}}>vs Target</th>
                    <th style={{textAlign:'right'}}>Δ MoM</th>
                    <th style={{textAlign:'right'}}>Δ MoM %</th>
                    <th>Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {dealer.months.map((_,i)=>{
                    const v=dealer.months[i];
                    const mt=dealer.monthTargets?.[i]??dealer.target;
                    const prev=i<dealer.months.length-1?dealer.months[i+1]:null;
                    const diff=prev!=null?v-prev:null;
                    const diffP=prev&&prev>0?Math.round((diff/prev)*100):null;
                    const vsPct=mt?Math.round((v/mt)*100):null;
                    const maxV=Math.max(...dealer.months,1);
                    return(
                      <tr key={i} style={{background:i===selectedMonthIdx?'rgba(251,191,36,0.05)':'transparent'}}>
                        <td style={{fontWeight:i===selectedMonthIdx?700:400,color:i===selectedMonthIdx?'#fbbf24':i===CURRENT_MONTH_IDX?'var(--acc)':'var(--t2)'}}>
                          {MO[i]}{i===selectedMonthIdx?' ◀':''}{i===CURRENT_MONTH_IDX?' ★':''}
                        </td>
                        <td style={{textAlign:'right',fontWeight:600,color:v>0?'var(--t1)':'var(--t3)'}}>{v||'—'}</td>
                        <td style={{textAlign:'right',color:'var(--t3)'}}>{mt||'—'}</td>
                        <td style={{textAlign:'right',fontWeight:600,color:vsPct===null?'var(--t3)':vsPct>=100?'#34d399':vsPct>=60?'#fbbf24':'#f87171'}}>{vsPct!==null?vsPct+'%':'—'}</td>
                        <td style={{textAlign:'right',color:diff>0?'#34d399':diff<0?'#f87171':'var(--t3)'}}>{diff!=null?(diff>0?'+':'')+diff:'—'}</td>
                        <td style={{textAlign:'right',color:diffP>0?'#34d399':diffP<0?'#f87171':'var(--t3)'}}>{diffP!=null?(diffP>0?'+':'')+diffP+'%':'—'}</td>
                        <td style={{minWidth:80}}>
                          <div style={{display:'flex',alignItems:'center',gap:4}}>
                            <div style={{height:8,flex:1,background:'var(--b1)',borderRadius:4,overflow:'hidden'}}>
                              <div style={{height:'100%',width:Math.round((v/maxV)*100)+'%',background:i===selectedMonthIdx?'#fbbf24':'#6366f1',borderRadius:4}}/>
                            </div>
                            {mt>0&&<div style={{height:8,flex:1,background:'var(--b1)',borderRadius:4,overflow:'hidden'}}>
                              <div style={{height:'100%',width:Math.min(Math.round((v/mt)*100),100)+'%',background:vsPct>=100?'#34d399':vsPct>=60?'#fbbf24':'#f87171',borderRadius:4}}/>
                            </div>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{color:'var(--t1)',fontWeight:700}}>TOTAL</td>
                    <td style={{textAlign:'right',fontWeight:700,color:'#34d399'}}>{dealer.months.reduce((a,b)=>a+b,0)}</td>
                    <td style={{textAlign:'right',color:'var(--t3)'}}>—</td>
                    <td colSpan="4"/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {tab==='edit'&&(
          <div className="g2">
            <div className="field full"><label>Dealer Name</label><input className="inp" value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/></div>
            <div className="field"><label>Zone</label>
              <select className="sel inp" value={edit.zone} onChange={e=>setEdit({...edit,zone:e.target.value})}>
                <option value="">None</option>
                {['ZONE 1','ZONE 2','ZONE 3'].map(z=><option key={z}>{z}</option>)}
              </select>
            </div>
            <div className="field"><label>Status</label>
              <select className="sel inp" value={edit.status} onChange={e=>setEdit({...edit,status:e.target.value})}>
                {['ACTIVE','ACHIVERS','KEY ACCOUNT','INACTIVE','DEAD','RECENTLY INACTIVE'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field"><label>City</label><input className="inp" value={edit.city} onChange={e=>setEdit({...edit,city:e.target.value})} placeholder="e.g. Bengaluru"/></div>
            <div className="field"><label>State</label><input className="inp" value={edit.state} onChange={e=>setEdit({...edit,state:e.target.value})} placeholder="e.g. Karnataka"/></div>
            <div className="field"><label>Category</label><input className="inp" value={edit.category} onChange={e=>setEdit({...edit,category:e.target.value})} placeholder="e.g. Laminate"/></div>
            <div className="field"><label>Category Type</label><input className="inp" value={edit.categoryType} onChange={e=>setEdit({...edit,categoryType:e.target.value})} placeholder="e.g. 1mm"/></div>
            {isAdmin&&(
              <div className="field"><label>Salesman</label>
                <select className="sel inp" value={edit.salesman} onChange={e=>setEdit({...edit,salesman:e.target.value})}>
                  {Object.values(users).filter(u=>u.role==='salesman').map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div className="field"><label>{CURRENT_MONTH_SHORT} Target</label><input type="number" className="inp" value={edit.target} onChange={e=>setEdit({...edit,target:e.target.value})}/></div>
            <div className="field"><label>{CURRENT_MONTH_SHORT} Achieved</label><input type="number" className="inp" value={edit.achieved} onChange={e=>setEdit({...edit,achieved:e.target.value})}/></div>
            <div className="field"><label>Credit Days</label><input type="number" className="inp" value={edit.creditDays} onChange={e=>setEdit({...edit,creditDays:e.target.value})}/></div>
            <div className="field"><label>Credit Limit ₹</label><input type="number" className="inp" value={edit.creditLimit} onChange={e=>setEdit({...edit,creditLimit:e.target.value})}/></div>
            <div className="field full row" style={{gap:8}}>
              <button className="btnp" onClick={save}><Save size={13} style={{marginRight:6}}/>Save Changes</button>
              <button className="btn" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}

        {tab==='notes'&&(
          <div>
            <div style={{background:'var(--bg2)',borderRadius:10,padding:14,marginBottom:14}}>
              <div style={{fontSize:11,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>Add new entry</div>
              <div className="row" style={{gap:8,marginBottom:8}}>
                <select className="sel" value={noteType} onChange={e=>setNoteType(e.target.value)}>
                  <option value="note">📝 Note</option>
                  <option value="call">📞 Call log</option>
                  <option value="visit">📍 Visit log</option>
                  <option value="followup">⏰ Follow-up</option>
                </select>
                {noteType==='followup'&&(<input type="date" className="inp" style={{width:160}} value={dueDate} onChange={e=>setDueDate(e.target.value)}/>)}
              </div>
              <textarea className="inp" style={{minHeight:60,resize:'vertical',fontFamily:'inherit'}} placeholder={noteType==='followup'?'What needs following up?':'Write a note...'} value={newNote} onChange={e=>setNewNote(e.target.value)}/>
              <button className="btnp" style={{marginTop:8}} onClick={addNote}>Add</button>
            </div>
            {followups.length>0&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:'var(--acc)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8,display:'flex',alignItems:'center',gap:6}}><Bell size={12}/> Follow-ups ({followups.length})</div>
                {followups.map(n=>{
                  const overdue=!n.completed&&n.dueDate&&new Date(n.dueDate)<new Date();
                  return(
                    <div key={n.id} style={{background:overdue?'rgba(248,113,113,0.08)':n.completed?'var(--bg2)':'rgba(251,191,36,0.06)',border:`1px solid ${overdue?'rgba(248,113,113,0.2)':'var(--b2)'}`,borderRadius:8,padding:12,marginBottom:8,opacity:n.completed?0.5:1}}>
                      <div className="row" style={{marginBottom:4}}>
                        <button onClick={()=>onUpdateNote(n.id,{completed:!n.completed})} style={{background:'none',border:'none',cursor:'pointer',color:n.completed?'#34d399':'var(--t3)'}}>{n.completed?<CheckSquare size={16}/>:<Square size={16}/>}</button>
                        <span style={{fontSize:11,color:overdue?'#f87171':'var(--t3)',fontWeight:overdue?600:400}}>{overdue&&'⚠ Overdue · '}Due {new Date(n.dueDate).toLocaleDateString('en-IN')}</span>
                        <span className="spacer"/>
                        <button onClick={()=>onDeleteNote(n.id)} className="btn" style={{padding:3,fontSize:11}}><Trash2 size={11}/></button>
                      </div>
                      <div style={{fontSize:13,color:'var(--t1)',textDecoration:n.completed?'line-through':'none'}}>{n.content}</div>
                      <div style={{fontSize:10,color:'var(--t3)',marginTop:4}}>by {users[n.createdBy]?.name||n.createdBy} · {new Date(n.createdAt).toLocaleDateString('en-IN')}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {regularNotes.length>0&&(
              <div>
                <div style={{fontSize:11,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Activity ({regularNotes.length})</div>
                {regularNotes.map(n=>(
                  <div key={n.id} style={{background:'var(--bg2)',borderRadius:8,padding:12,marginBottom:8}}>
                    <div className="row" style={{marginBottom:4}}>
                      <span style={{fontSize:11}}>{n.type==='call'?'📞':n.type==='visit'?'📍':'📝'} <strong style={{color:'var(--t2)'}}>{n.type}</strong></span>
                      <span className="spacer"/>
                      <button onClick={()=>onDeleteNote(n.id)} className="btn" style={{padding:3,fontSize:11}}><Trash2 size={11}/></button>
                    </div>
                    <div style={{fontSize:13,color:'var(--t1)'}}>{n.content}</div>
                    <div style={{fontSize:10,color:'var(--t3)',marginTop:4}}>by {users[n.createdBy]?.name||n.createdBy} · {new Date(n.createdAt).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            )}
            {dealerNotes.length===0&&<div style={{color:'var(--t3)',textAlign:'center',padding:30,fontSize:13}}>No notes yet.</div>}
          </div>
        )}

        {tab==='outstanding'&&(
          <div>
            {!outRecord?(
              <div style={{textAlign:'center',padding:40,color:'var(--t3)'}}>
                <div style={{fontSize:28,marginBottom:8}}>💳</div>
                <div style={{fontSize:13,color:'var(--t2)',marginBottom:4}}>No outstanding data found</div>
                <div style={{fontSize:11}}>Load outstanding data from the Outstanding section first</div>
              </div>
            ):(
              <div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
                  {[
                    {l:'Latest Outstanding',v:'₹'+Number(outRecord.latestOutstanding).toLocaleString('en-IN'),c:outRecord.latestOutstanding>0?'#f87171':'#34d399'},
                    {l:'Highest Ever',v:'₹'+Number(outRecord.maxOutstanding).toLocaleString('en-IN'),c:'#fbbf24'},
                    {l:'Trend',v:outRecord.trend>0?'▲ ₹'+Number(outRecord.trend).toLocaleString('en-IN'):outRecord.trend<0?'▼ ₹'+Number(Math.abs(outRecord.trend)).toLocaleString('en-IN'):'Stable',c:outRecord.trend>0?'#f87171':outRecord.trend<0?'#34d399':'var(--t3)'},
                  ].map(k=>(
                    <div key={k.l} style={{background:'var(--bg2)',borderRadius:8,padding:'10px 12px'}}>
                      <div style={{fontSize:9,color:'var(--t3)',textTransform:'uppercase',marginBottom:3}}>{k.l}</div>
                      <div style={{fontSize:15,fontWeight:700,color:k.c}}>{k.v}</div>
                    </div>
                  ))}
                </div>
                {outRecord.monthCols&&outRecord.monthCols.length>0&&(
                  <div style={{overflowX:'auto'}}>
                    <table>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th style={{textAlign:'right'}}>Outstanding</th>
                          <th style={{textAlign:'right'}}>Change</th>
                          <th>Bar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outRecord.monthCols.map((m,mi)=>{
                          const v=outRecord.monthlyOutstanding[m]||0;
                          const prev=mi>0?outRecord.monthlyOutstanding[outRecord.monthCols[mi-1]]||0:v;
                          const change=mi>0?v-prev:0;
                          const maxV=Math.max(...outRecord.monthCols.map(mc=>outRecord.monthlyOutstanding[mc]||0),1);
                          const barW=Math.round((v/maxV)*120);
                          return(
                            <tr key={m}>
                              <td style={{fontWeight:600,color:'var(--t1)'}}>{m}</td>
                              <td style={{textAlign:'right',fontWeight:700,color:v===0?'#34d399':'#f87171'}}>{v>0?'₹'+Number(v).toLocaleString('en-IN'):'✓ Nil'}</td>
                              <td style={{textAlign:'right',color:change>0?'#f87171':change<0?'#34d399':'var(--t3)',fontWeight:600}}>{change!==0?(change>0?'▲':'▼')+'₹'+Number(Math.abs(change)).toLocaleString('en-IN'):'—'}</td>
                              <td>
                                <div style={{height:6,background:'var(--b1)',borderRadius:3,width:120,overflow:'hidden'}}>
                                  <div style={{height:'100%',width:barW,background:v===0?'#34d399':'#f87171',borderRadius:3}}/>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default DealerModal;