-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "arrivedAt" TIMESTAMPTZ;
ALTER TABLE "Appointment" ADD COLUMN "completedAt" TIMESTAMPTZ;
ALTER TABLE "Appointment" ADD COLUMN "voucherIssuedAt" TIMESTAMPTZ;
ALTER TABLE "Appointment" ADD COLUMN "voucherRedeemedAt" TIMESTAMPTZ;
