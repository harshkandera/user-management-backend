import User, { IUser } from '../models/user.model';
import { ConflictError, NotFoundError, BadRequestError } from '../middlewares/error.middleware';
import { CreateUserInput, UpdateUserInput } from '../validators/user.validator';
import PaginationHelper from '../utils/pagination';

export class UserService {
  /**
   * Create a new user
   */
  async createUser(userData: CreateUserInput): Promise<IUser> {
    // Check for existing user with same email, aadhaar, or pan
    const existingUser = await User.findOne({
      $or: [{ email: userData.email }, { aadhaar: userData.aadhaar }, { pan: userData.pan }],
    }).lean();

    if (existingUser) {
      if (existingUser.email === userData.email) {
        throw new ConflictError('Email already registered');
      }
      if (existingUser.aadhaar === userData.aadhaar) {
        throw new ConflictError('Aadhaar already registered');
      }
      if (existingUser.pan === userData.pan) {
        throw new ConflictError('PAN already registered');
      }
    }

    const user = new User(userData);
    await user.save();

    return user;
  }

  /**
   * Update an existing user
   */
  async updateUser(userId: string, updateData: UpdateUserInput): Promise<IUser> {
    // Prevent Aadhaar and PAN updates
    if ('aadhaar' in updateData || 'pan' in updateData) {
      throw new BadRequestError('Aadhaar and PAN cannot be updated');
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if soft deleted
    if (user.isDeleted) {
      throw new NotFoundError('User not found');
    }

    // If email is being updated, check for duplicates
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ email: updateData.email }).lean();
      if (existingUser) {
        throw new ConflictError('Email already registered');
      }
    }

    // Update user fields
    Object.assign(user, updateData);
    await user.save();

    return user;
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(query: any) {
    const { page, limit } = PaginationHelper.parsePaginationParams(query);
    const sort = PaginationHelper.parseSortParam(query.sort);
    const skip = PaginationHelper.calculateSkip(page, limit);

    // Execute query with pagination
    const [users, total] = await Promise.all([
      User.find().sort(sort).skip(skip).limit(limit).lean(),
      User.countDocuments(),
    ]);

    // Mask sensitive data for each user
    const maskedUsers = users.map((user) => {
      const userDoc = new User(user);
      return userDoc.maskSensitiveData();
    });

    // Generate pagination metadata
    const meta = PaginationHelper.generateMeta(page, limit, total);

    return { users: maskedUsers, meta };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user || user.isDeleted) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Soft delete a user
   */
  async softDeleteUser(userId: string): Promise<void> {
    const user = await User.findById(userId);

    if (!user || user.isDeleted) {
      throw new NotFoundError('User not found');
    }

    user.isDeleted = true;
    await user.save();
  }

  /**
   * Search users by name or email
   */
  async searchUsers(searchQuery: string, query: any) {
    const { page, limit } = PaginationHelper.parsePaginationParams(query);
    const skip = PaginationHelper.calculateSkip(page, limit);

    // Build search filter
    const searchFilter = {
      isDeleted: false,
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
      ],
    };

    // Execute query
    const [users, total] = await Promise.all([
      User.find(searchFilter).skip(skip).limit(limit).lean(),
      User.countDocuments(searchFilter),
    ]);

    // Mask sensitive data
    const maskedUsers = users.map((user) => {
      const userDoc = new User(user);
      return userDoc.maskSensitiveData();
    });

    // Generate pagination metadata
    const meta = PaginationHelper.generateMeta(page, limit, total);

    return { users: maskedUsers, meta };
  }
}

export default new UserService();
