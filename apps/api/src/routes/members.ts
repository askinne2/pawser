import { Router, Response } from 'express';
import { prisma } from '@pawser/database';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { getEmailService } from '../services/EmailService';
import crypto from 'crypto';

const router = Router({ mergeParams: true }); // Get :orgId from parent router

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/organizations/:orgId/members
 * List all members and pending invitations for an organization
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { orgId } = req.params;

    // Check access - must be member of org or super admin
    if (!req.user?.isSuperAdmin) {
      const membership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: req.user!.id,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this organization',
          },
        });
      }
    }

    // Get members
    const members = await prisma.membership.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            disabled: true,
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
      orderBy: [
        { role: 'asc' }, // owners first
        { createdAt: 'asc' },
      ],
    });

    // Get pending invitations
    const invitations = await prisma.invitation.findMany({
      where: {
        orgId,
        acceptedAt: null,
        cancelledAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        members: members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          email: m.user.email,
          name: m.user.name,
          role: m.role,
          disabled: m.user.disabled,
          lastLoginAt: m.user.lastLoginAt,
          acceptedAt: m.acceptedAt,
          createdAt: m.createdAt,
          invitedBy: m.invitedBy,
        })),
        invitations: invitations.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          message: i.message,
          expiresAt: i.expiresAt,
          createdAt: i.createdAt,
          invitedBy: i.invitedBy,
        })),
      },
    });
  } catch (error) {
    console.error('Error listing members:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list members',
      },
    });
  }
});

/**
 * POST /api/v1/organizations/:orgId/invitations
 * Invite a new member to the organization
 */
router.post('/invitations', async (req: AuthRequest, res: Response) => {
  try {
    const { orgId } = req.params;
    const { email, role = 'admin', message } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is required',
        },
      });
    }

    if (!['owner', 'admin', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid role. Must be owner, admin, or viewer',
        },
      });
    }

    // Check access - must be owner/admin or super admin
    let userRole = 'viewer';
    if (!req.user?.isSuperAdmin) {
      const membership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: req.user!.id,
          },
        },
      });

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to invite members',
          },
        });
      }

      userRole = membership.role;

      // Admins cannot invite owners
      if (userRole === 'admin' && role === 'owner') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admins cannot invite owners',
          },
        });
      }
    }

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Organization not found',
        },
      });
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      const existingMembership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMembership) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_MEMBER',
            message: 'This user is already a member of the organization',
          },
        });
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        orgId,
        email: email.toLowerCase(),
        acceptedAt: null,
        cancelledAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVITATION_EXISTS',
          message: 'A pending invitation already exists for this email',
        },
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        orgId,
        email: email.toLowerCase(),
        role,
        tokenHash,
        message: message?.slice(0, 500),
        invitedById: req.user!.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Send invitation email
    const inviterName = req.user?.email || 'Someone';
    await getEmailService().sendInvitation(
      email,
      inviterName,
      organization.name,
      role,
      token,
      message,
      orgId
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        orgId,
        action: 'member_invited',
        entityType: 'invitation',
        entityId: invitation.id,
        metadata: {
          email,
          role,
        },
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          message: invitation.message,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
          invitedBy: invitation.invitedBy,
        },
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
});

/**
 * DELETE /api/v1/organizations/:orgId/invitations/:invitationId
 * Cancel a pending invitation
 */
router.delete('/invitations/:invitationId', async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, invitationId } = req.params;

    // Check access
    if (!req.user?.isSuperAdmin) {
      const membership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: req.user!.id,
          },
        },
      });

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to cancel invitations',
          },
        });
      }
    }

    // Find invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        orgId,
        acceptedAt: null,
        cancelledAt: null,
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        },
      });
    }

    // Cancel invitation
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { cancelledAt: new Date() },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        orgId,
        action: 'invitation_cancelled',
        entityType: 'invitation',
        entityId: invitationId,
        metadata: {
          email: invitation.email,
        },
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      },
    });

    res.json({
      success: true,
      message: 'Invitation cancelled',
    });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to cancel invitation',
      },
    });
  }
});

/**
 * POST /api/v1/organizations/:orgId/invitations/:invitationId/resend
 * Resend an invitation email
 */
router.post('/invitations/:invitationId/resend', async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, invitationId } = req.params;

    // Check access
    if (!req.user?.isSuperAdmin) {
      const membership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: req.user!.id,
          },
        },
      });

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to resend invitations',
          },
        });
      }
    }

    // Find invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        orgId,
        acceptedAt: null,
        cancelledAt: null,
      },
      include: {
        organization: { select: { name: true } },
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Invitation not found or already accepted/cancelled',
        },
      });
    }

    // Generate new token and extend expiry
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Send invitation email
    const inviterName = req.user?.email || 'Someone';
    await getEmailService().sendInvitation(
      invitation.email,
      inviterName,
      invitation.organization.name,
      invitation.role,
      token,
      invitation.message || undefined,
      orgId
    );

    res.json({
      success: true,
      message: 'Invitation resent',
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to resend invitation',
      },
    });
  }
});

/**
 * PUT /api/v1/organizations/:orgId/members/:userId/role
 * Change a member's role
 */
