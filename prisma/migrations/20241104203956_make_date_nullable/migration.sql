-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_drop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "member_id" INTEGER NOT NULL,
    "date" DATETIME,
    "total" INTEGER NOT NULL DEFAULT 0,
    "memberCut" INTEGER NOT NULL DEFAULT 0,
    "businessCut" INTEGER NOT NULL DEFAULT 0,
    "memberOwes" INTEGER NOT NULL DEFAULT 0,
    "businessOwes" INTEGER NOT NULL DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "drop_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_drop" ("businessCut", "businessOwes", "date", "id", "memberCut", "memberOwes", "member_id", "paid", "total") SELECT "businessCut", "businessOwes", "date", "id", "memberCut", "memberOwes", "member_id", "paid", "total" FROM "drop";
DROP TABLE "drop";
ALTER TABLE "new_drop" RENAME TO "drop";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
