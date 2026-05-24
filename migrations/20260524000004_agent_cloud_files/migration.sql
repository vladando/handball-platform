CREATE TABLE "agent_cloud_files" (
  "id"           TEXT NOT NULL,
  "agentId"      TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "url"          TEXT NOT NULL,
  "size"         INTEGER,
  "mimeType"     TEXT,
  "category"     TEXT NOT NULL DEFAULT 'other',
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_cloud_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agent_cloud_files_agentId_idx" ON "agent_cloud_files"("agentId");

ALTER TABLE "agent_cloud_files"
  ADD CONSTRAINT "agent_cloud_files_agentId_fkey"
  FOREIGN KEY ("agentId")
  REFERENCES "agents"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
