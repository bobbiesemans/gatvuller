-- The cancellation window is part of what the customer agreed to, so it is stored on the booking.
ALTER TABLE "Booking" ADD COLUMN "cancellationHours" INTEGER;

-- Existing bookings keep the window their salon has today.
UPDATE "Booking" b
SET "cancellationHours" = s."cancellationHours"
FROM "Slot" sl
JOIN "Salon" s ON s."id" = sl."salonId"
WHERE b."slotId" = sl."id" AND b."cancellationHours" IS NULL;
