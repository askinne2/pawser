import { Router, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '@pawser/database';
import { authenticate, AuthRequest, requireRole, requireTenantContext } from '../middleware/auth';

const router = Router();

/**
 * Role hierarchy for authorization checks
 */
const ROLE_HIERARCHY: Record<string, number> = {
  owner: 80,
  admin: 60,
  viewer: 40,
};

/**
 * GET /v1/tenants/:tenantId/members
 * List all members of a tenant
 */
router.get(
  '/:tenantId/members',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { tenantId } = req.params;

      // Check if user has access to this tenant
      if (!req.user?.isSuperAdmin) {
        const membership = await prisma.membership.findUnique({
          where: {
            orgId_userId: {
              orgId: tenantId,
              userId: req.user!.id,
            },
          },
        });

        if (!membership || !membership.acceptedAt) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have access to this organization',
            },
          });
        }
      }

      const members = await prisma.membership.findMany({
        where: {
          orgId: tenantId,
          acceptedAt: { not: null },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              lastLoginAt: true,
            },
          },
          invitedBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      res.json({
        success: true,
        data: {
          members: members.map((m) => ({
            id: m.id,
            userId: m.userId,
            role: m.role,
            user: m.user,
            invitedBy: m.invitedBy,
            acceptedAt: m.acceptedAt,
            createdAt: m.createdAt,
          })),
        },
      });
    } catch (error) {
      console.error('Error fetching members:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch members',
        },
      });
    }
  }
);

/**
 * POST /v1/tenants/:tenantId/invitations
 * Invite a new member to the tenant
 */
router.post(
  '/:tenantId/invitations',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { email, role = 'viewer' } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
          },
        });
      }

      // Validate role
      if (!['owner', 'admin', 'viewer'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid role. Must be owner, admin, or viewer',
          },
        });
      }

      // Check if user has permission to invite (must be admin+ in the tenant)
      if (!req.user?.isSuperAdmin) {
        const userMembership = await prisma.membership.findUnique({
          where: {
            orgId_userId: {
              orgId: tenantId,
              userId: req.user!.id,
            },
          },
        });

        if (!userMembership || !userMembership.acceptedAt) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You do not have access to this organization',
            },
          });
        }

        const userRoleLevel = ROLE_HIERARCHY[userMembership.role] || 0;
        const invitedRoleLevel = ROLE_HIERARCHY[role] || 0;

        // Can only invite roles equal to or lower than your own (except owner)
        if (userMembership.role !== 'owner' && userRoleLevel < 60) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Only admins and owners can invite new members',
            },
          });
        }

        // Non-owners cannot invite owners
        if (role === 'owner' && userMembership.role !== 'owner') {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Only owners can invite new owners',
            },
          });
        }
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists and is a member
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        const existingMembership = await prisma.membership.findUnique({
          where: {
            orgId_userId: {
              orgId: tenantId,
              userId: existingUser.id,
            },
          },
        });

        if (existingMembership) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'User is already a member of this organization',
            },
          });
        }

        // Create membership directly for existing users (pending acceptance)
        await prisma.membership.create({
          data: {
            orgId: tenantId,
            userId: existingUser.id,
            role,
            invitedByUserId: req.user!.id,
          },
        });
      } else {
        // Create a magic link for new users
        // First create a placeholder user
        const newUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            disabled: false,
          },
        });

        // Create membership (pending acceptance)
        await prisma.membership.create({
          data: {
            orgId: tenantId,
            userId: newUser.id,
            role,
            invitedByUserId: req.user!.id,
          },
        });
      }

      // Generate magic link for invitation
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (user) {
        await prisma.magicLink.create({
          data: {
            userId: user.id,
            orgId: tenantId,
            tokenHash,
            expiresAt,
          },
        });

        // In production, send email with invitation link
        if (process.env.NODE_ENV === 'development') {
          console.log(`Invitation token for ${normalizedEmail}: ${token}`);
          console.log(`Full URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/accept?token=${token}`);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Invitation sent successfully',
        data: {
          email: normalizedEmail,
          role,
        },
      });
    } catch (error) {
      console.error('Error creating invitation:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create invitation',
        },
      });
    }
  }
);

/**
 * PATCH /v1/tenants/:tenantId/members/:userId/role
 * Change a member's role
 */
router.patch(
  '/:tenantId/members/:userId/role',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { tenantId, userId } = req.params;
      const { role } = req.body;

      if (!role || !['owner', 'admin', 'viewer'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid role. Must be owner, admin, or viewer',
          },
        });
      }

      // Check if user has permission (must be owner)
      if (!req.user?.isSuperAdmin) {
        const userMembership = await prisma.membership.findUnique({
          where: {
            orgId_userId: {
              orgId: tenantId,
              userId: req.user!.id,
            },
          },
        });

        if (!userMembership || userMembership.role !== 'owner') {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Only owners can change member roles',
            },
          });
        }
      }

      // Get the target membership
      const targetMembership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId: tenantId,
            userId,
          },
        },
      });

      if (!targetMembership) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Member not found',
          },
        });
      }

      // Prevent demoting the last owner
      if (targetMembership.role === 'owner' && role !== 'owner') {
        const ownerCount = await prisma.membership.count({
          where: {
            orgId: tenantId,
            role: 'owner',
            acceptedAt: { not: null },
          },
        });

        if (ownerCount <= 1) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'LAST_OWNER',
              message: 'Cannot demote the last owner. Promote another member to owner first.',
            },
          });
        }
      }

      // Update the role
      await prisma.membership.update({
        where: { id: targetMembership.id },
        data: { role },
      });

      res.json({
        success: true,
        message: 'Role updated successfully',
        data: {
          userId,
          role,
        },
      });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update role',
        },
      });
    }
  }
);

/**
 * DELETE /v1/tenants/:tenantId/members/:userId
 * Remove a member from the tenant
 */
router.delete(
  '/:tenantId/members/:userId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { tenantId, userId } = req.params;

      // Check if user has permission (must be owner)
      if (!req.user?.isSuperAdmin) {
        const userMembership = await prisma.membership.findUnique({
          where: {
            orgId_userId: {
              orgId: tenantId,
              userId: req.user!.id,
            },
          },
        });

        if (!userMembership || userMembership.role !== 'owner') {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Only owners can remove members',
            },
          });
        }

        // Cannot remove yourself if you're the only owner
        if (userId === req.user!.id) {
          const ownerCount = await prisma.membership.count({
            where: {
              orgId: tenantId,
              role: 'owner',
              acceptedAt: { not: null },
            },
          });

          if (ownerCount <= 1) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'LAST_OWNER',
                message: 'Cannot remove yourself as the last owner',
              },
            });
          }
        }
      }

      // Get the target membership
      const targetMembership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId: tenantId,
            userId,
          },
        },
      });

      if (!targetMembership) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Member not found',
          },
        });
      }

      // Prevent removing the last owner
      if (targetMembership.role === 'owner') {
        const ownerCount = await prisma.membership.count({
          where: {
            orgId: tenantId,
            role: 'owner',
            acceptedAt: { not: null },
          },
        });

        if (ownerCount <= 1) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'LAST_OWNER',
              message: 'Cannot remove the last owner',
            },
          });
        }
      }

      // Delete the membership
      await prisma.membership.delete({
        where: { id: targetMembership.id },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove member',
        },
      });
    }
  }
);

export default router;
