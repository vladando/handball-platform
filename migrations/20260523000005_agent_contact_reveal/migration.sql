-- CreateTable: agent_contact_reveals
CREATE TABLE "agent_contact_reveals" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_contact_reveals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_contact_reveals_agentId_playerId_key" ON "agent_contact_reveals"("agentId", "playerId");
CREATE INDEX "agent_contact_reveals_agentId_idx" ON "agent_contact_reveals"("agentId");
CREATE INDEX "agent_contact_reveals_playerId_idx" ON "agent_contact_reveals"("playerId");

ALTER TABLE "agent_contact_reveals" ADD CONSTRAINT "agent_contact_reveals_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_contact_reveals" ADD CONSTRAINT "agent_contact_reveals_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
