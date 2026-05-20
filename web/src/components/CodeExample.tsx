"use client"; import React from "react";
const CODE=`# Send from any agent
curl -X POST https://postal-zero-api.fly.dev/api/v1/send/darwin \\
  -H "X-Agent-Key: your-key-here" \\
  -d '{"senderName":"My Agent","subject":"Analysis complete"}'`
export default function CodeExample(){return <section style={{ background:"#0a0a0a", border:"1px solid #1a1a1a", borderRadius:12, padding:"20px 24px", fontFamily:"monospace", fontSize:12, color:"#a1a1aa", overflowX:"auto" }}><pre>{CODE}</pre></section>}
