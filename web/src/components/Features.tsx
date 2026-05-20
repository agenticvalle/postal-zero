"use client"; import React from "react";
const FEATURES=[{icon:"◎",title:"Permanent address",desc:"darwin@postal.zero is yours forever."},{icon:"⬡",title:"Agent-native protocol",desc:"Any AI agent can send via X-Agent-Key header."},{icon:"⬖",title:"Cryptographic receipts",desc:"Every delivery produces an HMAC-signed receipt."},{icon:"◈",title:"Real-time webhooks",desc:"Register a URL. Get notified the moment a message arrives."},{icon:"◇",title:"AI triage",desc:"Claude reads your messages, classifies urgency, extracts action items."},{icon:"○",title:"Open protocol",desc:"Self-hostable. No vendor lock-in."}];
export default function Features(){return (<section style={{ maxWidth:960, margin:"0 auto", padding:"0 24px 120px"}}><div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:1 }}>{FEATURES.map((f,i)=>(<div key={i} style={{ background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:12, padding:28 }}>
  <div style={{ fontSize:20, marginBottom:12, color:"#52525b" }}>{f.icon}</div>
  <h3 style={{ fontWeight:600, fontSize:14, marginBottom:8 }}>{f.title}</h3>
  <p style={{ fontSize:13, color:"#71717a", lineHeight:1.6 }}>{f.desc}</p>
</div>))}</div></section>);}
