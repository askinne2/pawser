# Pawser Platform

**Pawser** - White-label animal adoption portals powered by ShelterLuv.

A multi-tenant SaaS platform for displaying cached animal adoption listings from the ShelterLuv API.

## Architecture Overview

This is a standalone Next.js/React multi-tenant SaaS platform built as a monorepo with:

- **Admin Dashboard** - Organization management, settings, and sync controls
- **Public Portal** - Tenant-aware animal listing portal with custom domain support
- **API Server** - Express.js backend with tenant isolation and caching
- **WordPress Plugin** - Separate plugin for WordPress site integration

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI Framework**: Tailwind CSS + Radix UI (for accessible, reusable components)
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis with BullMQ
- **Authentication**: JWT with role-based access control (RBAC)
- **Monorepo**: Turborepo with pnpm workspaces
- **Deployment**: Docker Compose

## Project Structure

```
pawser/
├── apps/
│   ├── admin/          # Admin dashboard (Next.js)
│   ├── portal/         # Public animal portal (Next.js)
│   └── api/            # API server (Express)
├── packages/
│   ├── database/       # Prisma schema and client
│   ├── shared/         # Shared TypeScript types
│   └── ui/             # Shared React components
├── docker/             # Docker configuration
└── wordpress-plugin/   # WordPress integration plugin (Pawser Client)
```

## Domain Convention

- Tenant subdomains: `{org}.pawser.app`
- Admin dashboard: `admin.pawser.app`
- API: `api.pawser.app`

## Tenant Isolation Strategy

### Database Level
- All tables include `organizationId` foreign key
- Unique constraints on `(organizationId, resourceId)` combinations
- Cascade deletes ensure data cleanup

### Application Level
- Tenant resolution middleware resolves from custom domain or subdomain
- All API routes require tenant context
- Tenant guard middleware enforces isolation
- All database queries must include `organizationId`

### Cache Level
- Redis keys are tenant-scoped: `tenant:{orgId}:{key}`
- Memory cache fallback also uses tenant-scoped keys

### Security
- ShelterLuv API keys encrypted at rest (AES-256-GCM)
- JWT authentication for admin access
- Per-tenant rate limiting
- Audit logging for security events

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Local Development

1. **Clone and install dependencies:**
   ```bash
   cd pawser
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   # IMPORTANT: Create .env in the ROOT directory (required for Prisma)
   # From the root of the project:
   cp env.example .env
   # Edit .env with your configuration
   
   # Also create .env for Docker (optional, for docker-compose)
   cp docker/env.example docker/.env
   # Edit docker/.env with your configuration
   ```
   
   **Note:** The root `.env` file is required because Prisma (used for database migrations) looks for `DATABASE_URL` starting from the current directory and walking up to the root. The `docker/.env` file is only used by docker-compose.

3. **Start Docker services** (from repo root):
   ```bash
   pnpm run docker:up
   ```
   
   Equivalent: `cd docker && docker compose up -d postgres redis`. Use `pnpm run docker:start` to start existing containers. Full stack (API, admin, portal in Docker): `pnpm run docker:up:all`.
   
   **Note:** PostgreSQL is configured to use port `5434` (instead of the default `5432`) to avoid conflicts with other local PostgreSQL instances.

4. **Set up database** (from repo root):
   ```bash
   pnpm run db:push
   ```

5. **Seed initial data (optional but recommended):**
   ```bash
   pnpm run db:seed
   ```
   
   This creates:
   - Super admin user: `andrew@21adsmedia.com` / `merrimack1`
   - Demo organization for testing

