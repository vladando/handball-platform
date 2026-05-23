ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "healthStatus" TEXT NOT NULL DEFAULT 'HEALTHY';
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "rehabNote" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "rehabReturnDate" TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS "agent_notes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentId" TEXT NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "playerId" TEXT NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "agent_notes_agentId_playerId_idx" ON "agent_notes"("agentId", "playerId");

CREATE TABLE IF NOT EXISTS "agent_contracts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentId" TEXT NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "playerId" TEXT NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "clubName" TEXT NOT NULL,
  "startDate" TIMESTAMPTZ NOT NULL,
  "endDate" TIMESTAMPTZ NOT NULL,
  "salaryCents" INTEGER,
  "bonusDetails" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "agent_contracts_agentId_idx" ON "agent_contracts"("agentId");
CREATE INDEX IF NOT EXISTS "agent_contracts_playerId_idx" ON "agent_contracts"("playerId");

CREATE TABLE IF NOT EXISTS "agent_commissions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentId" TEXT NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "playerId" TEXT NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "description" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "dueDate" TIMESTAMPTZ NOT NULL,
  "paidAt" TIMESTAMPTZ,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "agent_commissions_agentId_idx" ON "agent_commissions"("agentId");

CREATE TABLE IF NOT EXISTS "transfer_records" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentId" TEXT NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "playerId" TEXT NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "fromClub" TEXT,
  "toClub" TEXT NOT NULL,
  "transferDate" TIMESTAMPTZ NOT NULL,
  "transferFeeCents" INTEGER,
  "salaryCents" INTEGER,
  "contractYears" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "transfer_records_agentId_idx" ON "transfer_records"("agentId");

CREATE TABLE IF NOT EXISTS "pitch_decks" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentId" TEXT NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL DEFAULT 'Player Pitch',
  "playerIds" TEXT NOT NULL,
  "message" TEXT,
  "expiresAt" TIMESTAMPTZ,
  "views" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "pitch_decks_agentId_idx" ON "pitch_decks"("agentId");
