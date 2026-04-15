import { ComponentType } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { canAccessRoute } from '@/lib/roleConfig';

/**
 * HOC to protect pages based on user roles defined in roleConfig
 * Usage: export default withRoleProtection(YourPage);
 * 
 * Route permissions are automatically read from ROLE_BASED_ROUTES in roleConfig.ts
 * If a route is not defined, all authenticated users are allowed.
 */
export function withRoleProtection<P extends object>(
  Component: ComponentType<P>
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter();
    const { role, loading } = useAuth();

    // Show loading state while auth is being checked
    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div>Loading...</div>
        </div>
      );
    }

    // Check if user has access to current route
    const hasAccess = canAccessRoute(role, router.pathname);

    if (!hasAccess) {
      // Redirect to dashboard if no permission
      router.replace('/dashboard');
      return (
        <div className="flex items-center justify-center h-screen">
          <div>Akses Ditolak / Access Denied</div>
        </div>
      );
    }

    // User has permission, render component
    return <Component {...props} />;
  };
}
