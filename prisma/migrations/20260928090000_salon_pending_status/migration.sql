-- A new enum value has to be committed before another statement may use it,
-- so the new default for Salon.status is set in the next migration.
ALTER TYPE "SalonStatus" ADD VALUE IF NOT EXISTS 'PENDING';
