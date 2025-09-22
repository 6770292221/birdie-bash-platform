import type { NextFunction, Request, Response } from 'express';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

interface ErrorDetails {
  [key: string]: any;
}

interface AppErrorLike extends Error {
  statusCode?: number;
  code?: string;
  details?: ErrorDetails;
}

export function errorHandler(err: AppErrorLike, req: Request, res: Response, _next: NextFunction) {
  // Prisma: Invalid ID format (P2025 - Record not found, often due to invalid ID)
  if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
    return res.status(404).json({
      code: 'RECORD_NOT_FOUND',
      message: 'Record not found',
      details: { field: 'id', reason: 'Invalid ID or record does not exist' }
    });
  }

  // Prisma: Unique constraint violation (P2002)
  if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = (err.meta?.target as string[]) || ['field'];
    return res.status(400).json({
      code: 'DUPLICATE_ENTRY',
      message: `Duplicate entry for ${target.join(', ')}`,
      details: { fields: target }
    });
  }

  // Prisma: Foreign key constraint violation (P2003)
  if (err instanceof PrismaClientKnownRequestError && err.code === 'P2003') {
    return res.status(400).json({
      code: 'FOREIGN_KEY_CONSTRAINT',
      message: 'Foreign key constraint violation',
      details: { field: err.meta?.field_name }
    });
  }

  // Prisma: Validation errors
  if (err instanceof PrismaClientValidationError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid data provided',
      details: { reason: 'Data validation failed' }
    });
  }

  // Payment processing errors
  if (err.code === 'PAYMENT_PROCESSING_ERROR') {
    return res.status(400).json({
      code: 'PAYMENT_PROCESSING_ERROR',
      message: 'Payment processing failed',
      details: { reason: err.message }
    });
  }

  if (err.code === 'PAYMENT_NOT_FOUND') {
    return res.status(404).json({
      code: 'PAYMENT_NOT_FOUND',
      message: 'Payment not found',
      details: { reason: err.message }
    });
  }

  // Custom application error format passthrough
  if (err.code && err.statusCode) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  // Default
  console.error('Payment Service - Unhandled error:', err);
  return res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
  });
}