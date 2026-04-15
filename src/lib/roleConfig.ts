import { UserRole } from '@/types/system';

/**
 * Route configuration with role-based access
 */
export const ROLE_BASED_ROUTES: Record<string, UserRole[]> = {
  '/dashboard': ['admin', 'petugas', 'user'],
  '/auto-control': ['admin', 'petugas'],
  '/manual-control': ['admin', 'petugas'],
  '/diagnostic': ['admin', 'petugas'],
  '/parameters': ['admin', 'petugas'],
  '/log-read': ['admin', 'petugas', 'user'],
  '/notifications': ['admin', 'petugas', 'user'],
  '/admin/user-management': ['admin'],
};

/**
 * Check if user has access to a route
 */
export function canAccessRoute(userRole: UserRole | null, pathname: string): boolean {
  if (!userRole) return false;

  const allowedRoles = ROLE_BASED_ROUTES[pathname];
  if (!allowedRoles) {
    // If route not defined in ROLE_BASED_ROUTES, allow access to all authenticated users
    return true;
  }

  return allowedRoles.includes(userRole);
}

/**
 * Get role display name in Indonesian
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: 'Administrator',
    petugas: 'Petugas',
    user: 'Pengguna',
  };
  return roleNames[role];
}

/**
 * Get role description in Indonesian
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: 'Akses penuh ke semua fitur termasuk manajemen pengguna dan pengaturan sistem',
    petugas: 'Akses ke kontrol hidran, diagnostik, dan monitoring sistem',
    user: 'Akses terbatas untuk melihat status sistem dan log',
  };
  return descriptions[role];
}
