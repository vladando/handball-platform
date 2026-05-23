-- CreateTable: representation_requests
CREATE TABLE "representation_requests" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    CONSTRAINT "representation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "representation_requests_agentId_playerId_key" ON "representation_requests"("agentId", "playerId");
CREATE INDEX "representation_requests_agentId_idx" ON "representation_requests"("agentId");
CREATE INDEX "representation_requests_playerId_idx" ON "representation_requests"("playerId");

-- AddForeignKey
ALTER TABLE "representation_requests" ADD CONSTRAINT "representation_requests_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "representation_requests" ADD CONSTRAINT "representation_requests_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
