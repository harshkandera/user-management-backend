import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Error as MongooseError } from 'mongoose';
import logger from '../utils/logger';

// Custom error classes
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(400, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(409, message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(400, message);
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  const errors: any[] = [];

  // Handle known error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof ZodError) {
    // Zod validation errors
    statusCode = 400;
    message = 'Validation failed';
    error.errors.forEach((err) => {
      errors.push({
        field: err.path.join('.'),
        message: err.message,
      });
    });
  } else if (error instanceof MongooseError.ValidationError) {
    // Mongoose validation errors
    statusCode = 400;
    message = 'Validation failed';
    Object.keys(error.errors).forEach((key) => {
      const err = error.errors[key];
      errors.push({
        field: key,
        message: err.message,
      });
    });
  } else if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    // Duplicate key error
    statusCode = 409;
    const duplicateField = Object.keys((error as any).keyPattern)[0];
    message = `${duplicateField} already exists`;
    errors.push({
      field: duplicateField,
      message: `This ${duplicateField} is already registered`,
    });
  } else if (error.name === 'CastError') {
    // Invalid ObjectId
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // Log error
  logger.error('Error occurred', {
    requestId: req.requestId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    statusCode,
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  });
};

// Async handler wrapper  to catch errors in async route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
