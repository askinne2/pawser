# Authentication & Authorization Guide

## Overview

The pawser platform uses JWT (JSON Web Tokens) for authentication with role-based access control (RBAC).

## User Roles

- **super_admin**: Full system access, can manage all organizations and users
- **admin**: Can manage assigned organizations
- **user**: Basic access (read-only in most cases)

## Authentication Flow

### 1. Login Process

1. **User submits credentials** to `/api/auth/login` (admin dashboard)
2. **Server validates** email/password against database
3. **Server generates JWT token** containing:
   - User ID
   - Email
   - Role
4. **Token returned** to client and stored in cookie/localStorage
5. **Token included** in subsequent requests via:
   - `Authorization: Bearer <token>` header, or
   - `token` cookie

### 2. Token Validation

- **Admin Dashboard**: Next.js middleware validates token on each request
- **API Server**: Express middleware validates token for protected routes
- **Token expiration**: Default 24 hours (configurable via `JWT_EXPIRES_IN`)

### 3. Protected Routes

**Admin Dashboard:**
- All routes except `/login` require authentication
- Middleware in `apps/admin/middleware.ts` handles validation

**API Server:**
- Routes with `authenticate` middleware require valid JWT
- Routes with `requireRole()` middleware check user role

## Development Mode Auth Bypass

For local development, you can bypass authentication:

1. Set in `.env`:
   ```bash
   DEV_AUTH_BYPASS=true
   NODE_ENV=development
   ```

2. **Admin Dashboard**: All routes accessible without login
3. **API Server**: Mock user with `super_admin` role is automatically set

**⚠️ WARNING**: Never enable `DEV_AUTH_BYPASS` in production!

## Generating JWT Secret

Generate a secure JWT secret for production:

```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 2: OpenSSL
openssl rand -base64 32

# Option 3: Online generator (use trusted source)
```

Add to `.env`:
```bash
JWT_SECRET=<generated-secret>
```

## Seeding Super Admin User

Run the database seed to create the initial super admin:

```bash
cd packages/database
pnpm run db:seed
```

This creates:
- Email: `andrew@21adsmedia.com`
- Password: `merrimack1`
- Role: `super_admin`

**Note**: Change the password after first login in production!

## API Authentication Example

```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const { token } = await response.json();

// Use token in subsequent requests
const data = await fetch('/api/v1/organizations', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use strong JWT secrets** - Minimum 32 characters, random
3. **Set token expiration** - Default 24h, adjust based on security needs
4. **HTTPS in production** - Always use HTTPS to protect tokens in transit
5. **Disable dev bypass** - Ensure `DEV_AUTH_BYPASS=false` in production
6. **Rotate secrets** - Change JWT_SECRET periodically

