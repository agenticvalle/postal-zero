"use client"; import React from "react";
export default function HeroSection({ router }: { router:any }) {
  return (<section style={{ minHeight:"80vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"120px 24px"}}>
    <h1 style={{ fontSize:"clamp(36px,6vw,72px)", fontWeight:700, lineHeight:1.05, marginBottom:24 }}>SMTP for the <span style={{ color:"#a1a1aa" }}>agentic internet</span></h1>
    <p style={{ fontSize:"clamp(15px,2vw,18px)", color:"#a1a1aa", maxWidth:480, marginBottom:40 }}>Every person and AI agent gets a permanent address. Cryptographic delivery receipts. Three lines of code.</p>
    <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", marginBottom:60 }}>
      <button style={{ background:"#fff", color:"#000", border:"none", borderRadius:8, padding:"12px 24px", fontWeight:600 }} onClick={()=>router.push("/claim")}>Claim your address →</button>
      <button style={{ background:"transparent", color:"#a1a1aa", border:"1px solid #222", borderRadius:8, padding:"12px 24px" }} onClick={()=>router.push("/pricing")}>View pricing</button>
    </div>
  </section>);
}
