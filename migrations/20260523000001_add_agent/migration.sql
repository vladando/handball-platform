-- Add AGENT to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AGENT';

-- Create agents table
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "country" TEXT,
    "licenseNumber" TEXT,
    "slug" TEXT NOT NULL,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
CREATE UNIQUE INDEX "agents_userId_key" ON "agents"("userId");
CREATE UNIQUE INDEX "agents_slug_key" ON "agents"("slug");

-- Add foreign key from agents to users
ALTER TABLE "agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add agentId column to players
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "agentId" TEXT;

-- Add foreign key from players to agents
ALTER TABLE "players" ADD CONSTRAINT "players_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index on agentId
CREATE INDEX IF NOT EXISTS "players_agentId_idx" ON "players"("agentId");
