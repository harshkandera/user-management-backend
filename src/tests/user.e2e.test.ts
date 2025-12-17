import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../app';
import User from '../models/user.model';

let mongoServer: MongoMemoryServer;

// Test data
const validUserData = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  primaryMobile: '9876543210',
  secondaryMobile: '9876543211',
  aadhaar: '123456789012',
  pan: 'ABCDE1234F',
  dateOfBirth: '1990-01-15',
  placeOfBirth: 'Mumbai',
  currentAddress: '123 Main St, Mumbai, Maharashtra',
  permanentAddress: '456 Oak Ave, Mumbai, Maharashtra',
};

beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('User API E2E Tests', () => {
  describe('POST /api/v1/users - Create User', () => {
    it('should create a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.email).toBe(validUserData.email.toLowerCase());
      expect(response.body.data.name).toBe(validUserData.name);

      // Verify sensitive data is masked
      expect(response.body.data.aadhaar).toMatch(/^XXXX-XXXX-\d{4}$/);
      expect(response.body.data.pan).toMatch(/^XXXXX\w{4}$/);
    });

    it('should reject creation with duplicate email', async () => {
      // Create first user
      await request(app).post('/api/v1/users').send(validUserData).expect(201);

      // Try to create second user with same email
      const response = await request(app)
        .post('/api/v1/users')
        .send({ ...validUserData, aadhaar: '123456789013', pan: 'ABCDE1234G' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email already registered');
    });

    it('should reject creation with duplicate aadhaar', async () => {
      await request(app).post('/api/v1/users').send(validUserData).expect(201);

      const response = await request(app)
        .post('/api/v1/users')
        .send({ ...validUserData, email: 'different@example.com', pan: 'ABCDE1234G' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Aadhaar already registered');
    });

    it('should reject creation with duplicate PAN', async () => {
      await request(app).post('/api/v1/users').send(validUserData).expect(201);

      const response = await request(app)
        .post('/api/v1/users')
        .send({ ...validUserData, email: 'different@example.com', aadhaar: '123456789013' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('PAN already registered');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({ name: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({ ...validUserData, email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate mobile number format', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({ ...validUserData, primaryMobile: '12345' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate aadhaar format', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({ ...validUserData, aadhaar: '12345' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate PAN format', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({ ...validUserData, pan: 'INVALID' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/users/:id - Update User', () => {
    it('should update user with valid data', async () => {
      // Create user
      const createResponse = await request(app).post('/api/v1/users').send(validUserData);
      const userId = createResponse.body.data._id;

      // Update user
      const updateResponse = await request(app)
        .put(`/api/v1/users/${userId}`)
        .send({ name: 'Jane Doe', currentAddress: '789 New St' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.name).toBe('Jane Doe');
      expect(updateResponse.body.data.currentAddress).toBe('789 New St');
    });

    it('should prevent aadhaar update', async () => {
      const createResponse = await request(app).post('/api/v1/users').send(validUserData);
      const userId = createResponse.body.data._id;

      const response = await request(app)
        .put(`/api/v1/users/${userId}`)
        .send({ aadhaar: '999999999999' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Aadhaar');
    });

    it('should prevent PAN update', async () => {
      const createResponse = await request(app).post('/api/v1/users').send(validUserData);
      const userId = createResponse.body.data._id;

      const response = await request(app)
        .put(`/api/v1/users/${userId}`)
        .send({ pan: 'ZZZZZ9999Z' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('PAN');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/v1/users/${fakeId}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users - Get All Users', () => {
    it('should get all users with pagination', async () => {
      // Create multiple users
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/api/v1/users')
          .send({
            ...validUserData,
            email: `user${i}@example.com`,
            aadhaar: `12345678901${i}`,
            pan: `ABCDE123${i}F`,
          });
      }

      const response = await request(app).get('/api/v1/users?page=1&limit=10').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: 15,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should handle pagination correctly for page 2', async () => {
      // Create 15 users
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/api/v1/users')
          .send({
            ...validUserData,
            email: `user${i}@example.com`,
            aadhaar: `12345678901${i}`,
            pan: `ABCDE123${i}F`,
          });
      }

      const response = await request(app).get('/api/v1/users?page=2&limit=10').expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.meta).toMatchObject({
        page: 2,
        limit: 10,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should mask sensitive data in list response', async () => {
      await request(app).post('/api/v1/users').send(validUserData);

      const response = await request(app).get('/api/v1/users').expect(200);

      const user = response.body.data[0];
      expect(user.aadhaar).toMatch(/^XXXX-XXXX-\d{4}$/);
      expect(user.pan).toMatch(/^XXXXX\w{4}$/);
    });

    it('should exclude soft-deleted users', async () => {
      // Create user
      const createResponse = await request(app).post('/api/v1/users').send(validUserData);
      const userId = createResponse.body.data._id;

      // Soft delete
      await request(app).delete(`/api/v1/users/${userId}`);

      // Get all users
      const response = await request(app).get('/api/v1/users').expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/users/:id - Get User By ID', () => {
    it('should get user by valid ID', async () => {
      const createResponse = await request(app).post('/api/v1/users').send(validUserData);
      const userId = createResponse.body.data._id;

      const response = await request(app).get(`/api/v1/users/${userId}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(userId);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/api/v1/users/${fakeId}`).expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/users/:id - Soft Delete User', () => {
    it('should soft delete user', async () => {
      const createResponse = await request(app).post('/api/v1/users').send(validUserData);
      const userId = createResponse.body.data._id;

      const response = await request(app).delete(`/api/v1/users/${userId}`).expect(200);

      expect(response.body.success).toBe(true);

      // Verify user is soft deleted
      const user = await User.findById(userId);
      expect(user?.isDeleted).toBe(true);
    });

    it('should return 404 when deleting non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).delete(`/api/v1/users/${fakeId}`).expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/search - Search Users', () => {
    it('should search users by name', async () => {
      await request(app).post('/api/v1/users').send(validUserData);
      await request(app)
        .post('/api/v1/users')
        .send({
          ...validUserData,
          name: 'Jane Smith',
          email: 'jane@example.com',
          aadhaar: '123456789013',
          pan: 'ABCDE1234G',
        });

      const response = await request(app).get('/api/v1/users/search?q=Jane').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Jane Smith');
    });

    it('should search users by email', async () => {
      await request(app).post('/api/v1/users').send(validUserData);

      const response = await request(app)
        .get('/api/v1/users/search?q=john.doe@example.com')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return 400 if search query is missing', async () => {
      const response = await request(app).get('/api/v1/users/search').expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Server is running');
    });
  });
});
