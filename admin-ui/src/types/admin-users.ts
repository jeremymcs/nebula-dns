/**
 * Nebula DNS - Admin User Management Types
 * TypeScript types for admin user management API
 * Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
 */

// Re-export AdminRole from admin-permissions (no duplication)
export type { AdminRole } from '@/lib/admin-permissions'
import type { AdminRole } from '@/lib/admin-permissions'

// ============================================
// Admin Status Types
// ============================================

/**
 * Admin account status
 */
export type AdminStatus = 'active' | 'suspended' | 'pending_mfa'

// ============================================
// Admin List Types
// ============================================

/**
 * Admin list item for listing response
 */
export interface AdminListItem {
  id: string
  email: string
  name: string
  role: AdminRole
  status: AdminStatus
  mfaSetupComplete: boolean
  lastLoginAt: string | null
  createdAt: string
}

/**
 * Admin detail with invitation info
 */
export interface AdminDetail extends AdminListItem {
  invitedByAdminId: string | null
  invitedByAdminEmail: string | null
}

/**
 * Pagination metadata for admin listings
 */
export interface AdminListPagination {
  cursor: string | null
  hasMore: boolean
  total: number
}

/**
 * List admins response with pagination
 */
export interface ListAdminsResponse {
  data: AdminListItem[]
  pagination: AdminListPagination
}

// ============================================
// Admin Invitation Types
// ============================================

/**
 * Invitation status
 */
export type AdminInvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

/**
 * Admin invitation for listing response
 */
export interface AdminInvitation {
  id: string
  email: string
  role: AdminRole
  status: AdminInvitationStatus
  expiresAt: string
  invitedByAdminEmail: string
  createdAt: string
  isExpired: boolean
}

/**
 * Pagination metadata for invitation listings
 */
export interface InvitationListPagination {
  cursor: string | null
  hasMore: boolean
  total: number
}

/**
 * List invitations response with pagination
 */
export interface ListInvitationsResponse {
  data: AdminInvitation[]
  pagination: InvitationListPagination
}

/**
 * Create invitation response
 */
export interface CreateInvitationResponse {
  invitation: AdminInvitation
  emailSent: boolean
  inviteUrl?: string
}

// ============================================
// Admin Activity Types
// ============================================

/**
 * All admin activity action types
 */
export type AdminActivityAction =
  | 'admin_login'
  | 'admin_logout'
  | 'admin_login_failed'
  | 'admin_invited'
  | 'admin_created'
  | 'admin_suspended'
  | 'admin_reactivated'
  | 'admin_role_changed'
  | 'admin_mfa_reset'
  | 'admin_deleted'
  | 'admin_password_changed'
  | 'invite_revoked'

/**
 * Admin activity log entry
 */
export interface AdminActivityItem {
  id: string
  adminId: string
  adminEmail: string
  adminName: string
  action: AdminActivityAction
  targetAdminId: string | null
  targetAdminEmail: string | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

/**
 * Pagination metadata for activity logs
 */
export interface ActivityPagination {
  cursor: string | null
  hasMore: boolean
  total: number
}

/**
 * Admin activity response with pagination
 */
export interface AdminActivityResponse {
  data: AdminActivityItem[]
  pagination: ActivityPagination
}

// ============================================
// Query Parameter Types
// ============================================

/**
 * Query params for listing admins
 */
export interface AdminListParams {
  role?: AdminRole
  status?: AdminStatus
  limit?: number
  cursor?: string
}

/**
 * Query params for listing invitations
 */
export interface InvitationListParams {
  status?: AdminInvitationStatus
  limit?: number
  cursor?: string
}

/**
 * Query params for activity logs
 */
export interface AdminActivityParams {
  adminId?: string
  targetAdminId?: string
  action?: AdminActivityAction
  startDate?: string
  endDate?: string
  limit?: number
  cursor?: string
}

// ============================================
// Mutation Types
// ============================================

/**
 * Create admin invitation request
 */
export interface CreateAdminInvitationRequest {
  email: string
  role: AdminRole
}

/**
 * Accept admin invitation request
 */
export interface AcceptAdminInvitationRequest {
  token: string
  name: string
  password: string
}

/**
 * Suspend admin request
 */
export interface SuspendAdminRequest {
  reason?: string
}

/**
 * Generic message response
 */
export interface AdminMessageResponse {
  message: string
}
