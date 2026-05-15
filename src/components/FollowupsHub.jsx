import React from 'react';
import { Bell, CheckSquare, Square, Trash2 } from 'lucide-react';

const FollowupsHub=({notes,dealers,users,onUpdateNote,onDeleteNote,onOpenDealer})=>{
  const followups=notes.filter(n=>n.type==='followup');
  const today=new Date();today.setHours(0,0,0,0);
  const overdue=followups.filter(n=>!n.completed&&new Date(n.dueDate)<today);
  const dueToday=followups.filter(n=>!n.completed&&new Date(n.dueDate).toDateString()===new Date().toDateString());
  const upcoming=followups.filter(n=>!n.completed&&new Date(n.dueDate)>today&&new Date(n.dueDate).toDateString()!==new Date().toDateString());
  const done=followups.filter(n=>n.completed).slice(0,20);
  const dn=id=>dealers.find(d=>d.id===id)?.name||'Unknown dealer';
  const render=(list,color,label)=>list.length>0&&(
    <div className="card" style={{marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:600,color,marginBottom:12,display:'flex',alignItems:'center',gap:6}}>{label} <span style={{background:color+'22',color,padding:'1px 8px',borderRadius:8,fontSize:11}}>{list.length}</span></div>
      {list.map(n=>(
        <div key={n.id} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:'1px solid var(--b1)'}}>
          <button onClick={()=>onUpdateNote(n.id,{completed:!n.completed})} style={{background:'none',border:'none',cursor:'pointer',color:n.completed?'#34d399':'var(--t3)',flexShrink:0}}>{n.completed?<CheckSquare size={16}/>:<Square size={16}/>}</button>
          <div style={{flex:1,minWidth:0}}>
            <div className="row">
              <button onClick={()=>onOpenDealer(n.dealerId)} style={{background:'none',border:'none',color:'var(--acc)',cursor:'pointer',padding:0,fontSize:13,fontWeight:600}}>{dn(n.dealerId)}</button>
              <span className="spacer"/>
              <span style={{fontSize:11,color}}>{new Date(n.dueDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div style={{fontSize:12,color:'var(--t2)',marginTop:2,textDecoration:n.completed?'line-through':'none'}}>{n.content}</div>
            <div style={{fontSize:10,color:'var(--t3)',marginTop:2}}>by {users[n.createdBy]?.name||n.createdBy}</div>
          </div>
          <button onClick={()=>onDeleteNote(n.id)} className="btn" style={{padding:4}}><Trash2 size={11}/></button>
        </div>
      ))}
    </div>
  );
  return(
    <div className="fade">
      <div style={{marginBottom:18}}>
        <div style={{fontSize:11,color:'var(--acc)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:2}}>Action Items</div>
        <div style={{fontSize:22,fontWeight:700}}>Follow-ups & Reminders</div>
      </div>
      {followups.length===0?(<div className="card" style={{textAlign:'center',padding:50,color:'var(--t3)'}}><Bell size={36} style={{margin:'0 auto 12px',opacity:0.4}}/><div>No follow-ups yet</div><div style={{fontSize:12}}>Open any dealer and add a follow-up from the Notes tab</div></div>):(
        <>{render(overdue,'#f87171','⚠ Overdue')}{render(dueToday,'#fbbf24','🔔 Due today')}{render(upcoming,'#6366f1','📅 Upcoming')}{render(done,'#34d399','✓ Completed')}</>
      )}
    </div>
  );
};

export default FollowupsHub;
