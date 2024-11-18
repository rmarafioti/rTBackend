/*
  Warnings:

  - You are about to drop the column `paid` on the `drop` table. All the data in the column will be lost.
  - You are about to drop the column `paidDate` on the `drop` table. All the data in the column will be lost.
  - You are about to drop the column `paidMessage` on the `drop` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "paidDrop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "paidDate" DATETIME NOT NULL,
    "payee" TEXT NOT NULL,
    "paidMessage" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "drop_id" INTEGER NOT NULL,
    CONSTRAINT "paidDrop_drop_id_fkey" FOREIGN KEY ("drop_id") REFERENCES "drop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "paidNotice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "paidDate" DATETIME NOT NULL,
    "payee" TEXT NOT NULL,
    "paidMessage" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "drop_id" INTEGER NOT NULL,
    CONSTRAINT "paidNotice_drop_id_fkey" FOREIGN KEY ("drop_id") REFERENCES "drop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    CONSTRAINT "drop_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_drop" ("businessCut", "businessOwes", "date", "id", "memberCut", "memberOwes", "member_id", "total") SELECT "businessCut", "businessOwes", "date", "id", "memberCut", "memberOwes", "member_id", "total" FROM "drop";
DROP TABLE "drop";
ALTER TABLE "new_drop" RENAME TO "drop";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
