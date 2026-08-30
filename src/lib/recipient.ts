import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function resolveRecipient(handle: string) {
  const address = await prisma.address.findUnique({
    where: { handle },
    include: {
      user: {
        select: {
          id: true,
          displayName: true
        }
      },
      agent: {
        select: {
          id: true,
          ownerId: true,
          displayName: true,
          status: true
        }
      }
    }
  })

  if (!address) return null

  if (address.user) {
    return {
      addressId: address.id,
      handle: address.handle,
      recipientType: "USER" as const,
      recipientId: address.user.id,
      custodyUserId: address.user.id,
      displayName: address.user.displayName
    }
  }

  if (address.agent) {
    if (address.agent.status === "SUSPENDED") return null

    return {
      addressId: address.id,
      handle: address.handle,
      recipientType: "AGENT" as const,
      recipientId: address.agent.id,
      custodyUserId: address.agent.ownerId,
      displayName: address.agent.displayName
    }
  }

  return null
}
