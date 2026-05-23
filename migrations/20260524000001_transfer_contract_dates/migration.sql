-- Add contractStartDate and contractEndDate to transfer_records
ALTER TABLE transfer_records ADD COLUMN "contractStartDate" TIMESTAMP(3);
ALTER TABLE transfer_records ADD COLUMN "contractEndDate" TIMESTAMP(3);
