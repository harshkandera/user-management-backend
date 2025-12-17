import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middlewares/error.middleware';

// Create User Schema
export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  primaryMobile: z.string().regex(/^[0-9]{10}$/, 'Primary mobile must be a 10-digit number'),
  secondaryMobile: z
    .string()
    .regex(/^[0-9]{10}$/, 'Secondary mobile must be a 10-digit number')
    .optional(),
  aadhaar: z.string().regex(/^[0-9]{12}$/, 'Aadhaar must be a 12-digit number'),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g., ABCDE1234F)')
    .toUpperCase(),
  dateOfBirth: z
    .string()
    .or(z.date())
    .refine(
      (val) => {
        const date = new Date(val);
        return date < new Date() && !isNaN(date.getTime());
      },
      { message: 'Date of birth must be a valid date in the past' },
    )
    .transform((val) => new Date(val)),
  placeOfBirth: z.string().min(1, 'Place of birth is required').trim(),
  currentAddress: z.string().min(1, 'Current address is required').trim(),
  permanentAddress: z.string().min(1, 'Permanent address is required').trim(),
});

// Update User Schema - Partial updates allowed BUT Aadhaar and PAN cannot be updated
export const updateUserSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters')
      .trim()
      .optional(),
    email: z.string().email('Invalid email format').toLowerCase().trim().optional(),
    primaryMobile: z
      .string()
      .regex(/^[0-9]{10}$/, 'Primary mobile must be a 10-digit number')
      .optional(),
    secondaryMobile: z
      .string()
      .regex(/^[0-9]{10}$/, 'Secondary mobile must be a 10-digit number')
      .optional(),
    dateOfBirth: z
      .string()
      .or(z.date())
      .refine(
        (val) => {
          const date = new Date(val);
          return date < new Date() && !isNaN(date.getTime());
        },
        { message: 'Date of birth must be a valid date in the past' },
      )
      .transform((val) => new Date(val))
      .optional(),
    placeOfBirth: z.string().min(1, 'Place of birth is required').trim().optional(),
    currentAddress: z.string().min(1, 'Current address is required').trim().optional(),
    permanentAddress: z.string().min(1, 'Permanent address is required').trim().optional(),
    // Explicitly prevent Aadhaar and PAN updates
    aadhaar: z.never().optional(),
    pan: z.never().optional(),
  })
  .strict(); // Reject unknown fields

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Validation middleware factory
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Reject Aadhaar or PAN in update requests
      if (req.method === 'PUT' && (req.body.aadhaar || req.body.pan)) {
        throw new ValidationError('Aadhaar and PAN cannot be updated after creation');
      }

      schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default {
  createUserSchema,
  updateUserSchema,
  validate,
};
