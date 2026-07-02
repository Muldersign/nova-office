import type { MembershipRecord, NovaDatabase, RoleName } from './schema.ts'

export type Permission = 'read' | 'create' | 'update' | 'delete' | 'manage_settings'

const rolePermissions: Record<RoleName, Permission[]> = {
  owner: ['read', 'create', 'update', 'delete', 'manage_settings'],
  admin: ['read', 'create', 'update', 'delete'],
  member: ['read', 'create', 'update'],
  viewer: ['read'],
}

export function findMembership(database: NovaDatabase, userId: string, companyId: string) {
  return database.memberships.find(
    (membership) =>
      membership.userId === userId &&
      membership.companyId === companyId &&
      membership.status === 'active',
  )
}

export function can(membership: MembershipRecord | undefined, permission: Permission) {
  if (!membership) {
    return false
  }

  return rolePermissions[membership.role].includes(permission)
}

export function assertCan(database: NovaDatabase, userId: string, companyId: string, permission: Permission) {
  const membership = findMembership(database, userId, companyId)
  if (!can(membership, permission)) {
    throw new Error('FORBIDDEN')
  }

  return membership
}
