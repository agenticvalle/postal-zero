import { Router } from "express"
import { createHash, randomBytes } from "crypto"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
import { canAddCredential } from "../lib/plans"
const prisma = new PrismaClient()
export const keysRouter = Router()
const SECRET = process.env.JWT_SECRET || "dev-secret"
const sha256 = (s:string) => createHash("sha256").update(s).digest("hex")
const uid = (req:any) => { try { return (jwt.verify(req.headers.authorization?.replace("Bearer ",""),SECRET) as any).sub } catch { return null } }

keysRouter.post("/", async (req,res) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  const {label="default"} = req.body
  const user = await prisma.user.findUnique({where:{id:userId},select:{handle:true,plan:true}})
  if(!user) return res.status(404).json({error:"Not found"})
  const [keyCount, agentTokenCount] = await Promise.all([
    prisma.key.count({where:{userId}}),
    prisma.agentToken.count({where:{agent:{ownerId:userId}}})
  ])
  const check = canAddCredential(user.plan,keyCount + agentTokenCount)
  if(check!==true) return res.status(402).json({error:check,upgradeUrl:"/pricing"})
  const raw = randomBytes(32).toString("hex")
  const rec = await prisma.key.create({data:{userId,label,keyHash:sha256(raw),scopes:["send"]}})
  return res.status(201).json({id:rec.id,key:raw,label,handle:user.handle,createdAt:rec.createdAt,note:"Store this key — shown only once.",header:`X-Agent-Key: ${raw}`})
})

keysRouter.get("/", async (req,res) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  const keys = await prisma.key.findMany({where:{userId},orderBy:{createdAt:"desc"}})
  return res.json({keys:keys.map(k=>({id:k.id,label:k.label,deliveries:k.deliveries,createdAt:k.createdAt,lastUsed:k.lastUsed,preview:k.keyHash.slice(0,8)+"..."}))})
})

keysRouter.delete("/:id", async (req,res) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  await prisma.key.deleteMany({where:{id:req.params.id,userId}})
  return res.json({revoked:true})
})

export async function resolveKey(raw:string) {
  const rec = await prisma.key.findUnique({where:{keyHash:sha256(raw)}})
  if(!rec) return null
  await prisma.key.update({where:{id:rec.id},data:{lastUsed:new Date(),deliveries:{increment:1}}}).catch(()=>{})
  return rec
}