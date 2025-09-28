/*
  Warnings:

  - The values [REFUNDED,PARTIALLY_REFUNDED] on the enum `payment_transaction_status` will be removed. If these variants are still used in the database, this will fail.
  - The values [refund,authorization] on the enum `payment_transaction_type` will be removed. If these variants are still used in the database, this will fail.
  - The values [REFUNDED,PARTIALLY_REFUNDED] on the enum `payment_transaction_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `payment` MODIFY `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `payment_transaction` MODIFY `type` ENUM('charge') NOT NULL,
    MODIFY `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL;
