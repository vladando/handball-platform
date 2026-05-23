-- Add contractUrl column to players table for agent-submitted signed contracts
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "contractUrl" TEXT;
