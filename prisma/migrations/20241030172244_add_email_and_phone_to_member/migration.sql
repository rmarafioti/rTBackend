/*
  Warnings:

  - You are about to drop the `memberInfo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `business_businessName` on the `member` table. All the data in the column will be lost.
  - You are about to drop the column `business_code` on the `member` table. All the data in the column will be lost.
  - Added the required column `email` to the `member` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `member` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "memberInfo";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_member" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL DEFAULT 60,
    "takeHomeTotal" INTEGER NOT NULL DEFAULT 0,
    "totalOwe" INTEGER NOT NULL DEFAULT 0,
    "totalOwed" INTEGER NOT NULL DEFAULT 0,
    "business_id" INTEGER,
    CONSTRAINT "member_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_member" ("business_id", "id", "memberName", "password", "username") SELECT "business_id", "id", "memberName", "password", "username" FROM "member";
DROP TABLE "member";
ALTER TABLE "new_member" RENAME TO "member";
CREATE UNIQUE INDEX "member_username_key" ON "member"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
