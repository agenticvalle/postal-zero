import { Router } from "express"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
export const addressRouter = Router()
const RESERVED = ["admin","api","support","postmaster","abuse","noreply","root","system","agent"]

addressRouter.get("/check/:handle", async (req,res) => {
  const handle = req.params.handle.toLowerCase()
  if(!/^[a-z0-9_-]{3,32}$/.test(handle)) return res.json({available:false,reason:"Invalid format"})
  if(RESERVED.includes(handle)) return res.json({available:false,reason:"Reserved handle"})
  const user = await prisma.user.findUnique({where:{handle},select:{id:true}})
  return res.json({available:!user,handle})
})