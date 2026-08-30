CREATE TABLE "AgentToken" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'default',
    "tokenHash" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY['send']::TEXT[],
    "deliveries" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentToken_tokenHash_key"
ON "AgentToken"("tokenHash");

CREATE INDEX "AgentToken_agentId_idx"
ON "AgentToken"("agentId");

CREATE INDEX "AgentToken_tokenHash_idx"
ON "AgentToken"("tokenHash");

ALTER TABLE "AgentToken"
ADD CONSTRAINT "AgentToken_agentId_fkey"
FOREIGN KEY ("agentId")
REFERENCES "Agent"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
