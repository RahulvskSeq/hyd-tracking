import React, { useState } from 'react';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';

export default function LoginPage({users,onLogin,theme,toggleTheme}){
  const [uid_,setUid]=useState('');
  const [pw,setPw]=useState('');
  const [showPw,setShowPw]=useState(false);
  const [err,setErr]=useState('');
  const submit=()=>{ const u=users[uid_]; if(!u||u.pass!==pw){setErr('Wrong username or password');return;} onLogin(u); };
  const sms=Object.values(users).filter(x=>x.role==='salesman');
  return(
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:-200,right:-200,width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)',filter:'blur(40px)'}}/>
      <div style={{position:'absolute',bottom:-200,left:-200,width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%)',filter:'blur(40px)'}}/>
      <div style={{width:400,padding:'0 16px',position:'relative',zIndex:1}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontFamily:'"JetBrains Mono",monospace',fontSize:11,color:'var(--acc)',letterSpacing:4,marginBottom:10}}>▸ SALES TRACKER PRO</div>
          <div style={{fontSize:32,fontWeight:700,letterSpacing:'-0.02em'}}>Welcome back</div>
          <div style={{fontSize:13,color:'var(--t3)',marginTop:6}}>Sign in to your dashboard</div>
        </div>
        <div className="card" style={{padding:28}}>
          <div className="field">
            <label>User</label>
            <select className="sel inp" style={{padding:'10px 12px'}} value={uid_} onChange={e=>{setUid(e.target.value);setErr('');}}>
              <option value="">Choose...</option>
              <option value="admin">Admin (all data)</option>
              {sms.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Password</label>
            <div style={{position:'relative'}}>
              <input type={showPw?'text':'password'} className="inp" style={{padding:'10px 40px 10px 12px'}} value={pw} onChange={e=>{setPw(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Enter password"/>
              <button onClick={()=>setShowPw(s=>!s)} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--t3)',cursor:'pointer'}}>{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
          </div>
          {err&&<div style={{fontSize:12,color:'var(--red)',textAlign:'center',marginBottom:10}}>{err}</div>}
          <button onClick={submit} className="btnp" style={{width:'100%',padding:12,fontSize:14}}>Sign in →</button>
        </div>
        <div style={{textAlign:'center',marginTop:14}}>
          <button onClick={toggleTheme} className="btn" style={{fontSize:12,display:'inline-flex',alignItems:'center',gap:6}}>{theme==='dark'?<Sun size={13}/>:<Moon size={13}/>} Toggle theme</button>
        </div>
      </div>
    </div>
  );
}