6. **Generate JWT secret (if not already set):**
   ```bash
   # Generate a secure JWT secret
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   
   Copy the output and add it to your `.env` file as `JWT_SECRET=...`

7. **Start development servers:**
   ```bash
   # From root directory
   pnpm dev
   ```

   This will start:
   - API server on http://localhost:3002
   - Admin dashboard on http://localhost:3001
   - Portal on http://localhost:3000
   
   **Development Auth Bypass**: Set `DEV_AUTH_BYPASS=true` in `.env` to bypass authentication in dev mode (admin dashboard and API).

### Production Deployment

1. **Build all applications:**
   ```bash
   pnpm build
   ```

2. **Start with Docker Compose** (from repo root):
   ```bash
   pnpm run docker:up:all
   ```

## Configuration

### Environment Variables

Copy `env.example` to `.env` in the root directory and configure:

**API Server:**
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://postgres:postgres@localhost:5434/pawser`)
- `REDIS_HOST` - Redis host (default: `localhost`)
- `REDIS_PORT` - Redis port (default: `6379`)
- `REDIS_PASSWORD` - Redis password (optional)
- `PORT` - API server port (default: `3002`)
- `JWT_SECRET` - Secret for JWT tokens (use a strong random string)
- `JWT_EXPIRES_IN` - JWT token expiration (default: `24h`)
- `ENCRYPTION_KEY` - Key for encrypting API keys (64 hex characters)
  - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `CORS_ORIGIN` - Allowed CORS origins (default: `*`)

**Admin Dashboard:**
- `API_URL` - API server URL (e.g., `http://localhost:3002`)
- `JWT_SECRET` - Must match API server JWT_SECRET

**Portal:**
- `NEXT_PUBLIC_API_URL` - Public API URL (e.g., `http://localhost:3002`)

**Note:** ShelterLuv API keys are configured per organization in the admin dashboard and stored encrypted in the database. You don't need to set them in environment variables.

## API Endpoints

### Public (Tenant-Scoped)
- `GET /api/v1/animals` - List animals for current tenant
- `GET /api/v1/animals/:id` - Get single animal

### Admin (Authenticated)
- `GET /api/v1/organizations` - List organizations
- `POST /api/v1/organizations` - Create organization
- `GET /api/v1/organizations/:id` - Get organization
- `PUT /api/v1/organizations/:id` - Update organization
- `PUT /api/v1/organizations/:id/credentials` - Update credentials
- `GET /api/v1/organizations/:id/settings` - Get settings
- `PUT /api/v1/organizations/:id/settings` - Update settings
- `POST /api/v1/sync/:organizationId` - Trigger sync
- `GET /api/v1/sync/:organizationId/status` - Get sync status

## Background Jobs

Animal data is synced from ShelterLuv API via BullMQ workers:

- Sync intervals per tier:
  - Trial: 30 minutes
  - Basic: 15 minutes
  - Pro: 5 minutes
  - Enterprise: 2 minutes

Sync jobs are automatically scheduled and can be triggered manually via admin dashboard.

## WordPress Plugin

The WordPress plugin (Pawser Client) is a separate product that connects to the Pawser API. See `wordpress-plugin/README.md` for installation and configuration.

## Security Considerations

1. **API Key Encryption**: All ShelterLuv API keys are encrypted at rest using AES-256-GCM
2. **Tenant Isolation**: Strict enforcement at database, application, and cache layers
3. **Rate Limiting**: Per-tenant rate limits based on subscription tier
4. **Audit Logging**: All security events are logged (tenant-scoped)

## Migration from WordPress Plugin

If migrating from the existing WordPress plugin:

1. Create organization in admin dashboard
2. Configure ShelterLuv API credentials
3. Set custom domain or subdomain
4. Trigger initial sync
5. Update WordPress plugin settings to point to Pawser API

## Authentication

See [AUTHENTICATION.md](./AUTHENTICATION.md) for detailed authentication documentation including:
- User roles and permissions
- JWT token generation and validation
- Development mode auth bypass
- Seeding super admin user
- Security best practices

## UI Components & Styling

The platform uses **Tailwind CSS** + **Radix UI** for modern, accessible components:

- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Radix UI**: Unstyled, accessible component primitives
- **Shared UI Package**: Reusable components in `packages/ui`

This combination provides:
- ✅ Code reusability across admin and portal
- ✅ Accessibility out of the box (Radix)
- ✅ Modern design system (Tailwind)
- ✅ Type-safe component variants (CVA)
- ✅ Consistent styling across apps

## License

GPL-2.0+
