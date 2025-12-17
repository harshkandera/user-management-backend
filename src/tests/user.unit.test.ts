import { UserService } from '../services/user.service';
import User from '../models/user.model';
import { ConflictError, NotFoundError, BadRequestError } from '../middlewares/error.middleware';

// Mock the User model
jest.mock('../models/user.model');

const MockedUser = User as jest.Mocked<typeof User>;

describe('UserService Unit Tests', () => {
  let userService: UserService;

  const mockUserData = {
    name: 'Test User',
    email: 'test@example.com',
    primaryMobile: '9876543210',
    aadhaar: '123456789012',
    pan: 'ABCDE1234F',
    dateOfBirth: new Date('1990-01-01'),
    placeOfBirth: 'Mumbai',
    currentAddress: '123 Test St',
    permanentAddress: '456 Test Ave',
  };

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    ...mockUserData,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0,
    save: jest.fn(),
    maskSensitiveData: jest.fn(() => ({ ...mockUserData, _id: '507f1f77bcf86cd799439011' })),
  };

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      MockedUser.findOne = jest.fn().mockResolvedValue(null);
      MockedUser.prototype.save = jest.fn().mockResolvedValue(mockUser);

      const result = await userService.createUser(mockUserData);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        $or: [
          { email: mockUserData.email },
          { aadhaar: mockUserData.aadhaar },
          { pan: mockUserData.pan },
        ],
      });
      expect(result).toBeDefined();
    });

    it('should throw ConflictError if email already exists', async () => {
      MockedUser.findOne = jest.fn().mockResolvedValue({ ...mockUser, email: mockUserData.email });

      await expect(userService.createUser(mockUserData)).rejects.toThrow(ConflictError);
      await expect(userService.createUser(mockUserData)).rejects.toThrow('Email already registered');
    });

    it('should throw ConflictError if aadhaar already exists', async () => {
      MockedUser.findOne = jest
        .fn()
        .mockResolvedValue({ ...mockUser, aadhaar: mockUserData.aadhaar });

      await expect(userService.createUser(mockUserData)).rejects.toThrow(ConflictError);
      await expect(userService.createUser(mockUserData)).rejects.toThrow(
        'Aadhaar already registered',
      );
    });

    it('should throw ConflictError if PAN already exists', async () => {
      MockedUser.findOne = jest.fn().mockResolvedValue({ ...mockUser, pan: mockUserData.pan });

      await expect(userService.createUser(mockUserData)).rejects.toThrow(ConflictError);
      await expect(userService.createUser(mockUserData)).rejects.toThrow('PAN already registered');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updatedMockUser = { ...mockUser, name: 'Updated Name' };
      MockedUser.findById = jest.fn().mockResolvedValue(updatedMockUser);

      const updateData = { name: 'Updated Name' };
      const result = await userService.updateUser('507f1f77bcf86cd799439011', updateData);

      expect(MockedUser.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result.name).toBe('Updated Name');
    });

    it('should throw BadRequestError when trying to update aadhaar', async () => {
      const updateData = { aadhaar: '999999999999' };

      await expect(
        userService.updateUser('507f1f77bcf86cd799439011', updateData as any),
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError when trying to update PAN', async () => {
      const updateData = { pan: 'ZZZZZ9999Z' };

      await expect(
        userService.updateUser('507f1f77bcf86cd799439011', updateData as any),
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError if user does not exist', async () => {
      MockedUser.findById = jest.fn().mockResolvedValue(null);

      await expect(userService.updateUser('507f1f77bcf86cd799439011', {})).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw NotFoundError if user is soft deleted', async () => {
      MockedUser.findById = jest.fn().mockResolvedValue({ ...mockUser, isDeleted: true });

      await expect(userService.updateUser('507f1f77bcf86cd799439011', {})).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [mockUser, { ...mockUser, _id: '507f1f77bcf86cd799439012' }];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      };

      (MockedUser.find as any) = jest.fn().mockReturnValue(mockQuery);
      MockedUser.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await userService.getAllUsers({ page: '1', limit: '10' });

      expect(result.users).toHaveLength(2);
      expect(result.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
        hasNext: false,
        hasPrev: false,
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      MockedUser.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await userService.getUserById('507f1f77bcf86cd799439011');

      expect(MockedUser.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundError if user does not exist', async () => {
      MockedUser.findById = jest.fn().mockResolvedValue(null);

      await expect(userService.getUserById('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('softDeleteUser', () => {
    it('should soft delete user successfully', async () => {
      MockedUser.findById = jest.fn().mockResolvedValue(mockUser);

      await userService.softDeleteUser('507f1f77bcf86cd799439011');

      expect(mockUser.isDeleted).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw NotFoundError if user does not exist', async () => {
      MockedUser.findById = jest.fn().mockResolvedValue(null);

      await expect(userService.softDeleteUser('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const mockUsers = [mockUser];

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      };

      (MockedUser.find as any) = jest.fn().mockReturnValue(mockQuery);
      MockedUser.countDocuments = jest.fn().mockResolvedValue(1);

      const result = await userService.searchUsers('test', { page: '1', limit: '10' });

      expect(result.users).toHaveLength(1);
      expect(MockedUser.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: false,
          $or: expect.any(Array),
        }),
      );
    });
  });
});
