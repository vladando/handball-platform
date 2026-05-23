CREATE TABLE "agent_calendar_events" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "eventAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_calendar_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agent_calendar_events_agentId_idx" ON "agent_calendar_events"("agentId");
ALTER TABLE "agent_calendar_events" ADD CONSTRAINT "agent_calendar_events_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
