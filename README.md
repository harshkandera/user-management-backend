# Backend - User Management System

Production-grade REST API built with **Node.js**, **Express**, **TypeScript**, and **MongoDB**.

## 🏗️ Architecture

### Technology Stack

| Layer      | Technology         | Why?                                                                       |
| ---------- | ------------------ | -------------------------------------------------------------------------- |
| Runtime    | Node.js v18+       | Async I/O, large ecosystem, TypeScript support                             |
| Framework  | Express            | Minimal, flexible, battle-tested, excellent middleware ecosystem           |
| Database   | MongoDB + Mongoose | Schema flexibility, excellent performance with indexes, easy pagination    |
| Validation | Zod                | Runtime type checking, seamless TypeScript integration, composable schemas |
| Testing    | Jest + Supertest   | Industry standard, great TypeScript support, easy mocking                  |
| Logging    | Winston            | Structured logging, multiple transports, production-ready                  |

### Architecture Decisions

#### 1. **Service-Controller-Route Separation**

**Decision**: Separate business logic (services) from HTTP handling (controllers) from route definitions.

**Why?**

- **Testability**: Services can be unit tested without HTTP mocking
- **Reusability**: Service methods can be called from multiple controllers or scheduled jobs
- **Maintainability**: Clear separation of concerns makes codebase easier to navigate
- **Single Responsibility**: Each layer has one job

**Trade-offs**:

- ✅ Better organization, easier testing
- ⚠️ More boilerplate code
- ⚠️ Slight learning curve for junior developers

#### 2. **MongoDB over SQL**

**Decision**: Use MongoDB with Mongoose ODM instead of PostgreSQL/MySQL.

**Why?**

- User data has flexible fields that may evolve
- Excellent indexing support for our use case (email, aadhaar, pan, mobile)
- Easy cursor-based pagination
- JSON-native, works well with Node.js
- Fast development iteration

**Trade-offs**:

- ✅ Schema flexibility, faster development
- ⚠️ No built-in ACID transactions across collections (not needed here)
- ⚠️ Potential data duplication (acceptable for our use case)

**Alternative Considered**: PostgreSQL with TypeORM

- Would require strict migrations
- Overkill for current requirements
- **Could migrate later if needed**

#### 3. **Soft Delete Pattern**

**Decision**: Never hard-delete users; use `isDeleted` flag instead.

**Why?**

- Regulatory compliance (data retention)
- Audit trail preservation
- Ability to restore accidentally deleted data
- Maintain referential integrity

**Implementation**:

- Middleware automatically filters `isDeleted: false` on all queries
- Can be overridden when needed

#### 4. **Aadhaar & PAN Immutability**

**Decision**: Prevent updates to Aadhaar and PAN after user creation.

**Why?**

- Compliance with government regulations
- These are identity documents - shouldn't change
- Prevents fraud/tampering
- If truly needed, requires admin action (future feature)

**Implementation**:

- Validator rejects these fields in update schema
- Service layer double-checks
- Clear error messages to frontend

#### 5. **Pagination Strategy**

**Decision**: Offset-based pagination with skip/limit.

**Why?**

- Simple to implement and understand
- Works well with MongoDB
- Sufficient for current scale
- Clear metadata (hasNext, hasPrev, totalPages)

**Trade-offs**:

- ✅ Easy to implement, works for most use cases
- ⚠️ Performance degrades with very large offsets
- **Future**: Could migrate to cursor-based for scale

#### 6. **Zod over Joi**

**Decision**: Use Zod for validation instead of Joi.

**Why?**

- TypeScript-first design
- Type inference (no duplicate type definitions)
- Smaller bundle size
- Modern, actively maintained
- Can share schemas with frontend

---

## 📂 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.ts              # MongoDB connection with retry logic
│   │   └── env.ts             # Environment variable validation
│   ├── models/
│   │   └── user.model.ts      # Mongoose schema with hooks & methods
│   ├── services/
│   │   └── user.service.ts    # Business logic (create, update, delete, etc.)
│   ├── controllers/
│   │   └── user.controller.ts # HTTP handlers, thin layer
│   ├── routes/
│   │   └── user.routes.ts     # Route definitions (/api/v1/users)
│   ├── validators/
│   │   └── user.validator.ts  # Zod schemas for input validation
│   ├── middlewares/
│   │   ├── error.middleware.ts       # Global error handler
│   │   └── requestLogger.middleware.ts # Request ID & latency tracking
│   ├── utils/
│   │   ├── logger.ts           # Winston configuration
│   │   ├── apiResponse.ts      # Standardized response builder
│   │   └── pagination.ts       # Pagination helpers
│   ├── tests/
│   │   ├── user.unit.test.ts   # Service layer unit tests
│   │   └── user.e2e.test.ts    # API integration tests
│   ├── app.ts                  # Express app setup
│   └── server.ts               # Server initialization & graceful shutdown
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

