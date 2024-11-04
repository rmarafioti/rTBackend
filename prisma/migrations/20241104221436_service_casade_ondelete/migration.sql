-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_service" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "drop_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "cash" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "giftCertAmount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "service_drop_id_fkey" FOREIGN KEY ("drop_id") REFERENCES "drop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_service" ("cash", "credit", "deposit", "description", "drop_id", "giftCertAmount", "id") SELECT "cash", "credit", "deposit", "description", "drop_id", "giftCertAmount", "id" FROM "service";
DROP TABLE "service";
ALTER TABLE "new_service" RENAME TO "service";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
