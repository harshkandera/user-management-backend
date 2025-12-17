import { Router } from 'express';
import userController from '../controllers/user.controller';
import { validate, createUserSchema, updateUserSchema } from '../validators/user.validator';

const router = Router();

/**
 * @route   POST /api/v1/users
 * @desc    Create a new user
 * @access  Public
 */
router.post('/', validate(createUserSchema), userController.createUser);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update a user
 * @access  Public
 */
router.put('/:id', validate(updateUserSchema), userController.updateUser);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with pagination
 * @access  Public
 */
router.get('/', userController.getAllUsers);

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users by name or email
 * @access  Public
 */
router.get('/search', userController.searchUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/:id', userController.getUserById);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Soft delete a user
 * @access  Public
 */
router.delete('/:id', userController.deleteUser);

export default router;
