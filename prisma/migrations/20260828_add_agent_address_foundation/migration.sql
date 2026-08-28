CREATE TYPE "AgentStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'SUSPENDED');

CREATE TABLE "Agent" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL DEFAULT '',
  "status" "AgentStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Address" (
  "id" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "userId" TEXT,
  "agentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Address_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Address_exactly_one_actor" CHECK (
    ("userId" IS NOT NULL AND "agentId" IS NULL) OR
    ("userId" IS NULL AND "agentId" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "Address_handle_key" ON "Address"("handle");
CREATE UNIQUE INDEX "Address_userId_key" ON "Address"("userId");
CREATE UNIQUE INDEX "Address_agentId_key" ON "Address"("agentId");
CREATE INDEX "Agent_ownerId_idx" ON "Agent"("ownerId");

ALTER TABLE "Agent" ADD CONSTRAINT "Agent_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Address" ADD CONSTRAINT "Address_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Address" ("id", "handle", "userId", "createdAt")
SELECT "id", "handle", "id", CURRENT_TIMESTAMP
FROM "User";
