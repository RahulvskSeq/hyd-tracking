import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CURRENT_MONTH_SHORT } from '../constants';
import { num, uid } from '../utils';

const AddDealerModal=({users,currentUser,onAdd,onClose})=>{
  const [d,setD]=useState({name:'',zone:'',status:'ACTIVE',city:'',state:'',category:'',categoryType:'',salesman:currentUser.role==='admin'?Object.keys(users).find(k=>users[k].role==='salesman')||'pranav':currentUser.id,target:0,achieved:0,creditDays:0,creditLimit:0});
  const save=()=>{
    if(!d.name.trim()){alert('Name required');return;}
    const months=Array(10).fill(0);months.push(num(d.achieved));
    onAdd({id:uid(),...d,target:num(d.target),achieved:num(d.achieved),creditDays:num(d.creditDays),creditLimit:num(d.creditLimit),city:d.city.trim(),state:d.state.trim(),category:d.category.trim(),categoryType:d.categoryType.trim(),avg6m:0,months,monthTargets:{}});
    onClose();
  };
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:480}}>
        <div style={{fontSize:17,fontWeight:700,marginBottom:16}}>Add New Dealer</div>
        <div className="g2">
          <div className="field full"><label>Dealer Name</label><input className="inp" value={d.name} onChange={e=>setD({...d,name:e.target.value})}/></div>
          <div className="field"><label>Zone</label><select className="sel inp" value={d.zone} onChange={e=>setD({...d,zone:e.target.value})}><option value="">None</option>{['ZONE 1','ZONE 2','ZONE 3'].map(z=><option key={z}>{z}</option>)}</select></div>
          <div className="field"><label>Status</label><select className="sel inp" value={d.status} onChange={e=>setD({...d,status:e.target.value})}>{['ACTIVE','ACHIVERS','KEY ACCOUNT','INACTIVE','DEAD'].map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="field"><label>City</label><input className="inp" value={d.city} onChange={e=>setD({...d,city:e.target.value})} placeholder="e.g. Bengaluru"/></div>
          <div className="field"><label>State</label><input className="inp" value={d.state} onChange={e=>setD({...d,state:e.target.value})} placeholder="e.g. Karnataka"/></div>
          <div className="field"><label>Category</label><input className="inp" value={d.category} onChange={e=>setD({...d,category:e.target.value})} placeholder="e.g. Laminate"/></div>
          <div className="field"><label>Category Type</label><input className="inp" value={d.categoryType} onChange={e=>setD({...d,categoryType:e.target.value})} placeholder="e.g. 1mm"/></div>
          {currentUser.role==='admin'&&(<div className="field full"><label>Salesman</label><select className="sel inp" value={d.salesman} onChange={e=>setD({...d,salesman:e.target.value})}>{Object.values(users).filter(u=>u.role==='salesman').map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>)}
          <div className="field"><label>{CURRENT_MONTH_SHORT} Target</label><input type="number" className="inp" value={d.target} onChange={e=>setD({...d,target:e.target.value})}/></div>
          <div className="field"><label>{CURRENT_MONTH_SHORT} Achieved</label><input type="number" className="inp" value={d.achieved} onChange={e=>setD({...d,achieved:e.target.value})}/></div>
          <div className="field"><label>Credit Days</label><input type="number" className="inp" value={d.creditDays} onChange={e=>setD({...d,creditDays:e.target.value})}/></div>
          <div className="field"><label>Credit Limit ₹</label><input type="number" className="inp" value={d.creditLimit} onChange={e=>setD({...d,creditLimit:e.target.value})}/></div>
        </div>
        <div className="row" style={{gap:8,marginTop:8}}>
          <button onClick={save} className="btnp"><Plus size={13} style={{marginRight:4}}/>Add Dealer</button>
          <button onClick={onClose} className="btn">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AddDealerModal;
