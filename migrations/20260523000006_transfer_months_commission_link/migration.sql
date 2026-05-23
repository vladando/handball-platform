-- Rename contractYears -> contractMonths on transfer_records
ALTER TABLE transfer_records RENAME COLUMN "contractYears" TO "contractMonths";

-- Add linkedCommissionId to optionally link auto-created commission
ALTER TABLE transfer_records ADD COLUMN "linkedCommissionId" TEXT;
