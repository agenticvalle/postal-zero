ALTER TABLE "Mail"
ADD COLUMN "recipientAddressId" TEXT;

UPDATE "Mail" AS m
SET "recipientAddressId" = a."id"
FROM "Address" AS a
WHERE a."userId" = m."userId";

CREATE INDEX "Mail_recipientAddressId_idx"
ON "Mail"("recipientAddressId");

ALTER TABLE "Mail"
ADD CONSTRAINT "Mail_recipientAddressId_fkey"
FOREIGN KEY ("recipientAddressId")
REFERENCES "Address"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
