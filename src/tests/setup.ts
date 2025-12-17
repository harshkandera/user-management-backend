// Test environment setup
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db'; // Will be overridden by mongodb-memory-server
process.env.PORT = '5555';
process.env.LOG_LEVEL = 'error';
process.env.API_VERSION = 'v1';
