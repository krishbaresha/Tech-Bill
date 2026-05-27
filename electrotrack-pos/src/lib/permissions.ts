import { useAuthStore } from '../store/auth.store';
import type { Permission, Role } from '../types';

/**
 * Check if the current user has a specific permission.
 * Owners and platform_admins implicitly have all permissions.
 */
export function can(permission: Permission): boolean {
  const user = useAuthStore.getState().user;
  if (!user) return false;

  // Owner and platform_admin bypass granular checks
  if (user.role === 'owner' || user.role === 'platform_admin') return true;

  return user.permissions.includes(permission);
}

/**
 * Check if the current user has ANY of the listed permissions.
 */
export function canAny(...permissions: Permission[]): boolean {
  const user = useAuthStore.getState().user;
  if (!user) return false;

  if (user.role === 'owner' || user.role === 'platform_admin') return true;

  return permissions.some((p) => user.permissions.includes(p));
}

/**
 * Check if the current user has ALL of the listed permissions.
 */
export function canAll(...permissions: Permission[]): boolean {
  const user = useAuthStore.getState().user;
  if (!user) return false;

  if (user.role === 'owner' || user.role === 'platform_admin') return true;

  return permissions.every((p) => user.permissions.includes(p));
}

/**
 * Check if current user has a specific role.
 */
export function hasRole(...roles: Role[]): boolean {
  const user = useAuthStore.getState().user;
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * React hook version — use inside components to trigger re-renders on auth change.
 */
export function useCan(permission: Permission): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.role === 'owner' || user.role === 'platform_admin') return true;
  return user.permissions.includes(permission);
}

export function useCanAny(...permissions: Permission[]): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.role === 'owner' || user.role === 'platform_admin') return true;
  return permissions.some((p) => user.permissions.includes(p));
}

export function useHasRole(...roles: Role[]): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  return roles.includes(user.role);
}