---

## 🔌 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Endpoints

#### 1. Create User

```http
POST /users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "primaryMobile": "9876543210",
  "secondaryMobile": "9876543211",  // Optional
  "aadhaar": "123456789012",
  "pan": "ABCDE1234F",
  "dateOfBirth": "1990-01-15",
  "placeOfBirth": "Mumbai",
  "currentAddress": "123 Main St, Mumbai",
  "permanentAddress": "456 Oak Ave, Mumbai"
}
```

**Response**: `201 Created`

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "aadhaar": "XXXX-XXXX-9012",  // Masked
    "pan": "XXXXX1234F",           // Masked
    ...
  }
}
```

**Validation Errors**: `400 Bad Request`

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Duplicate Error**: `409 Conflict`

```json
{
  "success": false,
  "message": "Email already registered"
}
```

#### 2. Get All Users (Paginated)

```http
GET /users?page=1&limit=10&sort=-createdAt
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [...],  // Array of users with masked data
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### 3. Get User by ID

```http
GET /users/:id
```

**Response**: `200 OK` or `404 Not Found`

#### 4. Update User

```http
PUT /users/:id
Content-Type: application/json

{
  "name": "Jane Doe",
  "currentAddress": "789 New St"
}
```

**Note**: Aadhaar and PAN **cannot** be updated.

**Response**: `200 OK`

#### 5. Delete User (Soft Delete)

```http
DELETE /users/:id
```

**Response**: `200 OK`

```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

#### 6. Search Users

```http
GET /users/search?q=john&page=1&limit=10
```

Searches in `name` and `email` fields (case-insensitive).

**Response**: `200 OK` (same format as Get All Users)

---

## 🧪 Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Only E2E tests
npm run test:e2e
```

### Test Coverage

| Type       | Coverage             | Files               |
| ---------- | -------------------- | ------------------- |
| Unit Tests | Services, Validators | `user.unit.test.ts` |
| E2E Tests  | Full API flows       | `user.e2e.test.ts`  |

### Testing Strategy

1. **Unit Tests** (Fast, isolated)
   - Mock database calls
   - Test service logic in isolation
   - Test edge cases (duplicates, validation)

2. **E2E Tests** (Realistic, slower)
   - Use MongoDB Memory Server (real DB, in-memory)
   - Test full HTTP request/response cycle
   - Verify database state changes

### Key Test Cases

✅ User creation with valid data  
✅ Duplicate email/aadhaar/pan rejection  
✅ Validation failures (email format, mobile format, etc.)  
✅ Aadhaar/PAN update prevention  
✅ Pagination correctness (hasNext, hasPrev)  
✅ Soft delete behavior  
✅ Search functionality  
✅ Error handling (404, 400, 409, 500)

---

## 💡 Pain Points & Learnings

### Pain Point #1: Schema Design Tradeoffs

**Problem**: Deciding between strict validation vs flexibility.

**Decision**:

- Strict validation at API layer (Zod)
- Mongoose schema handles defaults and timestamps
- Allow optional fields for future extensibility

**Learning**:

> Multiple layers of validation (Zod + Mongoose) seem redundant but catch different classes of errors. Zod catches malformed requests early; Mongoose enforces database constraints.

---

### Pain Point #2: Pagination Performance

**Problem**: `skip()` becomes slow with large datasets.

**Initial Approach**: Offset-based (`skip/limit`)

**Why It's a Tradeoff**:

- ✅ Easy to implement, frontends understand it
- ⚠️ Performance degrades at high offsets (MongoDB scans skipped docs)

**What I'd Do in v2**:

- Cursor-based pagination using `_id` or `createdAt`
- Or use aggregation with `$facet` for better performance
- **Acceptable for MVP** - optimize when we hit 100K+ users

**Learning**:

> Premature optimization is still the root of all evil, but being aware of limitations helps plan migration path.

---

### Pain Point #3: Testing with Async & Databases

**Problem**: Initial tests were flaky, database state leaked between tests.

**Solution**:

- `beforeAll`: Connect to MongoDB Memory Server once
- `afterEach`: Clear all collections
- `afterAll`: Disconnect cleanly
- Increase Jest timeout to 30s

**Learning**:

> Test isolation is critical. Each test should run independently, regardless of order.

---

### Pain Point #4: Error Handling Consistency

**Problem**: Different error formats from Zod, Mongoose, custom errors.

**Solution**: Centralized error middleware that:

- Detects error type (ZodError, ValidationError, MongoServerError)
- Transforms to standard format
- Returns appropriate HTTP status

**Learning**:

> A single error handler that understands all error types creates a consistent API contract. Frontend doesn't need special handling for different error sources.

---

### Pain Point #5: Aadhaar/PAN Masking

**Problem**: Should masking happen in model, service, or controller?

