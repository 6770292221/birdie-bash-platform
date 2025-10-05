/*
  Warnings:

  - You are about to alter the column `status` on the `payment` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(2))` to `VarChar(32)`.
  - You are about to alter the column `status` on the `payment_transaction` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `VarChar(32)`.

*/
-- AlterTable
ALTER TABLE `payment` MODIFY `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `payment_transaction` MODIFY `status` VARCHAR(32) NOT NULL;
