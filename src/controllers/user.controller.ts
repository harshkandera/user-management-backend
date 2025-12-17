import { Request, Response } from 'express';
import userService from '../services/user.service';
import ApiResponse from '../utils/apiResponse';
import { asyncHandler } from '../middlewares/error.middleware';

export class UserController {
  /**
   * Create a new user
   * POST /api/v1/users
   */
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.createUser(req.body);

    // Mask sensitive data before sending response
    const maskedUser = user.maskSensitiveData();

    return ApiResponse.created(res, maskedUser, 'User created successfully');
  });

  /**
   * Update a user
   * PUT /api/v1/users/:id
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await userService.updateUser(id, req.body);

    // Mask sensitive data before sending response
    const maskedUser = user.maskSensitiveData();

    return ApiResponse.success(res, maskedUser, 'User updated successfully');
  });

  /**
   * Get all users with pagination
   * GET /api/v1/users?page=1&limit=10&sort=createdAt
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const { users, meta } = await userService.getAllUsers(req.query);

    return ApiResponse.successWithMeta(res, users, meta, 'Users retrieved successfully');
  });

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    // Mask sensitive data before sending response
    const maskedUser = user.maskSensitiveData();

    return ApiResponse.success(res, maskedUser, 'User retrieved successfully');
  });

  /**
   * Soft delete a user
   * DELETE /api/v1/users/:id
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await userService.softDeleteUser(id);

    return ApiResponse.success(res, null, 'User deleted successfully');
  });

  /**
   * Search users
   * GET /api/v1/users/search?q=searchTerm&page=1&limit=10
   */
  searchUsers = asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return ApiResponse.error(res, 'Search query is required', 400);
    }

    const { users, meta } = await userService.searchUsers(q, req.query);

    return ApiResponse.successWithMeta(res, users, meta, 'Search results retrieved successfully');
  });
}

export default new UserController();
