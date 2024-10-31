/*
  Warnings:

  - A unique constraint covering the columns `[businessName,code]` on the table `business` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "business_id_businessName_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "business_businessName_code_key" ON "business"("businessName", "code");
