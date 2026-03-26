import { Router, Response } from 'express';
import { prisma } from '@pawser/database';
import { authenticate, requireSuperAdmin, AuthRequest, generateToken } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// All routes require super admin access
router.use(authenticate, requireSuperAdmin);

/**
 * GET /api/v1/users
 * List all users with pagination, search, and filters
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      search,
      status,
      isSuperAdmin,
      hasOrg,
      sort = 'created_desc',
      page = '1',
      perPage = '25',
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limit = Math.min(parseInt(perPage as string, 10) || 25, 100);
    const skip = (pageNum - 1) * limit;

    // Build where clause
    const where: Parameters<typeof prisma.user.findMany>[0]['where'] = {};

    // Search by name or email
    if (search && typeof search === 'string') {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by status (disabled)
    if (status === 'active') {
      where.disabled = false;
    } else if (status === 'disabled') {
      where.disabled = true;
    }

    // Filter by super admin
    if (isSuperAdmin === 'true') {
      where.isSuperAdmin = true;
    } else if (isSuperAdmin === 'false') {
      where.isSuperAdmin = false;
    }

    // Filter by has org memberships
    if (hasOrg === 'true') {
      where.memberships = { some: {} };
    } else if (hasOrg === 'false') {
      where.memberships = { none: {} };
    }

    // Build order by
    type SortKey = 'name_asc' | 'name_desc' | 'email_asc' | 'email_desc' | 'login_desc' | 'created_desc' | 'created_asc';
    const sortOptions: Record<SortKey, Parameters<typeof prisma.user.findMany>[0]['orderBy']> = {
      name_asc: { name: 'asc' },
      name_desc: { name: 'desc' },
      email_asc: { email: 'asc' },
      email_desc: { email: 'desc' },
      login_desc: { lastLoginAt: 'desc' },
      created_desc: { createdAt: 'desc' },
      created_asc: { createdAt: 'asc' },
    };
    const orderBy = sortOptions[sort as SortKey] || sortOptions.created_desc;

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        disabled: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: { memberships: true },
        },
      },
    });

    // Transform response
    const transformedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      disabled: user.disabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      orgCount: user._count.memberships,
    }));

    res.json({
      success: true,
      data: {
        users: transformedUsers,
        total,
        page: pageNum,
        perPage: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list users',
      },
    });
  }
});

/**
 * GET /api/v1/users/:id
 * Get user detail with memberships and audit logs
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        disabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            id: true,
            role: true,
            acceptedAt: true,
            createdAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Get recent audit logs for this user
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [{ actorUserId: id }, { entityType: 'user', entityId: id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        user,
        auditLogs,
      },
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user',
      },
    });
  }
});

/**
 * PUT /api/v1/users/:id
 * Update user (name, isSuperAdmin, disabled)
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isSuperAdmin, disabled } = req.body;

    // Check user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Prevent disabling own account
    if (disabled === true && id === req.user?.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'You cannot disable your own account',
        },
      });
    }

    // Prevent removing own super admin status
    if (isSuperAdmin === false && id === req.user?.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'You cannot remove your own super admin status',
        },
      });
    }

    // Build update data
    const updateData: { name?: string; isSuperAdmin?: boolean; disabled?: boolean } = {};
    if (name !== undefined) updateData.name = name;
    if (isSuperAdmin !== undefined) updateData.isSuperAdmin = isSuperAdmin;
    if (disabled !== undefined) updateData.disabled = disabled;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        disabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        action: 'user_updated',
        entityType: 'user',
        entityId: id,
        metadata: {
          changes: updateData,
          previousValues: {
            name: existingUser.name,
            isSuperAdmin: existingUser.isSuperAdmin,
            disabled: existingUser.disabled,
          },
        },
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      },
    });

    // If user was disabled, revoke all their sessions
    if (disabled === true) {
      await prisma.refreshToken.updateMany({
        where: {
          userId: id,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    res.json({
      success: true,
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update user',
      },
    });
  }
});

/**
 * DELETE /api/v1/users/:id/memberships/:orgId
 * Remove user from an organization
 */
router.delete('/:id/memberships/:orgId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, orgId } = req.params;

    // Find membership
    const membership = await prisma.membership.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: id,
        },
      },
      include: {
        organization: {
          include: {
            memberships: {
              where: { role: 'owner' },
            },
          },
        },
      },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Membership not found',
        },
      });
    }

    // Prevent removing last owner
    if (membership.role === 'owner' && membership.organization.memberships.length === 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Cannot remove the last owner from an organization',
        },
      });
    }

    // Delete membership
    await prisma.membership.delete({
      where: {
        orgId_userId: {
          orgId,
          userId: id,
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        orgId,
        action: 'member_removed',
        entityType: 'membership',
        entityId: membership.id,
        metadata: {
          userId: id,
          role: membership.role,
        },
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      },
    });

    res.json({
      success: true,
      message: 'User removed from organization',
    });
  } catch (error) {
    console.error('Error removing membership:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove membership',
      },
    });
  }
});

/**
 * POST /api/v1/users/:id/impersonate
 * Start impersonating a user (super admin only)
 */
router.post('/:id/impersonate', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Cannot impersonate yourself
    if (id === req.user?.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'You cannot impersonate yourself',
        },
      });
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    if (targetUser.disabled) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Cannot impersonate a disabled user',
        },
      });
    }

    // Generate impersonation token (short-lived)
    const jti = crypto.randomUUID();
    const impersonationToken = generateToken({
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.isSuperAdmin ? 'super_admin' : 'viewer',
    });

    // Create audit log for impersonation start
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        action: 'impersonation_started',
        entityType: 'user',
        entityId: id,
        metadata: {
          impersonatorId: req.user!.id,
          impersonatorEmail: req.user!.email,
          targetEmail: targetUser.email,
          jti,
        },
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      },
    });

    // Determine redirect URL based on user's memberships
    let redirectUrl = '/organizations';
    if (targetUser.memberships.length === 1) {
      redirectUrl = `/organizations/${targetUser.memberships[0].organization.id}`;
    }

    res.json({
      success: true,
      data: {
        token: impersonationToken,
        redirectUrl,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
        },
      },
    });
  } catch (error) {
    console.error('Error starting impersonation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to start impersonation',
      },
    });
  }
});

export default router;
