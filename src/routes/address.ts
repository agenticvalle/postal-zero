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
addressRouter.get("/search", async (req, res) => {
  try {
    const q = (req.query.q as string || "").toLowerCase().trim()
    if (!q || q.length < 2) return res.json({ results: [] })
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { handle: { contains: q } },
          { displayName: { contains: q, mode: "insensitive" } }
        ]
      },
      select: { handle: true, displayName: true, identityType: true },
      take: 10
    })
    return res.json({
      results: users.map(u => ({
        handle: u.handle,
        displayName: u.displayName,
        identityType: u.identityType,
        address: `${u.handle}@postal.zero`
      }))
    })
  } catch (e: any) { return res.status(500).json({ error: e.message }) }
})
