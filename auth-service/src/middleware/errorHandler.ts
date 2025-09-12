import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

interface ErrorDetails {
  [key: string]: any;
}

interface AppErrorLike extends Error {
  statusCode?: number;
  code?: string;
  details?: ErrorDetails;
}

export function errorHandler(err: AppErrorLike, req: Request, res: Response, _next: NextFunction) {
  // Mongoose: invalid ObjectId
  if (err instanceof mongoose.Error.CastError && err.kind === 'ObjectId') {
    return res.status(400).json({
      code: 'INVALID_ID',
      message: `Invalid ID format for '${err.path}'`,
      details: { field: err.path, value: err.value }
    });
  }

  // Mongoose validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    // Pick first field error for concise response
    const firstKey = Object.keys(err.errors)[0];
    const ve: any = (firstKey && (err.errors as any)[firstKey]) || err;

    // Try to infer constraints for common validators
    const details: ErrorDetails = { field: firstKey };
    if (ve?.kind === 'min' || ve?.properties?.min != null) {
      details.min = ve?.properties?.min ?? ve?.min;
    }
    if (ve?.kind === 'enum' || ve?.properties?.enumValues) {
      details.allowed = ve?.properties?.enumValues;
    }

    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: ve?.message || 'Validation failed',
      details,
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
  console.error('Unhandled error:', err);
  return res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
  });
}
