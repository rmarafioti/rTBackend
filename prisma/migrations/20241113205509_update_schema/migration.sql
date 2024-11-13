-- CreateTable
CREATE TABLE "owner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "takeHomeTotal" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "business" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "businessName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "owner_id" INTEGER NOT NULL,
    CONSTRAINT "business_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "member" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL DEFAULT 60,
    "takeHomeTotal" INTEGER NOT NULL DEFAULT 0,
    "totalOwe" INTEGER NOT NULL DEFAULT 0,
    "totalOwed" INTEGER NOT NULL DEFAULT 0,
    "business_id" INTEGER,
    CONSTRAINT "member_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "drop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "member_id" INTEGER NOT NULL,
    "date" DATETIME,
    "total" INTEGER NOT NULL DEFAULT 0,
    "memberCut" INTEGER NOT NULL DEFAULT 0,
    "businessCut" INTEGER NOT NULL DEFAULT 0,
    "memberOwes" INTEGER NOT NULL DEFAULT 0,
    "businessOwes" INTEGER NOT NULL DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" DATETIME,
    "paidMessage" TEXT,
    CONSTRAINT "drop_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "service" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "drop_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "cash" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "giftCertAmount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "service_drop_id_fkey" FOREIGN KEY ("drop_id") REFERENCES "drop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_username_key" ON "owner"("username");

-- CreateIndex
CREATE UNIQUE INDEX "business_businessName_key" ON "business"("businessName");

-- CreateIndex
CREATE UNIQUE INDEX "business_code_key" ON "business"("code");

-- CreateIndex
CREATE UNIQUE INDEX "business_businessName_code_key" ON "business"("businessName", "code");

-- CreateIndex
CREATE UNIQUE INDEX "member_username_key" ON "member"("username");
