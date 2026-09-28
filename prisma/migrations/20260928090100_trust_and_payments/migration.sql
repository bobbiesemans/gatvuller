-- Trust, payments and data integrity.
-- Safe on a database that already holds salons and bookings: nothing is deleted,
-- seed data is labelled as demo and ratings are recomputed from real reviews.

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('DEMO', 'TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('FAKE_OFFER', 'WRONG_PRICE', 'SALON_NO_SHOW', 'INAPPROPRIATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- A booking is a financial record: deleting a slot, salon or account must not delete it.
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_customerId_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_slotId_fkey";
ALTER TABLE "Salon" DROP CONSTRAINT "Salon_ownerId_fkey";
ALTER TABLE "Slot" DROP CONSTRAINT "Slot_salonId_fkey";

-- DropIndex
DROP INDEX "Booking_customerId_idx";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "disputedAt" TIMESTAMP(3),
ADD COLUMN     "noShowAt" TIMESTAMP(3),
ADD COLUMN     "paymentMode" "PaymentMode" NOT NULL DEFAULT 'DEMO',
ADD COLUMN     "refundStatus" "RefundStatus",
ADD COLUMN     "stripeDestination" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "verifiedVisit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: new salons wait for an admin check before they go public.
ALTER TABLE "Salon" ADD COLUMN     "businessNumber" TEXT,
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationExact" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspendedReason" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ALTER COLUMN "lat" DROP DEFAULT,
ALTER COLUMN "lng" DROP DEFAULT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "ServiceTemplate" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Slot" ADD COLUMN     "templateId" TEXT;

-- AlterTable
ALTER TABLE "SlotAlert" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "salonId" TEXT;

-- CreateTable
CREATE TABLE "SalonPhoto" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT,
    "alt" TEXT,
    "credit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "salonId" TEXT,
    "slotId" TEXT,
    "reporterId" TEXT,
    "reporterEmail" TEXT,
    "reason" "ReportReason" NOT NULL,
    "message" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalonPhoto_salonId_sortOrder_idx" ON "SalonPhoto"("salonId", "sortOrder");
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");
CREATE INDEX "StripeEvent_processedAt_idx" ON "StripeEvent"("processedAt");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX "Report_salonId_idx" ON "Report"("salonId");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "Booking_customerId_createdAt_idx" ON "Booking"("customerId", "createdAt");
CREATE INDEX "Booking_stripePaymentId_idx" ON "Booking"("stripePaymentId");
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");
CREATE INDEX "Salon_ownerId_idx" ON "Salon"("ownerId");
CREATE INDEX "Slot_status_startsAt_idx" ON "Slot"("status", "startsAt");
CREATE INDEX "SlotAlert_salonId_active_idx" ON "SlotAlert"("salonId", "active");
CREATE INDEX "User_referredById_idx" ON "User"("referredById");

-- AddForeignKey
ALTER TABLE "Salon" ADD CONSTRAINT "Salon_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalonPhoto" ADD CONSTRAINT "SalonPhoto_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SlotAlert" ADD CONSTRAINT "SlotAlert_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill ---------------------------------------------------------------

-- Seed businesses are demo data, not verified salons.
UPDATE "Salon" s
SET "isDemo" = true, "verified" = false
FROM "User" u
WHERE s."ownerId" = u."id" AND u."email" ~* '^(admin|klant|salon[0-9]*)@gatvuller\.be$';

UPDATE "Salon" SET "verifiedAt" = "updatedAt" WHERE "verified" = true AND "verifiedAt" IS NULL;

-- A rating is only what published reviews say.
UPDATE "Salon" s SET
  "ratingAvg" = COALESCE((SELECT AVG(r."rating")::float8 FROM "Review" r WHERE r."salonId" = s."id" AND r."hidden" = false), 0),
  "ratingCount" = (SELECT COUNT(*)::int FROM "Review" r WHERE r."salonId" = s."id" AND r."hidden" = false);

-- Stripe session ids carry the mode. A non-demo payment without a session is treated as real money.
UPDATE "Booking" SET "paymentMode" = 'TEST' WHERE "stripeSessionId" LIKE 'cs\_test\_%';
UPDATE "Booking" SET "paymentMode" = 'LIVE' WHERE "stripeSessionId" LIKE 'cs\_live\_%';
UPDATE "Booking" SET "paymentMode" = 'LIVE'
WHERE "stripeSessionId" IS NULL AND "stripePaymentId" IS NOT NULL AND "stripePaymentId" <> 'demo';

UPDATE "Review" r SET "verifiedVisit" = true
FROM "Booking" b
WHERE r."bookingId" = b."id" AND b."checkedInAt" IS NOT NULL;

-- Alerts from signed-in users count as confirmed. Guest alerts were never confirmed by e-mail,
-- so they stop until the address confirms.
UPDATE "SlotAlert" SET "confirmedAt" = "createdAt" WHERE "userId" IS NOT NULL AND "confirmedAt" IS NULL;
UPDATE "SlotAlert" SET "active" = false WHERE "userId" IS NULL AND "confirmedAt" IS NULL;

-- Integrity checks ---------------------------------------------------------
-- NOT VALID enforces the rule for every new or changed row straight away.
-- Existing rows are validated below; a violating legacy row leaves that one check NOT VALID
-- instead of failing the deploy.

ALTER TABLE "Slot" ADD CONSTRAINT "Slot_capacity_check" CHECK ("capacity" >= 1 AND "capacity" <= 20) NOT VALID;
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_spots_check" CHECK ("spotsLeft" >= 0 AND "spotsLeft" <= "capacity") NOT VALID;
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_price_check" CHECK ("originalPrice" > 0 AND "discountPrice" > 0 AND "discountPrice" <= "originalPrice") NOT VALID;
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_time_check" CHECK ("endsAt" > "startsAt") NOT VALID;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_amount_check" CHECK ("amount" >= 0 AND "feeAmount" >= 0 AND "feeAmount" <= "amount") NOT VALID;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_refund_check" CHECK ("refundAmount" IS NULL OR ("refundAmount" >= 0 AND "refundAmount" <= "amount")) NOT VALID;
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5) NOT VALID;
ALTER TABLE "ServiceTemplate" ADD CONSTRAINT "ServiceTemplate_values_check" CHECK ("durationMin" > 0 AND "originalPrice" > 0 AND "discountPrice" > 0 AND "discountPrice" <= "originalPrice" AND "capacity" >= 1) NOT VALID;
ALTER TABLE "OpeningHour" ADD CONSTRAINT "OpeningHour_values_check" CHECK ("weekday" BETWEEN 0 AND 6 AND "openMin" BETWEEN 0 AND 1440 AND "closeMin" BETWEEN 0 AND 1440) NOT VALID;

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conrelid::regclass::text AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'c' AND NOT convalidated AND conname IN (
      'Slot_capacity_check', 'Slot_spots_check', 'Slot_price_check', 'Slot_time_check',
      'Booking_amount_check', 'Booking_refund_check', 'Review_rating_check',
      'ServiceTemplate_values_check', 'OpeningHour_values_check'
    )
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', c.tbl, c.conname);
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'constraint % stays NOT VALID: existing rows violate it', c.conname;
    END;
  END LOOP;
END $$;