router.put('/members/:userId/role', async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, userId } = req.params;
    const { role } = req.body;

    if (!['owner', 'admin', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid role. Must be owner, admin, or viewer',
        },
      });
    }

    // Check access
    let actorRole = 'viewer';
    if (!req.user?.isSuperAdmin) {
      const actorMembership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: req.user!.id,
          },
        },
      });

      if (!actorMembership || !['owner', 'admin'].includes(actorMembership.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to change roles',
          },
        });
      }

      actorRole = actorMembership.role;
    }

    // Find target membership
    const targetMembership = await prisma.membership.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
      include: {
        user: { select: { email: true, name: true } },
        organization: {
          include: {
            memberships: {
              where: { role: 'owner' },
            },
          },
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

    // Admins cannot modify owner roles
    if (actorRole === 'admin' && (targetMembership.role === 'owner' || role === 'owner')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admins cannot modify owner roles',
        },
      });
    }

    // Prevent removing last owner
    if (
      targetMembership.role === 'owner' &&
      role !== 'owner' &&
      targetMembership.organization.memberships.length === 1
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'LAST_OWNER',
          message: 'Cannot demote the last owner. Transfer ownership first.',
        },
      });
    }

    // Update role
    const updated = await prisma.membership.update({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        orgId,
        action: 'member_role_changed',
        entityType: 'membership',
        entityId: updated.id,
        metadata: {
          userId,
          previousRole: targetMembership.role,
          newRole: role,
        },
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      },
    });

    res.json({
      success: true,
      data: {
        member: {
          id: updated.id,
          userId: updated.user.id,
          email: updated.user.email,
          name: updated.user.name,
          role: updated.role,
        },
      },
    });
  } catch (error) {
    console.error('Error changing role:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to change role',
      },
    });
  }
});

/**
 * DELETE /api/v1/organizations/:orgId/members/:userId
 * Remove a member from the organization
 */
router.delete('/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, userId } = req.params;

    // Check access
    let actorRole = 'viewer';
    if (!req.user?.isSuperAdmin) {
      const actorMembership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: req.user!.id,
          },
        },
      });

      if (!actorMembership || !['owner', 'admin'].includes(actorMembership.role)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to remove members',
          },
        });
      }

      actorRole = actorMembership.role;
    }

    // Find target membership
    const targetMembership = await prisma.membership.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
      include: {
        user: { select: { email: true, name: true } },
        organization: {
          include: {
            memberships: {
              where: { role: 'owner' },
            },
          },
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

    // Admins cannot remove owners
    if (actorRole === 'admin' && targetMembership.role === 'owner') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admins cannot remove owners',
        },
      });
    }

    // Prevent removing last owner
    if (
      targetMembership.role === 'owner' &&
      targetMembership.organization.memberships.length === 1
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'LAST_OWNER',
          message: 'Cannot remove the last owner. Transfer ownership first.',
        },
      });
    }

    // Delete membership
    await prisma.membership.delete({
      where: {
        orgId_userId: {
          orgId,
          userId,
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
        entityId: targetMembership.id,
        metadata: {
          userId,
          email: targetMembership.user.email,
          role: targetMembership.role,
        },
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      },
    });

    res.json({
      success: true,
      message: 'Member removed',
    });
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
});

/**
 * POST /api/v1/organizations/:orgId/transfer-ownership
 * Transfer ownership to another member
 */
router.post('/transfer-ownership', async (req: AuthRequest, res: Response) => {
  try {
    const { orgId } = req.params;
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'New owner ID is required',
        },
      });
    }

    // Check access - must be current owner or super admin
    if (!req.user?.isSuperAdmin) {
      const actorMembership = await prisma.membership.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: req.user!.id,
          },
        },
      });

      if (!actorMembership || actorMembership.role !== 'owner') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only owners can transfer ownership',
          },
        });
      }
    }

    // Find new owner's membership
    const newOwnerMembership = await prisma.membership.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: newOwnerId,
        },
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!newOwnerMembership) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'New owner is not a member of this organization',
        },
      });
    }

    // Transfer ownership in a transaction
    await prisma.$transaction([
      // Make current user an admin (if not super admin doing this)
      ...(req.user?.isSuperAdmin ? [] : [
        prisma.membership.update({
          where: {
            orgId_userId: {
              orgId,
              userId: req.user!.id,
            },
          },
          data: { role: 'admin' },
        }),
      ]),
      // Make new owner the owner
      prisma.membership.update({
        where: {
          orgId_userId: {
            orgId,
            userId: newOwnerId,
          },
        },
        data: { role: 'owner' },
      }),
    ]);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        orgId,
        action: 'ownership_transferred',
        entityType: 'organization',
        entityId: orgId,
        metadata: {
          previousOwnerId: req.user!.id,
          newOwnerId,
          newOwnerEmail: newOwnerMembership.user.email,
        },
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      },
    });

    res.json({
      success: true,
      message: 'Ownership transferred successfully',
    });
  } catch (error) {
    console.error('Error transferring ownership:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to transfer ownership',
      },
    });
  }
});

export default router;
