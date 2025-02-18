-- CreateTable
CREATE TABLE "owner" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "takeHomeTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business" (
    "id" SERIAL NOT NULL,
    "businessName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "owner_id" INTEGER NOT NULL,

    CONSTRAINT "business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL DEFAULT 60,
    "takeHomeTotal" INTEGER NOT NULL DEFAULT 0,
    "totalOwe" INTEGER NOT NULL DEFAULT 0,
    "totalOwed" INTEGER NOT NULL DEFAULT 0,
    "business_id" INTEGER,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "total" INTEGER NOT NULL DEFAULT 0,
    "memberCut" INTEGER NOT NULL DEFAULT 0,
    "businessCut" INTEGER NOT NULL DEFAULT 0,
    "memberOwes" INTEGER NOT NULL DEFAULT 0,
    "businessOwes" INTEGER NOT NULL DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidDrop_id" INTEGER,
    "paidNotice_id" INTEGER,

    CONSTRAINT "drop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paidDrop" (
    "id" SERIAL NOT NULL,
    "paidDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payee" TEXT NOT NULL,
    "paidMessage" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "paidDrop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paidNotice" (
    "id" SERIAL NOT NULL,
    "paidDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payee" TEXT NOT NULL,
    "paidMessage" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "paidNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service" (
    "id" SERIAL NOT NULL,
    "drop_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "cash" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "giftCertAmount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "service_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop" ADD CONSTRAINT "drop_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop" ADD CONSTRAINT "drop_paidDrop_id_fkey" FOREIGN KEY ("paidDrop_id") REFERENCES "paidDrop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop" ADD CONSTRAINT "drop_paidNotice_id_fkey" FOREIGN KEY ("paidNotice_id") REFERENCES "paidNotice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service" ADD CONSTRAINT "service_drop_id_fkey" FOREIGN KEY ("drop_id") REFERENCES "drop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