**Decision**: Model instance method (`user.maskSensitiveData()`)

**Why**:

- Data masking is a concern of the data itself
- Reusable across different controllers/services
- Testable in isolation

**Learning**:

> Put behavior close to the data it operates on (OOP principles apply even in Node.js).

---

## 📚 Best Practices Checklist

This is a living checklist of every best practice implemented, to never forget again.

### Code Organization

- [x] Separation of concerns (routes →, controllers → services → models)
- [x] Single responsibility principle for each module
- [x] Dependency injection ready (singleton database connection)
- [x] Constants and config centralized

### Security

- [x] No secrets in code (environment variables only)
- [x] Input validation on all endpoints
- [x] Sensitive data masked in responses (Aadhaar, PAN)
- [x] SQL injection prevention (Mongoose escapes by default)
- [x] CORS enabled for frontend

### Error Handling

- [x] Global error handler
- [x] Custom error classes (NotFoundError, ValidationError, etc.)
- [x] Proper HTTP status codes
- [x] Meaningful error messages
- [x] Stack traces only in development

### Logging

- [x] Structured logging (JSON format)
- [x] Request ID tracking across lifecycle
- [x] Latency measurement
- [x] Different log levels (error, warn, info, debug)
- [x] Log files for production (separate error.log and combined.log)

### Performance

- [x] Database indexes on frequently queried fields
- [x] Connection pooling (Mongoose default)
- [x] Pagination for list endpoints
- [x] Lean queries where objects aren't needed

### Testing

- [x] Unit tests for business logic
- [x] E2E tests for API contracts
- [x] Test coverage > 70%
- [x] Test edge cases and error paths
- [x] No shared state between tests

### Developer Experience

- [x] TypeScript for type safety
- [x] ESLint for code quality
- [x] Prettier for formatting
- [x] Nodemon for development hot reload
- [x] Clear npm scripts

### Production Readiness

- [x] Health check endpoint
- [x] Graceful shutdown (close connections on SIGTERM)
- [x] Uncaught exception handling
- [x] Environment-based configuration
- [x] Process restart on crash (handled by PM2/Docker in production)

---

## 🔄 Alternative Approaches Considered

### 1. SQL (PostgreSQL) with TypeORM

**Pros**:

- ACID transactions
- Strong relational constraints
- Better for complex joins

**Cons**:

- Migration overhead
- Rigid schema
- More complex pagination

**Verdict**: MongoDB chosen for flexibility and speed of iteration

---

### 2. GraphQL Instead of REST

**Pros**:

- Client specifies exact fields needed
- Single endpoint
- Type system

**Cons**:

- Overkill for simple CRUD
- Caching more complex
- Tooling/learning curve

**Verdict**: REST is sufficient for current requirements

---

### 3. Microservices Architecture

**Pros**:

- Independent scaling
- Technology diversity
- Fault isolation

**Cons**:

- Operational complexity
- Network latency
- Overkill for single domain

**Verdict**: Monolith is correct choice for MVP, can split later

---

## 🚀 What I'd Improve in v2

1. **Authentication & Authorization**
   - JWT-based auth
   - Role-based access control (Admin, User, ReadOnly)
   - Refresh token strategy

2. **Performance Optimizations**
   - Redis caching layer for frequently accessed users
   - Cursor-based pagination for large datasets
   - Database query optimization with explain()

3. **Advanced Features**
   - Full-text search with MongoDB Atlas Search or Elasticsearch
   - CSV import/export
   - Bulk operations API
   - Audit log table

4. **Observability**
   - APM integration (DataDog, New Relic)
   - Metrics (Prometheus + Grafana)
   - Distributed tracing

5. **DevOps**
   - Docker containerization
   - CI/CD pipeline (GitHub Actions)
   - Infrastructure as Code (Terraform)
   - Blue-green deployments

---

## 📝 Lessons Learned

### Conscious Tradeoffs Made

1. **Offset pagination** over cursor-based → Simpler, good enough for now
2. **MongoDB** over PostgreSQL → Faster development, schema flexibility
3. **Monolith** over microservices → Less complexity, easier to reason about
4. **Manual validation** over auto-generated schemas → More control, clearer errors

### What Surprised Me

- **Zod's TypeScript inference** is magical - write schema once, get types for free
- **MongoDB Memory Server** makes E2E tests actually fast and reliable
- **Winston's transports** make it trivial to separate error logs from general logs
- **Express middleware order** matters more than I thought (error handler must be last)

### What I'd Do Differently

- Start with **cursor pagination** from day 1 (migration pain not worth skip/limit convenience)
- Use **class-transformer** for DTOs instead of manual masking (more declarative)
- Set up **Husky pre-commit hooks** earlier to enforce linting/tests

---

Built with care and attention to production-grade practices. Every line of code is reviewed with the mindset: "Would I be proud to have a principal engineer review this?"
