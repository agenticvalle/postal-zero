import { Router } from "express"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
export const mailRouter = Router()
const SECRET = process.env.JWT_SECRET || "dev-secret"
const uid = (req:any) => { try { return (jwt.verify(req.headers.authorization?.replace("Bearer ",""),SECRET) as any).sub } catch { return null } }

mailRouter.get("/", async (req,res) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  const {page="1",limit="50",q} = req.query as any
  const skip=(parseInt(page)-1)*parseInt(limit)
  const where:any={
    userId,
    isTrashed:false,
    isArchived:false,
    NOT:{recipientAddress:{is:{agentId:{not:null}}}}
  }
  if(q) where.OR=[{subject:{contains:q,mode:"insensitive"}},{senderName:{contains:q,mode:"insensitive"}},{bodyPreview:{contains:q,mode:"insensitive"}}]
  const [mail,total] = await Promise.all([
    prisma.mail.findMany({where,skip,take:parseInt(limit),orderBy:{createdAt:"desc"},select:{id:true,subject:true,senderName:true,senderHandle:true,senderVerified:true,bodyPreview:true,payload:true,mailType:true,isRead:true,isStarred:true,aiSummary:true,aiUrgency:true,deliveredAt:true}}),
    prisma.mail.count({where})
  ])
  return res.json({mail,pagination:{page:parseInt(page),limit:parseInt(limit),total,pages:Math.ceil(total/parseInt(limit))}})
})

mailRouter.get("/stats", async (req,res) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  const [total,unread] = await Promise.all([
    prisma.mail.count({where:{
      userId,
      isTrashed:false,
      NOT:{recipientAddress:{is:{agentId:{not:null}}}}
    }}),
    prisma.mail.count({where:{
      userId,
      isRead:false,
      isTrashed:false,
      NOT:{recipientAddress:{is:{agentId:{not:null}}}}
    }})
  ])
  return res.json({total,unread})
})

mailRouter.get("/:id", async (req,res) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  const mail = await prisma.mail.findFirst({where:{
    id:req.params.id,
    userId,
    NOT:{recipientAddress:{is:{agentId:{not:null}}}}
  },select:{id:true,subject:true,body:true,senderName:true,senderHandle:true,senderVerified:true,mailType:true,isRead:true,isStarred:true,aiSummary:true,aiUrgency:true,deliveredAt:true,deliveryToken:true,payload:true}})
  if(!mail) return res.status(404).json({error:"Not found"})
  if(!mail.isRead) await prisma.mail.update({where:{id:mail.id},data:{isRead:true,readAt:new Date()}})
  return res.json(mail)
})

mailRouter.patch("/batch", async (req,res) => {
  const userId = uid(req)
  if(!userId) return res.status(401).json({error:"Unauthorized"})
  const {ids,action} = req.body
  const map:Record<string,any>={read:{isRead:true},unread:{isRead:false},star:{isStarred:true},unstar:{isStarred:false},archive:{isArchived:true},trash:{isTrashed:true},restore:{isTrashed:false,isArchived:false}}
  if(!map[action]) return res.status(400).json({error:"Invalid action"})
  await prisma.mail.updateMany({where:{
    id:{in:ids},
    userId,
    NOT:{recipientAddress:{is:{agentId:{not:null}}}}
  },data:map[action]})
  return res.json({updated:ids.length})
})