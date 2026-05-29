import { Router } from "express"
import { rateLimit } from "express-rate-limit"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"

const loginLimit = rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: "Too many attempts. Try again in 15 minutes." } })
const registerLimit = rateLimit({ windowMs: 60*60*1000, max: 50, message: { error: "Too many registrations from this IP." } })
const prisma = new PrismaClient()
export const authRouter = Router()
const SECRET = process.env.JWT_SECRET || "dev-secret"
const sign = (id:string) => jwt.sign({sub:id}, SECRET, {expiresIn:"8h"})
const signR = (id:string) => jwt.sign({sub:id,typ:"refresh"}, SECRET, {expiresIn:"30d"})

authRouter.post("/register", registerLimit, async (req,res) => {
  try {
    const { password, handle, displayName } = req.body
    const email = (req.body.email || "").toLowerCase().trim()
    if(!email||!password||!handle||!displayName) return res.status(400).json({error:"All fields required"})
    if(!/^[a-z0-9_-]{3,32}$/.test(handle)) return res.status(400).json({error:"Invalid handle"})
    const clash = await prisma.user.findFirst({where:{OR:[{email},{handle}]}})
    if(clash) return res.status(409).json({error:"Email or handle taken"})
    const passwordHash = await bcrypt.hash(password,12)
    const user = await prisma.user.create({data:{email,passwordHash,handle,displayName}})
    const accessToken = sign(user.id)
    const refreshToken = signR(user.id)
    await prisma.session.create({data:{userId:user.id,refreshToken,expiresAt:new Date(Date.now()+30*86400000)}})
    return res.status(201).json({accessToken,refreshToken,user:{id:user.id,email,handle,displayName,address:`${handle}@postal.zero`,plan:user.plan}})
  } catch(e:any){return res.status(500).json({error:e.message})}
})

authRouter.post("/login", loginLimit, async (req,res) => {
  try {
    const { password } = req.body
    const email = (req.body.email || "").toLowerCase().trim()
    const user = await prisma.user.findUnique({where:{email}})
    if(!user||!await bcrypt.compare(password,user.passwordHash)) return res.status(401).json({error:"Invalid credentials"})
    const accessToken = sign(user.id)
    const refreshToken = signR(user.id)
    await prisma.session.create({data:{userId:user.id,refreshToken,expiresAt:new Date(Date.now()+30*86400000)}})
    return res.json({accessToken,refreshToken,user:{id:user.id,email:user.email,handle:user.handle,displayName:user.displayName,address:`${user.handle}@postal.zero`,plan:user.plan}})
  } catch(e:any){return res.status(500).json({error:e.message})}
})

authRouter.get("/me", async (req,res) => {
  try {
    const tok = req.headers.authorization?.replace("Bearer ","")
    if(!tok) return res.status(401).json({error:"Unauthorized"})
    const p = jwt.verify(tok,SECRET) as any
    const user = await prisma.user.findUnique({where:{id:p.sub}})
    if(!user) return res.status(404).json({error:"Not found"})
    return res.json({id:user.id,email:user.email,handle:user.handle,displayName:user.displayName,address:`${user.handle}@postal.zero`,plan:user.plan,messagesThisMonth:user.messagesThisMonth})
  } catch{return res.status(401).json({error:"Invalid token"})}
})

authRouter.post("/logout", async (req,res) => {
  const {refreshToken} = req.body
  if(refreshToken) await prisma.session.deleteMany({where:{refreshToken}}).catch(()=>{})
  return res.json({ok:true})
})
authRouter.post("/temp-password", async (req, res) => {
  try {
    const { handle } = req.body
    if (!handle) return res.status(400).json({ error: "Handle required" })
    
    const user = await prisma.user.findUnique({ where: { handle: handle.toLowerCase() } })
    if (!user) return res.status(404).json({ error: "Handle not found" })
    
    // Generate 8 char temp password
    const chars = "abcdefghjkmnpqrstuvwxyz23456789"
    let tempPass = ""
    for (let i = 0; i < 8; i++) tempPass += chars[Math.floor(Math.random() * chars.length)]
    
    const hash = await bcrypt.hash(tempPass, 12)
    await prisma.user.update({ where: { handle: handle.toLowerCase() }, data: { passwordHash: hash } })
    
    return res.json({ ok: true, tempPassword: tempPass, handle: handle.toLowerCase() })
  } catch (e: any) { return res.status(500).json({ error: e.message }) }
})
